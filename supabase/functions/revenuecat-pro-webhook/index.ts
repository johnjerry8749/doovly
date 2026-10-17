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

    if (!userId || !eventType) {
      return json({ error: "Incomplete RevenueCat event" }, 400);
    }

    const activeEvents = new Set([
      "INITIAL_PURCHASE",
      "RENEWAL",
      "UNCANCELLATION",
      "PRODUCT_CHANGE",
      "SUBSCRIPTION_EXTENDED",
    ]);
    const expiredEvents = new Set(["EXPIRATION"]);

    if (!activeEvents.has(eventType) && !expiredEvents.has(eventType)) {
      return json({ ok: true, ignored: eventType });
    }

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
      .select("id,plan_code,status,admin_override,updated_at")
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

      const values = {
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

      return json({ ok: true, status: "active", event: eventType });
    }

    if (current?.id) {
      const { error } = await admin
        .from("professional_subscriptions")
        .update({
          status: "expired",
          status_label: "Expired",
          admin_override: false,
        })
        .eq("id", current.id);
      if (error) throw error;
    }

    const { error: proError } = await admin
      .from("professionals")
      .update({ subscribed: false })
      .eq("id", professional.id);
    if (proError) throw proError;

    return json({ ok: true, status: "expired", event: eventType });
  } catch (error) {
    console.error("[revenuecat-pro-webhook]", error);
    return json({
      error: error instanceof Error ? error.message : "Webhook processing failed",
    }, 500);
  }
});
