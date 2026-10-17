import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEY =
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const WEBHOOK_AUTHORIZATION =
  Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION") ?? "";

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function eventDate(value: unknown): string | null {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString().slice(0, 10);
}


async function sendProNotification(userId: string, title: string, body: string, type: string, subscriptionId?: string) {
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type: "general",
    title,
    body,
    unread: true,
    data: { type, screen: "subscription", ...(subscriptionId ? { subscription_id: subscriptionId } : {}) },
  });
  if (error) throw error;
}

async function sendDoovlyMessage(userId: string, body: string) {
  const { data: system, error: systemError } = await admin.from("profiles")
    .select("id").eq("email", "system@doovly.app").maybeSingle();
  if (systemError) throw systemError;
  if (!system?.id) throw new Error("Doovly system profile is missing");

  const systemId = system.id as string;
  const pairFilter = "and(participant_a.eq." + userId + ",participant_b.eq." + systemId +
    "),and(participant_a.eq." + systemId + ",participant_b.eq." + userId + ")";
  let { data: conversation, error } = await admin.from("conversations")
    .select("id").or(pairFilter).limit(1).maybeSingle();
  if (error) throw error;

  if (!conversation?.id) {
    const result = await admin.from("conversations").insert({
      participant_a: userId, participant_b: systemId, last_message: body,
      last_message_at: new Date().toISOString(),
    }).select("id").single();
    if (result.error) throw result.error;
    conversation = result.data;
  }

  const inserted = await admin.from("messages").insert({
    conversation_id: conversation.id, sender_id: systemId, text: body, kind: "system",
  });
  if (inserted.error) throw inserted.error;

  const updated = await admin.from("conversations").update({
    last_message: body, last_message_at: new Date().toISOString(),
  }).eq("id", conversation.id);
  if (updated.error) throw updated.error;

  const read = await admin.from("conversation_reads").select("unread_count,last_read_at")
    .eq("conversation_id", conversation.id).eq("user_id", userId).maybeSingle();
  if (read.error) throw read.error;
  const unread = await admin.from("conversation_reads").upsert({
    conversation_id: conversation.id, user_id: userId,
    unread_count: Number(read.data?.unread_count ?? 0) + 1,
    last_read_at: read.data?.last_read_at ?? null,
  }, { onConflict: "conversation_id,user_id" });
  if (unread.error) throw unread.error;
}

