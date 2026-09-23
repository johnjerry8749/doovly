/**
 * Service requests service
 * Screens import ONLY from here.
 *
 * NOW  → mock data
 * LATER → swap bodies to apiRequest(...) — keep names & types identical
 */

import {
  SERVICE_REQUESTS,
  getServiceRequestById as getFromData,
  type ServiceRequest,
  type ServiceRequestComment,
  type ServiceRequestIcon,
} from "@/data/serviceRequests";
import { getCurrentUserId } from "@/services/inAppNotifications";

export type { ServiceRequest, ServiceRequestComment, ServiceRequestIcon };

export type CreateServiceRequestInput = {
  category: string;
  title: string;
  description: string;
  location: string;
  city: string;
  preferredDate: string;
  images: string[];
  icon: ServiceRequestIcon;
  iconBackground: string;
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
  userAvatar?: string;
};

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80";

/** Unique by id — prevents duplicate cards if mock was pushed twice. */
function uniqueById(list: ServiceRequest[]): ServiceRequest[] {
  const seen = new Set<string>();
  const out: ServiceRequest[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function listServiceRequests(): ServiceRequest[] {
  // TODO backend: return apiRequest<ServiceRequest[]>("/service-requests")
  return uniqueById(SERVICE_REQUESTS);
}

export function listServiceRequestsByCity(city: string): ServiceRequest[] {
  // TODO backend: return apiRequest(`/service-requests?city=...`)
  const key = city.trim().toLowerCase();
  if (!key || key === "all nigeria" || key === "nigeria") {
    return uniqueById(SERVICE_REQUESTS);
  }
  const filtered = SERVICE_REQUESTS.filter(
    (r) =>
      r.city.toLowerCase().includes(key) ||
      key.includes(r.city.toLowerCase()) ||
      r.location.toLowerCase().includes(key),
  );
  return uniqueById(filtered.length > 0 ? filtered : SERVICE_REQUESTS);
}

export function getServiceRequestById(
  id: string,
): ServiceRequest | undefined {
  // TODO backend: return apiRequest(`/service-requests/${id}`)
  return getFromData(id);
}

export function listRecentServiceRequests(limit = 5): ServiceRequest[] {
  // TODO backend: return apiRequest(`/service-requests?limit=${limit}`)
  return uniqueById(SERVICE_REQUESTS).slice(0, limit);
}

export function createServiceRequest(
  input: CreateServiceRequestInput,
): ServiceRequest {
  // TODO backend: POST /service-requests
  const request: ServiceRequest = {
    id: `local-${Date.now()}`,
    title: input.title.trim(),
    category: input.category,
    profession: input.category,
    location: input.location.trim(),
    city: input.city.trim(),
    date: input.preferredDate,
    timeAgo: "Just now",
    icon: input.icon,
    iconBackground: input.iconBackground,
    images: input.images,
    description: input.description.trim(),
    preferredDate: input.preferredDate,
    isNew: true,
    createdByUserId: getCurrentUserId(),
    posterName: "You",
    posterAvatar: DEFAULT_AVATAR,
    likesCount: 0,
    comments: [],
  };
  SERVICE_REQUESTS.unshift(request);
  return request;
}

export function addServiceRequestComment(
  input: AddCommentInput,
): ServiceRequestComment | null {
  // TODO backend: POST /service-requests/:id/comments
  const request = getFromData(input.requestId);
  if (!request) return null;
  const comment: ServiceRequestComment = {
    id: `c-${Date.now()}`,
    userName: input.userName?.trim() || "You",
    userAvatar: input.userAvatar || DEFAULT_AVATAR,
    text: input.text.trim(),
    timeAgo: "Just now",
  };
  request.comments = [...(request.comments || []), comment];
  return comment;
}

export function likeServiceRequest(requestId: string, liked: boolean): number {
  // TODO backend: POST|DELETE /service-requests/:id/like
  const request = getFromData(requestId);
  if (!request) return 0;
  if (liked) request.likesCount = (request.likesCount || 0) + 1;
  else request.likesCount = Math.max(0, (request.likesCount || 0) - 1);
  return request.likesCount;
}

export function submitServiceRequestOffer(input: SubmitOfferInput): {
  ok: boolean;
  requestId: string;
  amount: number;
  recipientUserId: string;
} | null {
  // TODO backend: POST /service-requests/:id/offers
  const request = getFromData(input.requestId);
  if (!request || !input.amount || input.amount <= 0) return null;
  const recipientUserId =
    request.createdByUserId &&
    request.createdByUserId !== getCurrentUserId()
      ? request.createdByUserId
      : getCurrentUserId();
  return {
    ok: true,
    requestId: request.id,
    amount: input.amount,
    recipientUserId,
  };
}
