import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addCloudinaryId(value: unknown, ids: Set<string>) {
  if (typeof value !== "string" || !value.trim()) return;
  const input = value.trim();

  if (input.startsWith("doovly/")) {
    ids.add(input.replace(/\.[a-z0-9]+$/i, ""));
    return;
  }

  if (!input.includes("res.cloudinary.com/") || !input.includes("/image/upload/")) return;
  const afterUpload = input.split("/image/upload/")[1]?.split(/[?#]/)[0];
  if (!afterUpload) return;

  const parts = afterUpload.split("/");
  const folderIndex = parts.findIndex((part) => part === "doovly");
  if (folderIndex < 0) return;

  const publicId = parts.slice(folderIndex).join("/").replace(/\.[a-z0-9]+$/i, "");
  if (publicId.startsWith("doovly/")) ids.add(publicId);
}

function addStorageKey(value: unknown, keys: Set<string>) {
  if (typeof value !== "string" || !value.trim()) return;
  const key = value.trim();
  if (!key.startsWith("doovly/") && !key.startsWith("avatars/") && !key.startsWith("portfolio/")) {
    keys.add(key);
  }
}

async function cloudinarySignature(publicId: string, timestamp: number, apiSecret: string) {
  const value = \`public_id=\${publicId}&timestamp=\${timestamp}\${apiSecret}\`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deleteCloudinaryAsset(
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  publicId: string,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await cloudinarySignature(publicId, timestamp, apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    api_key: apiKey,
    timestamp: String(timestamp),
    signature,
    invalidate: "true",
  });

  const response = await fetch(
    \`https://api.cloudinary.com/v1_1/\${encodeURIComponent(cloudName)}/image/destroy\`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || (result.result !== "ok" && result.result !== "not found")) {
    throw new Error(\`Cloudinary could not remove an account image (\${response.status}).\`);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return jsonResponse({ error: "Please sign in again and retry." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Delete-account function is missing Supabase environment variables.");
    return jsonResponse({ error: "Account deletion is temporarily unavailable. Please try again later." }, 500);
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Your session has expired. Please sign in again." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cloudinaryIds = new Set<string>();
    const storageKeys = new Set<string>();

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    addCloudinaryId(profile?.avatar_url, cloudinaryIds);

    const { data: professionals, error: professionalError } = await admin
      .from("professionals").select("id,avatar_url,avatar_key").eq("user_id", user.id);
    if (professionalError) throw professionalError;
    const professionalIds = (professionals ?? []).map((row) => row.id);

    for (const professional of professionals ?? []) {
      addCloudinaryId(professional.avatar_url, cloudinaryIds);
      addCloudinaryId(professional.avatar_key, cloudinaryIds);
      addStorageKey(professional.avatar_key, storageKeys);
    }

    if (professionalIds.length) {
      const { data: portfolio, error } = await admin
        .from("portfolio_items").select("image_key,image_url")
        .in("professional_id", professionalIds);
      if (error) throw error;
      for (const item of portfolio ?? []) {
        addCloudinaryId(item.image_key, cloudinaryIds);
        addCloudinaryId(item.image_url, cloudinaryIds);
        addStorageKey(item.image_key, storageKeys);
      }
    }

    const { data: requests, error: requestsError } = await admin
      .from("service_requests").select("images,image_keys").eq("created_by", user.id);
    if (requestsError) throw requestsError;
    for (const requestRow of requests ?? []) {
      for (const value of requestRow.images ?? []) addCloudinaryId(value, cloudinaryIds);
      for (const value of requestRow.image_keys ?? []) addCloudinaryId(value, cloudinaryIds);
    }

    const { data: applications, error: applicationsError } = await admin
      .from("verification_applications").select("id").eq("user_id", user.id);
    if (applicationsError) throw applicationsError;
    const applicationIds = (applications ?? []).map((row) => row.id);
    if (applicationIds.length) {
      const { data: documents, error } = await admin
        .from("verification_documents").select("preview_key,file_url")
        .in("application_id", applicationIds);
      if (error) throw error;
      for (const document of documents ?? []) {
        addCloudinaryId(document.preview_key, cloudinaryIds);
        addCloudinaryId(document.file_url, cloudinaryIds);
      }
    }

    const { data: messages, error: messagesError } = await admin
      .from("messages").select("text,kind").eq("sender_id", user.id).eq("kind", "image");
    if (messagesError) throw messagesError;
    for (const message of messages ?? []) addCloudinaryId(message.text, cloudinaryIds);

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const cloudApiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const cloudApiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (cloudinaryIds.size && (!cloudName || !cloudApiKey || !cloudApiSecret)) {
      return jsonResponse({
        error: "Your account has uploaded images. Doovly must finish configuring secure image deletion before your account can be permanently deleted. Please try again later.",
      }, 503);
    }

    // Remove any legacy Supabase Storage profile-image objects first.
    if (storageKeys.size) {
      const keys = Array.from(storageKeys);
      for (let index = 0; index < keys.length; index += 100) {
        const { error } = await admin.storage.from("profile-images").remove(keys.slice(index, index + 100));
        if (error) throw new Error("Could not remove all of your stored profile images.");
      }
    }

    // Remove only Cloudinary public IDs linked to this user's own records.
    if (cloudName && cloudApiKey && cloudApiSecret) {
      for (const publicId of cloudinaryIds) {
        await deleteCloudinaryAsset(cloudName, cloudApiKey, cloudApiSecret, publicId);
      }
    }

    // Delete only the Auth user proven by the supplied access token.
    // Existing profile foreign keys cascade the account-owned relational rows.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Account deletion failed:", deleteError.message);
      return jsonResponse({ error: "We could not delete your account. Please contact Doovly Support." }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Unexpected account deletion error:", error instanceof Error ? error.message : String(error));
    return jsonResponse({
      error: "We could not complete account deletion. Please try again or contact Doovly Support.",
    }, 500);
  }
});
