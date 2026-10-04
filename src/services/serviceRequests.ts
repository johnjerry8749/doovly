/**
 * Service requests service — screens import ONLY from here.
 *
 * DATA SOURCE: Supabase
 *   service_requests
 *   service_request_comments
 *   service_request_offers
 *   service_request_likes
 *
 * Keep function names + return shapes stable for the UI.
 */

import type { ImageSourcePropType } from "react-native";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { resolveImageSource, resolveImageSources } from "@/lib/mappers";
import {
  getCurrentUserId,
  addInAppNotification,
} from "@/services/inAppNotifications";

export type ServiceRequestIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export type ServiceRequestComment = {
  id: string;
  userId?: string;
  userName: string;
  userAvatar: ImageSourcePropType;
  text: string;
  timeAgo: string;
};

export type ServiceRequest = {
  id: string;
  title: string;
  category: string;
  profession: string;
  location: string;
  city: string;
  price?: string;
  timeAgo: string;
  icon: ServiceRequestIcon;
  iconBackground: string;
  latitude?: number;
  longitude?: number;
  images: ImageSourcePropType[];
  description: string;
  isNew: boolean;
  createdByUserId: string;
  posterName: string;
  posterAvatar: ImageSourcePropType;
  posterVerified?: boolean;
  likesCount: number;
  maxOffers: number;
  offersCount: number;
  offeredByUserIds?: string[];
  comments: ServiceRequestComment[];
};

export type CreateServiceRequestInput = {
  category: string;
  title: string;
  description: string;
  location: string;
  city: string;
  images: ImageSourcePropType[];
  icon: ServiceRequestIcon;
  iconBackground: string;
  maxOffers: number;
};

export type UpdateServiceRequestInput = {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  city?: string;
  images?: ImageSourcePropType[];
  icon?: ServiceRequestIcon;
  iconBackground?: string;
};

export type SubmitOfferInput = {
  requestId: string;
  amount: number;
  message?: string;
};

export type AddCommentInput = {
  requestId: string;
  text: string;
  userName?: string;
  userAvatar?: ImageSourcePropType;
};

const DEFAULT_AVATAR = require("@/assets/profile_1.jpg");

type RequestRow = {
  id: string;
  mock_id: string | null;
  title: string;
  category: string;
  profession: string;
  location: string;
  city: string;
  price: string | null;
  description: string;
  icon: string;
  icon_background: string | null;
  images: string[] | null;
  image_keys: string[] | null;
  time_ago: string | null;
  is_new: boolean;
  created_by: string | null;
  poster_name: string;
  poster_avatar_url: string | null;
  poster_verified: boolean;
  likes_count: number;
  max_offers: number;
  offers_count: number;
  offered_by: string[] | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  request_id: string;
  user_id: string | null;
  user_name: string;
  user_avatar_url: string | null;
  text: string;
  time_ago: string | null;
  created_at: string;
};

function formatTimeAgo(iso: string | null | undefined, fallback?: string | null): string {
  if (fallback?.trim()) return fallback.trim();
  if (!iso) return "Just now";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Just now";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec || 1} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function mapComment(row: CommentRow): ServiceRequestComment {
  const avatar =
    resolveImageSource(row.user_avatar_url) ?? DEFAULT_AVATAR;
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    userName: row.user_name?.trim() || "User",
    userAvatar: avatar as ImageSourcePropType,
    text: row.text ?? "",
    timeAgo: formatTimeAgo(row.created_at, row.time_ago),
  };
}

function mapRequest(
  row: RequestRow,
  comments: ServiceRequestComment[] = [],
): ServiceRequest {
  const images = resolveImageSources(row.image_keys, row.images);
  const posterAvatar =
    (resolveImageSource(row.poster_avatar_url) as ImageSourcePropType) ||
    DEFAULT_AVATAR;

  return {
    id: row.id,
    title: row.title ?? "",
    category: row.category ?? "",
    profession: row.profession ?? row.category ?? "",
    location: row.location ?? "",
    city: row.city ?? "",
    price: row.price ?? undefined,
    timeAgo: formatTimeAgo(row.created_at, row.time_ago),
    icon: (row.icon as ServiceRequestIcon) || "briefcase-outline",
    iconBackground: row.icon_background?.trim() || "#E8F5E9",
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    images: images.length ? images : [],
    description: row.description ?? "",
    isNew: Boolean(row.is_new),
    createdByUserId: row.created_by ?? "",
    posterName: row.poster_name ?? "User",
    posterAvatar,
    posterVerified: Boolean(row.poster_verified),
    likesCount: Number(row.likes_count ?? 0),
    maxOffers: Number(row.max_offers ?? 5),
    offersCount: Number(row.offers_count ?? 0),
    offeredByUserIds: (row.offered_by ?? []).map(String),
    comments,
  };
}

