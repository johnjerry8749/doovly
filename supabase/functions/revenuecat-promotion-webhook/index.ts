import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEY =
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const WEBHOOK_AUTHORIZATION =
  Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION") ?? "";
const SYSTEM_EMAIL = "system@doovly.app";

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

async function getOrCreateSystemUser(): Promise<string> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", SYSTEM_EMAIL)
    .maybeSingle();

  if (profile?.id) return profile.id;

  const { data: listed } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const existing = listed?.users?.find(
    (user) => user.email?.toLowerCase() === SYSTEM_EMAIL,
  );

  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SYSTEM_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "Doovly", role: "user" },
    });

    if (error || !data.user) {
      throw error ?? new Error("Could not create Doovly system user");
    }

    userId = data.user.id;

    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
  }

  await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: "Doovly",
        email: SYSTEM_EMAIL,
        role: "user",
      },
      { onConflict: "id" },
    );

  return userId;
}

async function sendPromotionChat(
  userId: string,
  serviceName: string,
  packageName: string,
  endsAt: string,
) {
  const systemUserId = await getOrCreateSystemUser();

  const pairFilter =
    "and(participant_a.eq." +
    userId +
    ",participant_b.eq." +
    systemUserId +
    "),and(participant_a.eq." +
    systemUserId +
    ",participant_b.eq." +
    userId +
    ")";

  let { data: conversation } = await admin
    .from("conversations")
    .select("id")
    .or(pairFilter)
    .limit(1)
    .maybeSingle();

  if (!conversation?.id) {
    const { data, error } = await admin
      .from("conversations")
      .insert({
        participant_a: userId,
        participant_b: systemUserId,
        last_message: "Promotion successful",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    conversation = data;
  }

  const formattedEnd = new Date(endsAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const successText =
    'Promotion successful — "' +
    serviceName +
    '" is now promoted with the ' +
    packageName +
    " package. Your promotion is active until " +
    formattedEnd +
    ".";

  const analysisText =
    "Promotion analysis tracking has started. Doovly will use impressions, service views, booking requests, and bookings to measure how the promotion performs.";

  const { error: messageError } = await admin.from("messages").insert([
    {
      conversation_id: conversation.id,
      sender_id: systemUserId,
      text: successText,
      kind: "system",
    },
    {
      conversation_id: conversation.id,
      sender_id: systemUserId,
      text: analysisText,
      kind: "system",
    },
  ]);

  if (messageError) throw messageError;

  const now = new Date().toISOString();

  await admin
    .from("conversations")
    .update({
      last_message: analysisText,
      last_message_at: now,
    })
    .eq("id", conversation.id);

  const { data: read } = await admin
    .from("conversation_reads")
    .select("unread_count,last_read_at")
    .eq("conversation_id", conversation.id)
    .eq("user_id", userId)
    .maybeSingle();

  await admin.from("conversation_reads").upsert(
    {
      conversation_id: conversation.id,
      user_id: userId,
      unread_count: Number(read?.unread_count ?? 0) + 2,
      last_read_at: read?.last_read_at ?? null,
    },
    { onConflict: "conversation_id,user_id" },
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!WEBHOOK_AUTHORIZATION) {
    return json(
      { error: "RevenueCat webhook authorization is not configured" },
      503,
    );
  }

  if (
    (req.headers.get("Authorization") ?? "") !== WEBHOOK_AUTHORIZATION
  ) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.event ?? {};
    const eventType = String(event.type ?? "");

    // Promotion boosts are fulfilled only from RevenueCat's
    // NON_RENEWING_PURCHASE webhook. The client never grants access.
    if (eventType !== "NON_RENEWING_PURCHASE") {
      return json({ ok: true, ignored: eventType });
    }

    const transactionId = String(event.transaction_id ?? "");
    const appUserId = String(event.app_user_id ?? "");
    const productId = String(event.product_id ?? "");

    if (!transactionId || !appUserId || !productId) {
      return json({ error: "Incomplete RevenueCat purchase event" }, 400);
    }

    // Transaction ID is the idempotency key for one-time purchases.
    const { data: duplicate } = await admin
      .from("service_promotions")
      .select("id,status")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (duplicate?.id) {
      return json({ ok: true, duplicate: true });
    }

    // RevenueCat can represent subscriber attributes differently between
    // SDK/web-billing event payloads. Prefer the explicit promotion id, but
    // safely fall back to the newest pending promotion owned by this user
    // for the purchased boost product.
    const promotionAttribute =
      event?.subscriber_attributes?.doovly_promotion_id ??
      event?.subscriber_attributes?.["doovly_promotion_id"] ??
      payload?.subscriber_attributes?.doovly_promotion_id ??
      payload?.subscriber_attributes?.["doovly_promotion_id"];

    const promotionId =
      promotionAttribute?.value ??
      promotionAttribute ??
      null;

    let promotionQuery = admin
      .from("service_promotions")
      .select(
        "id,service_id,user_id,package_id,product_id,status,professional_id",
      )
      .eq("user_id", appUserId)
      .eq("product_id", productId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promotionId) {
      promotionQuery = admin
        .from("service_promotions")
        .select(
          "id,service_id,user_id,package_id,product_id,status,professional_id",
        )
        .eq("id", String(promotionId))
        .maybeSingle();
    }

    const { data: promotion, error: promotionError } = await promotionQuery;

    if (promotionError) throw promotionError;

    if (!promotion) {
      return json({ ok: true, ignored: "promotion not found" });
    }

    if (promotion.user_id !== appUserId) {
      return json({ error: "Promotion owner mismatch" }, 403);
    }

    if (promotion.product_id !== productId) {
      return json({ error: "Promotion product mismatch" }, 400);
    }

    if (promotion.status !== "pending") {
      return json({
        ok: true,
        ignored: "promotion is no longer pending",
      });
    }

    const { data: pkg, error: packageError } = await admin
      .from("promotion_packages")
      .select("name,duration_days,product_id")
      .eq("id", promotion.package_id)
      .maybeSingle();

    if (packageError) throw packageError;

    if (!pkg || pkg.product_id !== productId) {
      return json({ error: "Promotion package mismatch" }, 400);
    }

    // If another boost for this service is active, extend from its current
    // expiry. Otherwise start immediately.
    const now = new Date();
    const { data: current } = await admin
      .from("service_promotions")
      .select("ends_at")
      .eq("service_id", promotion.service_id)
      .eq("status", "active")
      .gt("ends_at", now.toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentExpiry = current?.ends_at
      ? new Date(current.ends_at)
      : now;

    const startsAt =
      currentExpiry.getTime() > now.getTime() ? currentExpiry : now;

    const endsAt = new Date(
      startsAt.getTime() +
        Number(pkg.duration_days) * 24 * 60 * 60 * 1000,
    );

    const { error: updateError } = await admin
      .from("service_promotions")
      .update({
        status: "active",
        amount:
          event.price_in_purchased_currency == null
            ? null
            : Number(event.price_in_purchased_currency),
        currency: event.currency ?? null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        revenuecat_app_user_id: appUserId,
        transaction_id: transactionId,
        revenuecat_event_id: String(event.id ?? "") || null,
      })
      .eq("id", promotion.id)
      .eq("status", "pending");

    if (updateError) throw updateError;

    await admin.from("service_promotion_analytics").upsert(
      {
        promotion_id: promotion.id,
        metric_date: now.toISOString().slice(0, 10),
      },
      { onConflict: "promotion_id,metric_date" },
    );

    const { data: service } = await admin
      .from("services")
      .select("name")
      .eq("id", promotion.service_id)
      .maybeSingle();

    // Promotion access is already activated above. Chat/notification are
    // secondary side effects and must never turn a successful purchase into
    // a failed webhook response.
    try {
      await sendPromotionChat(
        promotion.user_id,
        service?.name ?? "Your service",
        pkg.name,
        endsAt.toISOString(),
      );
    } catch (error) {
      console.error("[revenuecat-promotion-webhook] chat delivery failed", error);
    }

    try {
      await sendPromotionNotification(
        promotion.user_id,
        service?.name ?? "Your service",
        pkg.name,
        endsAt.toISOString(),
      );
    } catch (error) {
      console.error("[revenuecat-promotion-webhook] notification delivery failed", error);
    }

    console.log(
      JSON.stringify({
        event: eventType,
        promotionId: promotion.id,
        transactionId,
        productId,
        appUserId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      }),
    );

    return json({
      ok: true,
      promotionId: promotion.id,
      transactionId,
    });
  } catch (error) {
    console.error("[revenuecat-promotion-webhook]", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed",
      },
      500,
    );
  }
});

async function sendPromotionNotification(
  userId: string,
  serviceName: string,
  packageName: string,
  endsAt: string,
) {
  const formattedEnd = new Date(endsAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const title = "Promotion successful";
  const body =
    '"' +
    serviceName +
    '" is now promoted with the ' +
    packageName +
    " package until " +
    formattedEnd +
    ".";

  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    type: "general",
    title,
    body,
    unread: true,
    data: {
      type: "promotion_success",
      screen: "chat",
    },
  });

  if (error) throw error;

  const { data: profile } = await admin
    .from("profiles")
    .select("expo_push_token")
    .eq("id", userId)
    .maybeSingle();

  const token = String(profile?.expo_push_token ?? "").trim();
  if (!token) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: token,
      sound: "default",
      title,
      body,
      data: {
        type: "promotion_success",
        screen: "chat",
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Expo push notification failed: " + await response.text());
  }
}

