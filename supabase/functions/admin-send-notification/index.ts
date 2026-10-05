import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Channel = "in-app" | "email" | "sms";
type Audience = "all" | "verified" | "subscribed" | "free";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id,role,is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profile?.role !== "admin" || profile.is_suspended) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const audience = String(body.sentTo ?? "all") as Audience;
    const channels = Array.isArray(body.channels) ? body.channels as Channel[] : [];
    const link = String(body.link ?? "").trim() || null;

    if (!title || !message) {
      return json({ error: "Notification title and message are required." }, 400);
    }
    if (!channels.length) {
      return json({ error: "Select at least one delivery channel." }, 400);
    }

    const [profilesRes, professionalsRes, subscriptionsRes] = await Promise.all([
      adminClient.from("profiles").select("id,email,phone,is_suspended"),
      adminClient.from("professionals").select("user_id,is_verified"),
      adminClient.from("professional_subscriptions").select("user_id,status").eq("status", "active"),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (professionalsRes.error) throw professionalsRes.error;
    if (subscriptionsRes.error) throw subscriptionsRes.error;

    const verified = new Set(
      (professionalsRes.data ?? [])
        .filter((x) => x.is_verified && x.user_id)
        .map((x) => String(x.user_id)),
    );
    const subscribed = new Set(
      (subscriptionsRes.data ?? [])
        .filter((x) => x.user_id)
        .map((x) => String(x.user_id)),
    );

    const recipients = (profilesRes.data ?? []).filter((p) => {
      if (p.is_suspended) return false;
      const id = String(p.id);
      if (audience === "verified") return verified.has(id);
      if (audience === "subscribed") return subscribed.has(id);
      if (audience === "free") return !subscribed.has(id);
      return true;
    });

    const errors: string[] = [];
    let inAppRecipientCount = 0;
    let emailRecipientCount = 0;
    let smsRecipientCount = 0;

    if (channels.includes("in-app") && recipients.length) {
      const rows = recipients.map((p) => ({
        user_id: p.id,
        type: "general",
        title,
        body: message,
        unread: true,
        data: link ? { link } : null,
      }));
      const { error } = await adminClient.from("notifications").insert(rows);
      if (error) errors.push(`In-app: ${error.message}`);
      else inAppRecipientCount = recipients.length;
    }

    if (channels.includes("email")) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const from = Deno.env.get("RESEND_FROM_EMAIL");

      if (!resendKey || !from) {
        errors.push("Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Supabase Edge Function secrets.");
      } else {
        const emailRecipients = recipients.filter((p) => p.email);

        for (const p of emailRecipients) {
          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from,
                to: [p.email],
                subject: title,
                text: message + (link ? `\n\n${link}` : ""),
              }),
            });

            if (response.ok) {
              emailRecipientCount++;
            } else {
              const detail = await response.text();
              errors.push(`Email to ${p.email}: ${detail}`);
            }
          } catch (error) {
            errors.push(
              `Email to ${p.email}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    }

    if (channels.includes("sms")) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_FROM_NUMBER");

      if (!sid || !token || !from) {
        errors.push("SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER in Supabase Edge Function secrets.");
      } else {
        const smsRecipients = recipients.filter((p) => p.phone);

        for (const p of smsRecipients) {
          const form = new URLSearchParams({
            To: p.phone,
            From: from,
            Body: link ? `${message}\n${link}` : message,
          });

          try {
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: "Basic " + btoa(`${sid}:${token}`),
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: form.toString(),
              },
            );

            if (response.ok) {
              smsRecipientCount++;
            } else {
              const detail = await response.text();
              errors.push(`SMS to ${p.phone}: ${detail}`);
            }
          } catch (error) {
            errors.push(
              `SMS to ${p.phone}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    }

    // admin_notifications uses lowercase database status values.
    const status = errors.length ? "failed" : "sent";

    const { data: notification, error: insertError } = await adminClient
      .from("admin_notifications")
      .insert({
        title,
        message,
        channels,
        sent_to: audience,
        sent_to_label:
          ({
            all: "All Users",
            verified: "Verified Users",
            subscribed: "Subscribed Users",
            free: "Free Users",
          } as Record<string, string>)[audience] ?? "All Users",
        status,
        link,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select("id,title,message,channels,sent_to,sent_to_label,status,link,sent_at,created_at")
      .single();

    if (insertError) throw insertError;

    return json(
      {
        notification,
        inAppRecipientCount,
        emailRecipientCount,
        smsRecipientCount,
        errors,
        ok: errors.length === 0,
      },
      errors.length ? 207 : 200,
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