async function loadCommentsByRequestIds(
  requestIds: string[],
): Promise<Map<string, ServiceRequestComment[]>> {
  const map = new Map<string, ServiceRequestComment[]>();
  if (!requestIds.length) return map;

  const { data, error } = await supabase
    .from("service_request_comments")
    .select(
      "id, request_id, user_id, user_name, user_avatar_url, text, time_ago, created_at",
    )
    .in("request_id", requestIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadCommentsByRequestIds error:", error.message);
    return map;
  }

  for (const row of (data ?? []) as CommentRow[]) {
    const list = map.get(row.request_id) ?? [];
    list.push(mapComment(row));
    map.set(row.request_id, list);
  }
  return map;
}

async function fetchRequests(
  filter?: { createdBy?: string; city?: string; id?: string },
): Promise<ServiceRequest[]> {
  let query = supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter?.id) query = query.eq("id", filter.id);
  if (filter?.createdBy) query = query.eq("created_by", filter.createdBy);
  if (filter?.city) {
    const c = filter.city.trim();
    if (c && c.toLowerCase() !== "all nigeria" && c.toLowerCase() !== "nigeria") {
      query = query.ilike("city", c);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchRequests error:", error.message);
    throw error;
  }

  const rows = (data ?? []) as RequestRow[];
  const commentsMap = await loadCommentsByRequestIds(rows.map((r) => r.id));
  return rows.map((r) => mapRequest(r, commentsMap.get(r.id) ?? []));
}

/** True when the request belongs to the authenticated user. */
export function isOwnServiceRequest(request: ServiceRequest): boolean {
  const current = getCurrentUserId();
  return String(request.createdByUserId) === String(current);
}

export async function listServiceRequests(): Promise<ServiceRequest[]> {
  return fetchRequests();
}

export async function listMyServiceRequests(): Promise<ServiceRequest[]> {
  const uid = getCurrentUserId();
  if (!uid) return [];
  return fetchRequests({ createdBy: uid });
}

export async function listServiceRequestsByCity(
  city: string,
): Promise<ServiceRequest[]> {
  return fetchRequests({ city });
}

export async function getServiceRequestById(
  id: string,
): Promise<ServiceRequest | undefined> {
  const list = await fetchRequests({ id: String(id).trim() });
  return list[0];
}

export async function listRecentServiceRequests(
  limit = 5,
): Promise<ServiceRequest[]> {
  const all = await listServiceRequests();
  return all.slice(0, limit);
}

export async function createServiceRequest(
  input: CreateServiceRequestInput,
): Promise<ServiceRequest> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to create a request.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const imageUrls: string[] = [];
  for (const img of input.images.slice(0, 4)) {
    if (typeof img === "object" && img && "uri" in img && typeof img.uri === "string") {
      if (img.uri.startsWith("http")) imageUrls.push(img.uri);
    }
  }

  const payload = {
    title: input.title.trim(),
    category: input.category,
    profession: input.category,
    location: input.location.trim(),
    city: input.city.trim(),
    description: input.description.trim(),
    icon: input.icon || "briefcase-outline",
    icon_background: input.iconBackground || "#E8F5E9",
    images: imageUrls,
    image_keys: [] as string[],
    time_ago: "Just now",
    is_new: true,
    created_by: user.id,
    poster_name:
      profile?.full_name?.trim() ||
      (user.user_metadata?.full_name as string) ||
      "You",
    poster_avatar_url: profile?.avatar_url ?? null,
    poster_verified: false,
    likes_count: 0,
    max_offers: Math.min(20, Math.max(1, Number(input.maxOffers) || 5)),
    offers_count: 0,
    offered_by: [] as string[],
  };

  const { data, error } = await supabase
    .from("service_requests")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("createServiceRequest error:", error.message);
    throw error;
  }

  return mapRequest(data as RequestRow, []);
}

export async function updateServiceRequest(
  id: string,
  input: UpdateServiceRequestInput,
): Promise<ServiceRequest | null> {
  const existing = await getServiceRequestById(id);
  if (!existing) return null;
  if (!isOwnServiceRequest(existing)) return null;

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.category !== undefined) {
    patch.category = input.category;
    patch.profession = input.category;
  }
  if (input.location !== undefined) patch.location = input.location.trim();
  if (input.city !== undefined) patch.city = input.city.trim();
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.iconBackground !== undefined) patch.icon_background = input.iconBackground;
  if (input.images !== undefined) {
    const imageUrls: string[] = [];
    for (const img of input.images.slice(0, 4)) {
      if (typeof img === "object" && img && "uri" in img && typeof img.uri === "string") {
        if (img.uri.startsWith("http")) imageUrls.push(img.uri);
      }
    }
    patch.images = imageUrls;
  }

  const { data, error } = await supabase
    .from("service_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("updateServiceRequest error:", error.message);
    throw error;
  }

  const commentsMap = await loadCommentsByRequestIds([id]);
  return mapRequest(data as RequestRow, commentsMap.get(id) ?? []);
}

export async function deleteServiceRequest(id: string): Promise<boolean> {
  const existing = await getServiceRequestById(id);
  if (!existing) return false;
  if (!isOwnServiceRequest(existing)) return false;

  const { error } = await supabase.from("service_requests").delete().eq("id", id);
  if (error) {
    console.error("deleteServiceRequest error:", error.message);
    return false;
  }
  return true;
}

