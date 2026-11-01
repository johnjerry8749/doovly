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
    ids.add(input.replace(/\\.[a-z0-9]+$/i, ""));
    return;
  }

  if (!input.includes("res.cloudinary.com/") || !input.includes("/image/upload/")) return;
  const afterUpload = input.split("/image/upload/")[1]?.split(/[?#]/)[0];
  if (!afterUpload) return;

  const parts = afterUpload.split("/");
  const folderIndex = parts.findIndex((part) => part === "doovly");
  if (folderIndex < 0) return;

  const publicId = parts.slice(folderIndex).join("/").replace(/\\.[a-z0-9]+$/i, "");
  if (publicId.startsWith("doovly/")) ids.add(publicId);
}

function addStorageKey(value: unknown, keys: Set<string>) {
  if (typeof value !== "string" || !value.trim()) return;
  let key = value.trim();

  // Accept legacy raw keys and public/signed URLs from this project's bucket.
  const marker = "/storage/v1/object/";
  if (key.includes(marker)) {
    const afterMarker = key.split(marker)[1]?.replace(/^(public|sign|authenticated)\\//, "");
    if (!afterMarker?.startsWith("profile-images/")) return;
    key = afterMarker.slice("profile-images/".length).split(/[?#]/)[0];
  } else if (/^https?:\\/\\//i.test(key)) {
    return;
  }

  if (key.startsWith("profile-images/")) key = key.slice("profile-images/".length);
  if (key) keys.add(decodeURIComponent(key));
}

async function fetchAllRows<T>(buildQuery: () => any): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function cloudinarySignature(publicId: string, timestamp: number, apiSecret: string) {
  const value = "invalidate=true&public_id=" + publicId + "&timestamp=" + timestamp + apiSecret;
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

  const endpoint = "https://api.cloudinary.com/v1_1/" +
    encodeURIComponent(cloudName) + "/image/destroy";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || (result.result !== "ok" && result.result !== "not found")) {
    throw new Error("Cloudinary could not remove an account image (" + response.status + ").");
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
    addStorageKey(profile?.avatar_url, storageKeys);

    const professionals = await fetchAllRows<any>(() =>
      admin.from("professionals").select("id,avatar_url,avatar_key").eq("user_id", user.id)
    );
    const professionalIds = professionals.map((row) => row.id);

    for (const professional of professionals) {
      addCloudinaryId(professional.avatar_url, cloudinaryIds);
      addCloudinaryId(professional.avatar_key, cloudinaryIds);
      addStorageKey(professional.avatar_url, storageKeys);
      addStorageKey(professional.avatar_key, storageKeys);
    }

    if (professionalIds.length) {
      const portfolio = await fetchAllRows<any>(() =>
        admin.from("portfolio_items").select("image_key,image_url")
          .in("professional_id", professionalIds)
      );
      for (const item of portfolio) {
        addCloudinaryId(item.image_key, cloudinaryIds);
        addCloudinaryId(item.image_url, cloudinaryIds);
        addStorageKey(item.image_key, storageKeys);
        addStorageKey(item.image_url, storageKeys);
      }
    }

    const requests = await fetchAllRows<any>(() =>
      admin.from("service_requests").select("id,images,image_keys")
        .eq("created_by", user.id)
    );
    for (const requestRow of requests) {
      for (const value of requestRow.images ?? []) {
        addCloudinaryId(value, cloudinaryIds);
        addStorageKey(value, storageKeys);
      }
      // image_keys are legacy Supabase Storage object keys, not Cloudinary IDs.
      for (const value of requestRow.image_keys ?? []) addStorageKey(value, storageKeys);
    }

    const applications = await fetchAllRows<any>(() =>
      admin.from("verification_applications").select("id").eq("user_id", user.id)
    );
    const applicationIds = applications.map((row) => row.id);
    if (applicationIds.length) {
      const documents = await fetchAllRows<any>(() =>
        admin.from("verification_documents").select("preview_key,file_url")
          .in("application_id", applicationIds)
      );
      for (const document of documents) {
        addCloudinaryId(document.preview_key, cloudinaryIds);
        addCloudinaryId(document.file_url, cloudinaryIds);
        addStorageKey(document.preview_key, storageKeys);
        addStorageKey(document.file_url, storageKeys);
      }
    }

    const messages = await fetchAllRows<any>(() =>
      admin.from("messages").select("text,kind,image_url")
        .eq("sender_id", user.id)
    );
    for (const message of messages) {
      if (message.kind === "image") addCloudinaryId(message.text, cloudinaryIds);
      addCloudinaryId(message.image_url, cloudinaryIds);
      addStorageKey(message.image_url, storageKeys);
      if (message.kind === "image") addStorageKey(message.text, storageKeys);
    }

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const cloudApiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const cloudApiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (cloudinaryIds.size && (!cloudName || !cloudApiKey || !cloudApiSecret)) {
      return jsonResponse({
        error: "Your account has uploaded images. Doovly must finish configuring secure image deletion before your account can be permanently deleted. Please try again later.",
      }, 503);
    }

    // Remove external assets first. Both providers treat already-missing assets as safe to retry.
    if (storageKeys.size) {
      const keys = Array.from(storageKeys);
      for (let index = 0; index < keys.length; index += 100) {
        const { error } = await admin.storage.from("profile-images").remove(keys.slice(index, index + 100));
        if (error) throw new Error("Could not remove all of your stored profile images.");
      }
    }

    if (cloudName && cloudApiKey && cloudApiSecret) {
      for (const publicId of cloudinaryIds) {
        await deleteCloudinaryAsset(cloudName, cloudApiKey, cloudApiSecret, publicId);
      }
    }

    // These relationships use ON DELETE SET NULL, so remove the user's authored rows
    // explicitly before deleting the Auth user/profile.
    const cleanupDeletes = [
      admin.from("reviews").delete().eq("user_id", user.id),
      admin.from("service_request_comments").delete().eq("user_id", user.id),
      admin.from("service_requests").delete().eq("created_by", user.id),
      admin.from("admin_notifications").delete().eq("created_by", user.id),
    ];
    if (professionalIds.length) {
      cleanupDeletes.push(
        admin.from("service_request_offers").delete().in("professional_id", professionalIds) as any,
      );
    }
    const cleanupResults = await Promise.all(cleanupDeletes);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;
    if (cleanupError) throw cleanupError;

    // Auth deletion cascades all remaining user-owned rows (profile, professional,
    // services, portfolio, bookings, conversations/messages, offers, likes, etc.).
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Account deletion failed:", deleteError.message);
      return jsonResponse({ error: "We could not delete your account. Please contact Doovly Support." }, 500);
    }

    return jsonResponse({
      ok: true,
      deleted: {
        authoredReviews: cleanupResults[0].count ?? null,
        authoredComments: cleanupResults[1].count ?? null,
        serviceRequests: cleanupResults[2].count ?? null,
        adminNotifications: cleanupResults[3].count ?? null,
      },
    });
  } catch (error) {
    console.error("Unexpected account deletion error:", error instanceof Error ? error.message : String(error));
    return jsonResponse({
      error: "We could not complete account deletion. Please try again or contact Doovly Support.",
    }, 500);
  }
});
