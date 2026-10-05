/**
 * Service requests service — Supabase source of truth.
 * UI/API contract is preserved; no screen styling or layout changes.
 */
import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabase";
import { loadSessionUser, getCachedSessionUser } from "@/lib/session";
import { mapServiceRequestRow, mapServiceRequestComment, SERVICE_REQUEST_SELECT } from "@/lib/rowMappers";
import { tryToUuid } from "@/lib/ids";
import type { ServiceRequest, ServiceRequestComment, ServiceRequestIcon } from "@/data/serviceRequests";
import { uploadImageFull, UPLOAD_FOLDERS } from "@/services/cloudinary";

export type { ServiceRequest, ServiceRequestComment, ServiceRequestIcon };

export type CreateServiceRequestInput = {
  category: string; title: string; description: string; location: string; city: string;
  images: ImageSourcePropType[]; icon: ServiceRequestIcon; iconBackground: string; maxOffers: number;
};
export type UpdateServiceRequestInput = {
  title?: string; description?: string; category?: string; location?: string; city?: string;
  images?: ImageSourcePropType[]; icon?: ServiceRequestIcon; iconBackground?: string;
};
export type SubmitOfferInput = { requestId: string; amount: number; message?: string };
export type AddCommentInput = { requestId: string; text: string; userName?: string; userAvatar?: ImageSourcePropType };

let cache: ServiceRequest[] | null = null;
let loadPromise: Promise<ServiceRequest[]> | null = null;

function currentUuid(): string | null {
  return getCachedSessionUser()?.uuid ?? null;
}
function requestUuid(id: string): string { return tryToUuid("serviceRequest", id) ?? id; }

async function uploadRequestImages(images: ImageSourcePropType[] | undefined) {
  const urls: string[] = [];
  const keys: string[] = [];
  for (const image of images ?? []) {
    const uri = typeof image === "object" && image && "uri" in image ? String((image as any).uri ?? "") : "";
    if (!uri) continue;
    if (/^https?:\/\//i.test(uri)) { urls.push(uri); continue; }
    const uploaded = await uploadImageFull(uri, UPLOAD_FOLDERS.requests);
    urls.push(uploaded.secure_url);
    keys.push(uploaded.public_id);
  }
  return { urls, keys };
}

async function fetchAll(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from("service_requests").select(SERVICE_REQUEST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  cache = (data ?? []).map(mapServiceRequestRow);
  return cache;
}
export async function ensureServiceRequestsLoaded(): Promise<ServiceRequest[]> {
  if (cache) return cache;
  if (!loadPromise) loadPromise = fetchAll().finally(() => { loadPromise = null; });
  return loadPromise;
}
export function invalidateServiceRequestsCache() { cache = null; }
export function listServiceRequests(): ServiceRequest[] {
  if (!cache) void ensureServiceRequestsLoaded();
  return cache ?? [];
}
export async function listServiceRequestsAsync(): Promise<ServiceRequest[]> { return ensureServiceRequestsLoaded(); }
export function listMyServiceRequests(): ServiceRequest[] {
  const uid = currentUuid();
  return listServiceRequests().filter(r => uid ? r.createdByUserId === uid : false);
}
export async function listMyServiceRequestsAsync(): Promise<ServiceRequest[]> {
  const all = await ensureServiceRequestsLoaded(); const uid = currentUuid();
  return all.filter(r => uid ? r.createdByUserId === uid : false);
}
export function listServiceRequestsByCity(city: string): ServiceRequest[] {
  const c = city.trim().toLowerCase();
  if (!c || c === "all nigeria" || c === "nigeria") return listServiceRequests();
  return listServiceRequests().filter(r => r.city.toLowerCase() === c);
}
export async function listServiceRequestsByCityAsync(city: string): Promise<ServiceRequest[]> {
  await ensureServiceRequestsLoaded(); return listServiceRequestsByCity(city);
}
export function getServiceRequestById(id: string): ServiceRequest | undefined {
  return listServiceRequests().find(r => String(r.id) === String(id));
}
export async function getServiceRequestByIdAsync(id: string): Promise<ServiceRequest | undefined> {
  const local = getServiceRequestById(id); if (local) return local;
  const { data, error } = await supabase.from("service_requests").select(SERVICE_REQUEST_SELECT)
    .or(`id.eq.${requestUuid(id)},mock_id.eq.${id}`).maybeSingle();
  if (error) throw error; return data ? mapServiceRequestRow(data) : undefined;
}
export function listRecentServiceRequests(limit = 5): ServiceRequest[] { return listServiceRequests().slice(0, limit); }
export function isOwnServiceRequest(request: ServiceRequest): boolean {
  const uid = currentUuid(); return !!uid && String(request.createdByUserId) === uid;
}

export async function createServiceRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
  const s = await loadSessionUser(true); if (!s) throw new Error("Not logged in");
  const uploaded = await uploadRequestImages(input.images);
  const { data, error } = await supabase.from("service_requests").insert({
    title: input.title.trim(), category: input.category, profession: input.category,
    location: input.location.trim(), city: input.city.trim(), description: input.description.trim(),
    icon: input.icon, icon_background: input.iconBackground, images: uploaded.urls, image_keys: uploaded.keys,
    time_ago: "Just now", is_new: true, created_by: s.uuid,
    poster_name: s.fullName || "You", poster_avatar_url: null, poster_verified: s.verified,
    likes_count: 0, max_offers: Math.max(1, Math.min(20, input.maxOffers)), offers_count: 0, offered_by: [],
  }).select(SERVICE_REQUEST_SELECT).single();
  if (error) throw error;
  invalidateServiceRequestsCache(); return mapServiceRequestRow(data);
}

export async function updateServiceRequest(id: string, input: UpdateServiceRequestInput): Promise<ServiceRequest | null> {
  const s = await loadSessionUser(true); if (!s) throw new Error("Not logged in");
  const uuid = requestUuid(id);
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.category !== undefined) { patch.category = input.category; patch.profession = input.category; }
  if (input.location !== undefined) patch.location = input.location.trim();
  if (input.city !== undefined) patch.city = input.city.trim();
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.iconBackground !== undefined) patch.icon_background = input.iconBackground;
  if (input.images !== undefined) {
    const uploaded = await uploadRequestImages(input.images);
    patch.images = uploaded.urls;
    patch.image_keys = uploaded.keys;
  }
  const { data, error } = await supabase.from("service_requests").update(patch)
    .eq("id", uuid).eq("created_by", s.uuid).select(SERVICE_REQUEST_SELECT).maybeSingle();
  if (error) throw error; if (!data) return null;
  invalidateServiceRequestsCache(); return mapServiceRequestRow(data);
}

