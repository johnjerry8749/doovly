import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_AUTHORIZATION = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION") ?? "";
const SYSTEM_EMAIL = "system@doovly.app";

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function getOrCreateSystemUser(): Promise<string> {
  const { data: profile } = await admin.from("profiles").select("id").eq("email", SYSTEM_EMAIL).maybeSingle();
  if (profile?.id) return profile.id;

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = listed?.users?.find((user) => user.email?.toLowerCase() === SYSTEM_EMAIL);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SYSTEM_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "Doovly", role: "user" },
    });
    if (error || !data.user) throw error ?? new Error("Could not create Doovly system user");
    userId = data.user.id;
    await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  }

  await admin.from("profiles").upsert({ id: userId, full_name: "Doovly", email: SYSTEM_EMAIL, role: "user" }, { onConflict: "id" });
  return userId;
}

async function sendPromotionChat(userId: string, serviceName: string, packageName: string, endsAt: string) {
  const systemUserId = await getOrCreateSystemUser();
  const pairFilter = "and(participant_a.eq." + userId + ",participant_b.eq." + systemUserId + "),and(participant_a.eq." + systemUserId + ",participant_b.eq." + userId + ")";
  let { data: conversation } = await admin.from("conversations").select("id").or(pairFilter).limit(1).maybeSingle();

  if (!conversation?.id) {
    const { data, error } = await admin.from("conversations").insert({
      participant_a: userId, participant_b: systemUserId, last_message: "Promotion successful", last_message_at: new Date().toISOString(),
    }).select("id").single();
    if (error) throw error;
    conversation = data;
  }

  const formattedEnd = new Date(endsAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  const text = "Promotion successful — \"" + serviceName + "\" is now promoted with the " + packageName + " package. Your promotion is active until " + formattedEnd + ".";
  const now = new Date().toISOString();

  const analysisText =
    "Promotion analysis tracking has started. Doovly will use impressions, service views, booking requests, and bookings to measure how the promotion performs.";

  const { error: messageError } = await admin.from("messages").insert([
    { conversation_id: conversation.id, sender_id: systemUserId, text, kind: "system" },
    { conversation_id: conversation.id, sender_id: systemUserId, text: analysisText, kind: "system" },
  ]);
  if (messageError) throw messageError;
  await admin.from("conversations").update({ last_message: analysisText, last_message_at: now }).eq("id", conversation.id);
  const { data: read } = await admin.from("conversation_reads").select("unread_count,last_read_at").eq("conversation_id", conversation.id).eq("user_id", userId).maybeSingle();
  await admin.from("conversation_reads").upsert({
    conversation_id: conversation.id, user_id: userId, unread_count: Number(read?.unread_count ?? 0) + 2, last_read_at: read?.last_read_at ?? null,
  }, { onConflict: "conversation_id,user_id" });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!WEBHOOK_AUTHORIZATION) return json({ error: "RevenueCat webhook authorization is not configured" }, 503);
  if ((req.headers.get("Authorization") ?? "") !== WEBHOOK_AUTHORIZATION) return json({ error: "Unauthorized" }, 401);

  try {
    const payload = await req.json();
    const event = payload?.event ?? {};
    const eventType = String(event.type ?? "");
    if (!["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE"].includes(eventType)) return json({ ok: true, ignored: eventType });

    const attrs = event?.subscriber_attributes?.doovly_promotion_id;
    const promotionId = attrs?.value ?? attrs ?? null;
    if (!promotionId) return json({ ok: true, ignored: "missing promotion id" });

    const { data: promotion, error: promotionError } = await admin.from("service_promotions")
      .select("id,service_id,user_id,package_id,product_id,status,professional_id")
      .eq("id", promotionId).maybeSingle();
    if (promotionError) throw promotionError;
    if (!promotion) return json({ ok: true, ignored: "promotion not found" });
    if (promotion.status === "active") return json({ ok: true, alreadyActive: true });
    if (promotion.user_id !== event.app_user_id) return json({ error: "Promotion owner mismatch" }, 403);
    if (promotion.product_id !== event.product_id) return json({ error: "Promotion product mismatch" }, 400);

    const eventId = String(event.id ?? "");
    if (eventId) {
      const { data: duplicate } = await admin.from("service_promotions").select("id").eq("revenuecat_event_id", eventId).maybeSingle();
      if (duplicate?.id) return json({ ok: true, duplicate: true });
    }

    const { data: pkg, error: packageError } = await admin.from("promotion_packages")
      .select("name,duration_days,product_id").eq("id", promotion.package_id).maybeSingle();
    if (packageError) throw packageError;
    if (!pkg || pkg.product_id !== event.product_id) return json({ error: "Promotion package mismatch" }, 400);

    const purchasedAt = event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)).toISOString() : new Date().toISOString();
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + Number(pkg.duration_days) * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await admin.from("service_promotions").update({
      status: "active", amount: event.price_in_purchased_currency == null ? null : Number(event.price_in_purchased_currency),
      currency: event.currency ?? null, starts_at: startsAt, ends_at: endsAt, revenuecat_app_user_id: event.app_user_id ?? null,
      transaction_id: event.transaction_id ?? null, revenuecat_event_id: eventId || null,
    }).eq("id", promotion.id).eq("status", "pending");
    if (updateError) throw updateError;

    await admin.from("service_promotion_analytics").upsert({ promotion_id: promotion.id, metric_date: new Date().toISOString().slice(0, 10) }, { onConflict: "promotion_id,metric_date" });
    const { data: service } = await admin.from("services").select("name").eq("id", promotion.service_id).maybeSingle();
    await sendPromotionChat(promotion.user_id, service?.name ?? "Your service", pkg.name, endsAt);

    console.log(JSON.stringify({ event: eventType, promotionId, purchasedAt, transactionId: event.transaction_id ?? null }));
    return json({ ok: true, promotionId: promotion.id });
  } catch (error) {
    console.error("[revenuecat-promotion-webhook]", error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, 500);
  }
});