import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEY =
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const SYSTEM_EMAIL = "system@doovly.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getOrCreateSystemUser(): Promise<string> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", SYSTEM_EMAIL)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.id) return profile.id;

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email?.toLowerCase() === SYSTEM_EMAIL);
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

  const { error: upsertError } = await admin.from("profiles").upsert(
    { id: userId, full_name: "Doovly", email: SYSTEM_EMAIL, role: "user" },
    { onConflict: "id" },
  );
  if (upsertError) throw upsertError;
  return userId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return json({ error: "Server configuration is incomplete" }, 503);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Authentication required" }, 401);

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return json({ error: "Invalid session" }, 401);

    const payload = await req.json().catch(() => ({}));
    const productId = String(payload?.productId ?? "").trim();
    const purchaseDate = String(payload?.purchaseDate ?? "").trim();
    const expiresAt = String(payload?.expiresAt ?? "").trim();
    if (!productId) return json({ error: "Missing Pro product identifier" }, 400);

    // Stable across retries for the same entitlement purchase, but changes on renewal.
    const eventKey = [productId, purchaseDate || expiresAt || "active"].join(":");
    const expiryText = expiresAt
      ? new Date(expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
      : "until your subscription expires";
    const messageText = "Your Doovly Pro subscription is now active. Enjoy your Pro benefits. " +
      (expiresAt ? "Your current access runs until " + expiryText + "." : "");
    const title = "Doovly Pro is active";
    const body = "Your Doovly Pro subscription is active. " +
      (expiresAt ? "Your current access runs until " + expiryText + "." : "Enjoy your Pro benefits.");

    const { data: existingNotification, error: notificationLookupError } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", title)
      .contains("data", { event_key: eventKey })
      .limit(1)
      .maybeSingle();
    if (notificationLookupError) throw notificationLookupError;

    const systemUserId = await getOrCreateSystemUser();
    const pairFilter =
      "and(participant_a.eq." + user.id + ",participant_b.eq." + systemUserId + ")," +
      "and(participant_a.eq." + systemUserId + ",participant_b.eq." + user.id + ")";
    const { data: foundConversation, error: conversationLookupError } = await admin
      .from("conversations")
      .select("id")
      .or(pairFilter)
      .limit(1)
      .maybeSingle();
    if (conversationLookupError) throw conversationLookupError;

    let conversation = foundConversation;
    if (!conversation?.id) {
      const { data, error } = await admin
        .from("conversations")
        .insert({
          participant_a: user.id,
          participant_b: systemUserId,
          last_message: messageText,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      conversation = data;
    }

    // The message text is stable for a given purchase; avoid duplicate system messages on retries.
    const { data: existingMessage, error: messageLookupError } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation.id)
      .eq("sender_id", systemUserId)
      .eq("text", messageText)
      .limit(1)
      .maybeSingle();
    if (messageLookupError) throw messageLookupError;

    if (!existingMessage?.id) {
      const { error: messageError } = await admin.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: systemUserId,
        text: messageText,
        kind: "system",
      });
      if (messageError) throw messageError;

      const now = new Date().toISOString();
      const { error: conversationUpdateError } = await admin
        .from("conversations")
        .update({ last_message: messageText, last_message_at: now })
        .eq("id", conversation.id);
      if (conversationUpdateError) throw conversationUpdateError;

      const { data: read, error: readError } = await admin
        .from("conversation_reads")
        .select("unread_count,last_read_at")
        .eq("conversation_id", conversation.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (readError) throw readError;
      const { error: readUpsertError } = await admin.from("conversation_reads").upsert({
        conversation_id: conversation.id,
        user_id: user.id,
        unread_count: Number(read?.unread_count ?? 0) + 1,
        last_read_at: read?.last_read_at ?? null,
      }, { onConflict: "conversation_id,user_id" });
      if (readUpsertError) throw readUpsertError;
    }

    if (!existingNotification?.id) {
      const { error } = await admin.from("notifications").insert({
        user_id: user.id,
        type: "general",
        title,
        body,
        unread: true,
        data: { type: "pro_subscription_activated", screen: "chat", conversation_id: conversation.id, event_key: eventKey },
      });
      if (error) throw error;
    }

    return json({ ok: true, conversationId: conversation.id, duplicate: Boolean(existingNotification?.id && existingMessage?.id) });
  } catch (error) {
    console.error("[notify-pro-subscription]", error);
    return json({ error: error instanceof Error ? error.message : "Could not send subscription confirmation" }, 500);
  }
});
