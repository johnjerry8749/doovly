/**
 * Service requests service — screens import ONLY from here.
 * Mock data uses local @/assets/profile_*.jpg (same as professionals).
 *
 * NOW  → mutates in-memory SERVICE_REQUESTS from src/data/serviceRequests.ts
 * LATER → swap each function body to apiRequest(...) — keep the same signatures.
 */

import type { ImageSourcePropType } from "react-native";
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
  images: ImageSourcePropType[];
  icon: ServiceRequestIcon;
  iconBackground: string;
  /** How many offers this request should accept (1–20) */
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

/** True when the request belongs to the authenticated user (mock or API). */
export function isOwnServiceRequest(request: ServiceRequest): boolean {
  const current = getCurrentUserId();
  return String(request.createdByUserId) === String(current);
}

export function listServiceRequests(): ServiceRequest[] {
  // TODO backend: return apiRequest<ServiceRequest[]>("/service-requests")
  return uniqueById(SERVICE_REQUESTS);
}

/**
 * Requests created by the logged-in user only.
 * NOW  → filter mock by createdByUserId
 * LATER → GET /service-requests?mine=1 or /me/service-requests
 */
export function listMyServiceRequests(): ServiceRequest[] {
  const uid = getCurrentUserId();
  return uniqueById(
    SERVICE_REQUESTS.filter((r) => String(r.createdByUserId) === String(uid)),
  );
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
    timeAgo: "Just now",
    icon: input.icon,
    iconBackground: input.iconBackground,
    images: input.images.length ? input.images : [DEFAULT_AVATAR],
    description: input.description.trim(),
    isNew: true,
    createdByUserId: getCurrentUserId(),
    posterName: "You",
    posterAvatar: DEFAULT_AVATAR,
    posterVerified: false,
    likesCount: 0,
    maxOffers: Math.min(20, Math.max(1, Math.floor(input.maxOffers) || 5)),
    offersCount: 0,
    comments: [],
  };
  SERVICE_REQUESTS.unshift(request);
  return request;
}

/**
 * Update own request only.
 * NOW  → mutates mock row if createdByUserId matches current user
 * LATER → PATCH /service-requests/:id
 */
export function updateServiceRequest(
  id: string,
  input: UpdateServiceRequestInput,
): ServiceRequest | null {
  const request = getFromData(id);
  if (!request) return null;
  if (!isOwnServiceRequest(request)) return null;

  if (input.title !== undefined) request.title = input.title.trim();
  if (input.description !== undefined)
    request.description = input.description.trim();
  if (input.category !== undefined) {
    request.category = input.category;
    request.profession = input.category;
  }
  if (input.location !== undefined) request.location = input.location.trim();
  if (input.city !== undefined) request.city = input.city.trim();
  if (input.images !== undefined && input.images.length > 0) {
    request.images = input.images;
  }
  if (input.icon !== undefined) request.icon = input.icon;
  if (input.iconBackground !== undefined)
    request.iconBackground = input.iconBackground;

  // TODO backend: return apiRequest(`/service-requests/${id}`, { method: "PATCH", body: input })
  return request;
}

/**
 * Delete own request only.
 * NOW  → removes from mock array if owned by current user
 * LATER → DELETE /service-requests/:id
 */
export function deleteServiceRequest(id: string): boolean {
  const request = getFromData(id);
  if (!request) return false;
  if (!isOwnServiceRequest(request)) return false;

  const index = SERVICE_REQUESTS.findIndex((r) => r.id === String(id));
  if (index < 0) return false;
  SERVICE_REQUESTS.splice(index, 1);
  // TODO backend: await apiRequest(`/service-requests/${id}`, { method: "DELETE" })
  return true;
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

/** Whether the current user may send an offer on this request. */
export function canSendOfferOnRequest(request: ServiceRequest): {
  ok: boolean;
  reason?: "own" | "full" | "missing";
} {
  if (!request) return { ok: false, reason: "missing" };
  if (isOwnServiceRequest(request)) return { ok: false, reason: "own" };
  const max = request.maxOffers ?? 5;
  const count = request.offersCount ?? 0;
  if (count >= max) return { ok: false, reason: "full" };
  return { ok: true };
}

export function submitServiceRequestOffer(input: SubmitOfferInput): {
  ok: boolean;
  requestId: string;
  amount: number;
  recipientUserId: string;
  reason?: "own" | "full" | "invalid";
} | null {
  // TODO backend: POST /service-requests/:id/offers
  const request = getFromData(input.requestId);
  if (!request || !input.amount || input.amount <= 0) {
    return {
      ok: false,
      requestId: input.requestId,
      amount: 0,
      recipientUserId: "",
      reason: "invalid",
    };
  }
  if (isOwnServiceRequest(request)) {
    return {
      ok: false,
      requestId: request.id,
      amount: input.amount,
      recipientUserId: request.createdByUserId,
      reason: "own",
    };
  }
  const max = request.maxOffers ?? 5;
  const count = request.offersCount ?? 0;
  if (count >= max) {
    return {
      ok: false,
      requestId: request.id,
      amount: input.amount,
      recipientUserId: request.createdByUserId,
      reason: "full",
    };
  }
  request.offersCount = count + 1;
  return {
    ok: true,
    requestId: request.id,
    amount: input.amount,
    recipientUserId: request.createdByUserId,
  };
}