export async function addServiceRequestComment(
  input: AddCommentInput,
): Promise<ServiceRequestComment | null> {
  const text = input.text.trim();
  if (!text) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const request = await getServiceRequestById(input.requestId);
  if (!request) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const userName =
    input.userName?.trim() ||
    profile?.full_name?.trim() ||
    "You";

  let avatarUrl: string | null = profile?.avatar_url ?? null;
  if (
    input.userAvatar &&
    typeof input.userAvatar === "object" &&
    "uri" in input.userAvatar
  ) {
    avatarUrl = String(input.userAvatar.uri);
  }

  const { data, error } = await supabase
    .from("service_request_comments")
    .insert({
      request_id: input.requestId,
      user_id: user.id,
      user_name: userName,
      user_avatar_url: avatarUrl,
      text,
      time_ago: "Just now",
    })
    .select("*")
    .single();

  if (error) {
    console.error("addServiceRequestComment error:", error.message);
    return null;
  }

  const comment = mapComment(data as CommentRow);

  const ownerId = String(request.createdByUserId || "");
  if (ownerId && ownerId !== user.id) {
    const preview =
      comment.text.length > 80
        ? `${comment.text.slice(0, 80)}…`
        : comment.text;
    addInAppNotification({
      userId: ownerId,
      type: "message",
      title: "New comment on your request",
      body: `${comment.userName} on "${request.title}": ${preview}`,
    });
  }

  return comment;
}

export async function likeServiceRequest(
  requestId: string,
  liked: boolean,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  if (liked) {
    await supabase.from("service_request_likes").upsert(
      { request_id: requestId, user_id: user.id },
      { onConflict: "request_id,user_id" },
    );
  } else {
    await supabase
      .from("service_request_likes")
      .delete()
      .eq("request_id", requestId)
      .eq("user_id", user.id);
  }

  const { count } = await supabase
    .from("service_request_likes")
    .select("*", { count: "exact", head: true })
    .eq("request_id", requestId);

  const likesCount = count ?? 0;
  await supabase
    .from("service_requests")
    .update({ likes_count: likesCount })
    .eq("id", requestId);

  return likesCount;
}

export function canSendOfferOnRequest(request: ServiceRequest): {
  ok: boolean;
  reason?: "own" | "full" | "already" | "missing";
} {
  if (!request) return { ok: false, reason: "missing" };
  if (isOwnServiceRequest(request)) return { ok: false, reason: "own" };
  const uid = String(getCurrentUserId());
  const already = (request.offeredByUserIds || []).some(
    (id) => String(id) === uid,
  );
  if (already) return { ok: false, reason: "already" };
  const max = request.maxOffers ?? 5;
  const count = request.offersCount ?? 0;
  if (count >= max) return { ok: false, reason: "full" };
  return { ok: true };
}

export async function submitServiceRequestOffer(input: SubmitOfferInput): Promise<{
  ok: boolean;
  requestId: string;
  amount: number;
  recipientUserId: string;
  reason?: "own" | "full" | "already" | "invalid";
} | null> {
  if (!input.amount || input.amount <= 0) {
    return {
      ok: false,
      requestId: input.requestId,
      amount: 0,
      recipientUserId: "",
      reason: "invalid",
    };
  }

  const request = await getServiceRequestById(input.requestId);
  if (!request) {
    return {
      ok: false,
      requestId: input.requestId,
      amount: input.amount,
      recipientUserId: "",
      reason: "invalid",
    };
  }

  const check = canSendOfferOnRequest(request);
  if (!check.ok) {
    return {
      ok: false,
      requestId: request.id,
      amount: input.amount,
      recipientUserId: request.createdByUserId,
      reason: check.reason === "missing" ? "invalid" : check.reason,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      requestId: request.id,
      amount: input.amount,
      recipientUserId: request.createdByUserId,
      reason: "invalid",
    };
  }

  const { data: pro } = await supabase
    .from("professionals")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: offerError } = await supabase.from("service_request_offers").insert({
    request_id: request.id,
    user_id: user.id,
    professional_id: pro?.id ?? null,
    amount: input.amount,
    message: input.message?.trim() || null,
    status: "pending",
  });

  if (offerError) {
    // unique (request_id, user_id) → already offered
    if (offerError.code === "23505") {
      return {
        ok: false,
        requestId: request.id,
        amount: input.amount,
        recipientUserId: request.createdByUserId,
        reason: "already",
      };
    }
    console.error("submitServiceRequestOffer error:", offerError.message);
    return {
      ok: false,
      requestId: request.id,
      amount: input.amount,
      recipientUserId: request.createdByUserId,
      reason: "invalid",
    };
  }

  const offeredBy = [...(request.offeredByUserIds || []), user.id];
  const offersCount = (request.offersCount ?? 0) + 1;

  await supabase
    .from("service_requests")
    .update({
      offers_count: offersCount,
      offered_by: offeredBy,
    })
    .eq("id", request.id);

  return {
    ok: true,
    requestId: request.id,
    amount: input.amount,
    recipientUserId: request.createdByUserId,
  };
}
