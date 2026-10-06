import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase function secrets are not configured." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const kind = String(body.kind ?? "");
    const bookingId = String(body.bookingId ?? "").trim();
    const offerId = String(body.offerId ?? "").trim();
    const commentId = String(body.commentId ?? "").trim();
    const requestId = String(body.requestId ?? "").trim();

    const admin = createClient(supabaseUrl, serviceRoleKey);

    let recipientUserId: string | null = null;

    if (kind === "booking" && bookingId) {
      const { data: booking, error } = await admin
        .from("bookings")
        .select("id,customer_id,professional_id,status")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      if (!booking) return json({ error: "Booking not found." }, 404);

      if (String(booking.customer_id) === user.id) {
        const { data: professional } = await admin
          .from("professionals")
          .select("user_id")
          .eq("id", booking.professional_id)
          .maybeSingle();
        recipientUserId = professional?.user_id ? String(professional.user_id) : null;
      } else if (String(booking.professional_id) === user.id) {
        recipientUserId = String(booking.customer_id);
      } else {
        return json({ error: "You are not a participant in this booking." }, 403);
      }
    } else if (kind === "comment" && commentId) {
      const { data: comment, error } = await admin.from("service_request_comments").select("id,user_id,request_id").eq("id", commentId).maybeSingle();
      if (error) throw error;
      if (!comment) return json({ error: "Comment not found." }, 404);
      if (String(comment.user_id) !== user.id) return json({ error: "You are not the comment author." }, 403);
      const { data: request, error: requestError } = await admin.from("service_requests").select("created_by").eq("id", comment.request_id).maybeSingle();
      if (requestError) throw requestError;
      recipientUserId = request?.created_by ? String(request.created_by) : null;
    } else if (kind === "like" && requestId) {
      const { data: request, error: requestError } = await admin.from("service_requests").select("created_by").eq("id", requestId).maybeSingle();
      if (requestError) throw requestError;
      if (!request) return json({ error: "Request not found." }, 404);
      const { data: like } = await admin.from("service_request_likes").select("request_id").eq("request_id", requestId).eq("user_id", user.id).maybeSingle();
      if (!like) return json({ error: "Like not found for this user." }, 403);
      recipientUserId = request.created_by ? String(request.created_by) : null;
    } else if (kind === "offer" && offerId) {
      const { data: offer, error } = await admin
        .from("service_request_offers")
        .select("id,user_id,request_id")
        .eq("id", offerId)
        .maybeSingle();
      if (error) throw error;
      if (!offer) return json({ error: "Offer not found." }, 404);

      if (String(offer.user_id) !== user.id) {
        return json({ error: "You are not the owner of this offer." }, 403);
      }

      const { data: request, error: requestError } = await admin
        .from("service_requests")
        .select("created_by")
        .eq("id", offer.request_id)
        .maybeSingle();
      if (requestError) throw requestError;
      recipientUserId = request?.created_by ? String(request.created_by) : null;
    } else {
      return json({ error: "A valid bookingId or offerId is required." }, 400);
    }

    if (!recipientUserId || recipientUserId === user.id) {
      return json({ error: "Notification recipient could not be resolved." }, 400);
    }

    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const data = body.data && typeof body.data === "object" ? body.data : {};

    if (!title || !message) return json({ error: "Title and message are required." }, 400);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("expo_push_token")
      .eq("id", recipientUserId)
      .maybeSingle();
    if (profileError) throw profileError;

    const token = String(profile?.expo_push_token ?? "").trim();

    // Persist the in-app notification first. Push delivery is best-effort and
    // must never prevent the in-app notification from being created.
    const { error: notificationError } = await admin.from("notifications").insert({
      user_id: recipientUserId,
      type: "booking",
      title,
      body: message,
      unread: true,
      data,
    });
    if (notificationError) throw notificationError;

    if (!token) return json({ ok: true, sent: false, recipientUserId, inApp: true, reason: "recipient_has_no_push_token" });

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        sound: "default",
        title,
        body: message,
        data,
      }),
    });

    const expoBody = await expoResponse.text();
    if (!expoResponse.ok) {
      return json({ ok: false, sent: false, error: expoBody }, 502);
    }

    return json({ ok: true, sent: true, recipientUserId, expo: expoBody });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