async function receiptExists(eventId: string) {
  if (!eventId) return false;
  const { data, error } = await admin.from("revenuecat_pro_event_receipts")
    .select("event_id").eq("event_id", eventId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function saveReceipt(eventId: string, userId: string, eventType: string) {
  if (!eventId) return;
  const { error } = await admin.from("revenuecat_pro_event_receipts").insert({
    event_id: eventId, user_id: userId, event_type: eventType,
  });
  if (error && error.code !== "23505") throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!WEBHOOK_AUTHORIZATION) {
    return json({ error: "RevenueCat webhook authorization is not configured" }, 503);
  }
  if ((req.headers.get("Authorization") ?? "") !== WEBHOOK_AUTHORIZATION) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.event ?? {};
    const eventType = String(event.type ?? "");
    const userId = String(event.app_user_id ?? "");
    const productId = String(event.product_id ?? "");
    const eventAt = Number(event.event_timestamp_ms ?? 0);
    const eventId = String(event.id ?? "");

    if (!userId || !eventType) {
      return json({ error: "Incomplete RevenueCat event" }, 400);
    }

    const activeEvents = new Set([
      "INITIAL_PURCHASE",
      "TRIAL_STARTED",
      "RENEWAL",
      "UNCANCELLATION",
      "PRODUCT_CHANGE",
      "SUBSCRIPTION_EXTENDED",
    ]);
    const expiredEvents = new Set(["EXPIRATION"]);

    if (!activeEvents.has(eventType) && !expiredEvents.has(eventType)) {
      return json({ ok: true, ignored: eventType });
    }
    if (await receiptExists(eventId)) return json({ ok: true, duplicate: true, event: eventType });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("pro_access_override,pro_access_override_updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;

    const hasProfileOverride =
      profile?.pro_access_override !== null &&
      profile?.pro_access_override !== undefined;
    if (hasProfileOverride) {
      const overrideAt = new Date(profile.pro_access_override_updated_at ?? 0).getTime();
      const newPurchaseAfterOverride =
        eventType === "INITIAL_PURCHASE" &&
        Number.isFinite(eventAt) &&
        eventAt > overrideAt;
      if (!newPurchaseAfterOverride) {
        return json({ ok: true, ignored: "admin profile override takes precedence" });
      }

      const { error: clearOverrideError } = await admin
        .from("profiles")
        .update({
          pro_access_override: null,
          pro_access_override_updated_at: null,
        })
        .eq("id", userId);
      if (clearOverrideError) throw clearOverrideError;
    }

    const { data: professional, error: professionalError } = await admin
      .from("professionals")
      .select("id,user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (professionalError) throw professionalError;
    if (!professional) {
      // The profile-level override is sufficient for non-professional accounts.
      return json({ ok: true, ignored: "no professional profile; profile access synced" });
    }

    const { data: current, error: currentError } = await admin
      .from("professional_subscriptions")
      .select("id,plan_code,status,admin_override,updated_at,end_date,expiry_reminder_sent_at,expiry_notified_at")
      .eq("professional_id", professional.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentError) throw currentError;

    // An explicit admin decision wins over routine renewals and expirations.
    // A genuinely new purchase made after the override can restore store access.
    if (current?.admin_override) {
      const overrideUpdatedAt = new Date(current.updated_at ?? 0).getTime();
      const isNewPurchaseAfterOverride =
        eventType === "INITIAL_PURCHASE" &&
        Number.isFinite(eventAt) &&
        eventAt > overrideUpdatedAt;

      if (!isNewPurchaseAfterOverride) {
        return json({ ok: true, ignored: "admin access override takes precedence" });
      }
    }

    if (activeEvents.has(eventType)) {
      const { data: plan, error: planError } = await admin
        .from("subscription_plans")
        .select("id")
        .eq("code", "pro")
        .maybeSingle();
      if (planError) throw planError;

      const values: Record<string, unknown> = {
        user_id: userId,
        professional_id: professional.id,
        plan_id: plan?.id ?? null,
        plan_code: "pro",
        status: "active",
        status_label: "Active",
        start_date: eventDate(event.purchased_at_ms) ?? new Date().toISOString().slice(0, 10),
        end_date: eventDate(event.expiration_at_ms),
        revenuecat_app_user_id: userId,
        store_product_id: productId || null,
        admin_override: false,
      };
      // Reset expiry tracking whenever RevenueCat starts a new period or changes its end date.
      // This lets renewals receive their own 3-day reminder and eventual expiry notice.
      const startsNewPeriod =
        eventType === "INITIAL_PURCHASE" ||
        eventType === "TRIAL_STARTED" ||
        (values.end_date != null && values.end_date !== current?.end_date);
      if (startsNewPeriod) {
        values.expiry_reminder_sent_at = null;
        values.expiry_notified_at = null;
      }

      if (current?.id) {
        const { error } = await admin
          .from("professional_subscriptions")
          .update(values)
          .eq("id", current.id);
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("professional_subscriptions")
          .insert(values);
        if (error) throw error;
      }

      const { error: proError } = await admin
        .from("professionals")
        .update({ subscribed: true })
        .eq("id", professional.id);
      if (proError) throw proError;

      if (eventType === "INITIAL_PURCHASE" || eventType === "TRIAL_STARTED") {
        const endDate = eventDate(event.expiration_at_ms);
        const expiry = endDate
          ? new Date(endDate + "T00:00:00Z").toLocaleDateString("en-NG", {
              day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
            })
          : "the end of your current billing period";
        const body = "Your Doovly Pro access is active, including unlimited chat coins. Your current period ends " + expiry + ".";
        // Do not acknowledge this RevenueCat event if either delivery fails. RevenueCat can retry.
        // Each individual delivery should be idempotent in a future outbox-based enhancement.
        await sendProNotification(userId, "Doovly Pro activated", body, "pro_activated", current?.id);
        await sendDoovlyMessage(userId, body);
      }
      await saveReceipt(eventId, userId, eventType);
      return json({ ok: true, status: "active", event: eventType });
    }

    if (current?.id && !current.expiry_notified_at) {
      const { error } = await admin
        .from("professional_subscriptions")
        .update({
          status: "expired",
          status_label: "Expired",
          admin_override: false,
        })
        .eq("id", current.id);
      if (error) throw error;

      const { error: proError } = await admin
        .from("professionals")
        .update({ subscribed: false })
        .eq("id", professional.id);
      if (proError) throw proError;

      const body = "Your Doovly Pro subscription has expired. Your account has returned to the Free plan. You can subscribe again at any time to restore Pro benefits.";
      // Leave expiry_notified_at unset until both deliveries succeed so a webhook retry can recover.
      await sendProNotification(userId, "Doovly Pro expired", body, "pro_expired", current.id);
      await sendDoovlyMessage(userId, body);
      const { error: expiryStampError } = await admin
        .from("professional_subscriptions")
        .update({ expiry_notified_at: new Date().toISOString() })
        .eq("id", current.id);
      if (expiryStampError) throw expiryStampError;
    }
    await saveReceipt(eventId, userId, eventType);
    return json({ ok: true, status: "expired", event: eventType });
  } catch (error) {
    console.error("[revenuecat-pro-webhook]", error);
    return json({
      error: error instanceof Error ? error.message : "Webhook processing failed",
    }, 500);
  }
});