export async function deleteServiceRequest(id: string): Promise<boolean> {
  const s = await loadSessionUser(true); if (!s) return false;
  const { error } = await supabase.from("service_requests").delete()
    .eq("id", requestUuid(id)).eq("created_by", s.uuid);
  if (error) throw error; invalidateServiceRequestsCache(); return true;
}

export async function addServiceRequestComment(input: AddCommentInput): Promise<ServiceRequestComment | null> {
  const s = await loadSessionUser(true); if (!s || !input.text.trim()) return null;
  const request = await getServiceRequestByIdAsync(input.requestId); if (!request) return null;
  const { data, error } = await supabase.from("service_request_comments").insert({
    request_id: requestUuid(input.requestId), user_id: s.uuid,
    user_name: input.userName?.trim() || s.fullName || "You", user_avatar_url: null, text: input.text.trim(), time_ago: "Just now",
  }).select("id,mock_id,user_id,user_name,user_avatar_url,text,time_ago,created_at").single();
  if (error) throw error; invalidateServiceRequestsCache(); return mapServiceRequestComment(data);
}

export async function likeServiceRequest(requestId: string, liked: boolean): Promise<number> {
  const s = await loadSessionUser(true); if (!s) throw new Error("Not logged in");
  const rid = requestUuid(requestId);
  if (liked) {
    const { error } = await supabase.from("service_request_likes").upsert({ request_id: rid, user_id: s.uuid }, { onConflict: "request_id,user_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("service_request_likes").delete().eq("request_id", rid).eq("user_id", s.uuid);
    if (error) throw error;
  }
  const { count, error } = await supabase.from("service_request_likes").select("request_id", { count: "exact", head: true }).eq("request_id", rid);
  if (error) throw error; invalidateServiceRequestsCache(); return count ?? 0;
}

export function canSendOfferOnRequest(request: ServiceRequest): { ok: boolean; reason?: "own"|"full"|"already"|"missing" } {
  if (!request) return { ok:false, reason:"missing" };
  if (isOwnServiceRequest(request)) return { ok:false, reason:"own" };
  const uid = currentUuid(); if (!uid) return { ok:false, reason:"already" };
  if ((request.offeredByUserIds || []).includes(uid)) return { ok:false, reason:"already" };
  if ((request.offersCount ?? 0) >= (request.maxOffers ?? 5)) return { ok:false, reason:"full" };
  return { ok:true };
}

export async function submitServiceRequestOffer(input: SubmitOfferInput): Promise<{
  ok:boolean; requestId:string; amount:number; recipientUserId:string; reason?: "own"|"full"|"already"|"invalid"
}|null> {
  const s = await loadSessionUser(true); if (!s) throw new Error("Not logged in");
  if (!input.amount || input.amount <= 0) return {ok:false,requestId:input.requestId,amount:0,recipientUserId:"",reason:"invalid"};
  const request = await getServiceRequestByIdAsync(input.requestId); if (!request) return null;
  if (isOwnServiceRequest(request)) return {ok:false,requestId:request.id,amount:input.amount,recipientUserId:request.createdByUserId,reason:"own"};
  const allowed = canSendOfferOnRequest(request); if (!allowed.ok) return {ok:false,requestId:request.id,amount:input.amount,recipientUserId:request.createdByUserId,reason:allowed.reason};
  const { error } = await supabase.from("service_request_offers").insert({
    request_id: requestUuid(input.requestId), user_id: s.uuid,
    professional_id: s.professionalUuid, amount: input.amount, message: input.message?.trim() || null, status: "pending",
  });
  if (error) throw error;
  invalidateServiceRequestsCache();
  return {ok:true,requestId:request.id,amount:input.amount,recipientUserId:request.createdByUserId};
}
