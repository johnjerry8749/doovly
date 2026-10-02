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
import {
  getCurrentUserId,
  addInAppNotification,
} from "@/services/inAppNotifications";

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
    SERVICE_REQUESTS.filter(
      (r) => String(r.createdByUserId) === String(uid),
    ),
  );
}

export function listServiceRequestsByCity(city: string): ServiceRequest[] {
  const c = city.trim().toLowerCase();
  if (!c) return listServiceRequests();
  return listServiceRequests().filter(
    (r) => r.city.trim().toLowerCase() === c,
  );
}

export function getServiceRequestById(
  id: string,
): ServiceRequest | undefined {
  return getFromData(id);
}

export function listRecentServiceRequests(limit = 5): ServiceRequest[] {
  return listServiceRequests().slice(0, limit);
}

export function createServiceRequest(
  input: CreateServiceRequestInput,
): ServiceRequest {
  // TODO backend: return apiRequest("/service-requests", { method: "POST", body })
  const request: ServiceRequest = {
    id: `sr-${Date.now()}`,
    title: input.title.trim(),
    category: input.category,
    profession: input.category,
    location: input.location.trim(),
    city: input.city.trim(),
    timeAgo: "Just now",
    icon: input.icon,
    iconBackground: input.iconBackground,
    images: input.images.slice(0, 4),
    description: input.description.trim(),
    isNew: true,
    createdByUserId: getCurrentUserId(),
    posterName: "You",
    posterAvatar: DEFAULT_AVATAR,
    posterVerified: false,
    likesCount: 0,
    maxOffers: input.maxOffers,
    offersCount: 0,
    offeredByUserIds: [],
    comments: [],
  };
  SERVICE_REQUESTS.unshift(request);
  return request;
}

export function updateServiceRequest(
  id: string,
  input: UpdateServiceRequestInput,
): ServiceRequest | null {
  // TODO backend: PATCH /service-requests/:id
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
  if (input.images !== undefined) request.images = input.images.slice(0, 4);
  if (input.icon !== undefined) request.icon = input.icon;
  if (input.iconBackground !== undefined)
    request.iconBackground = input.iconBackground;
  return request;
}

export function deleteServiceRequest(id: string): boolean {
  // TODO backend: DELETE /service-requests/:id
  const request = getFromData(id);
  if (!request) return false;
  if (!isOwnServiceRequest(request)) return false;
  const idx = SERVICE_REQUESTS.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  SERVICE_REQUESTS.splice(idx, 1);
  return true;
}

export function addServiceRequestComment(
  input: AddCommentInput,
): ServiceRequestComment | null {
  // TODO backend: POST /service-requests/:id/comments
  // Server should also create an in-app + push notification for the owner.
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

  // Notify owner when someone else comments (mock + same shape for API later)
  const ownerId = String(request.createdByUserId || "");
  const actorId = String(getCurrentUserId());
  if (ownerId && ownerId !== actorId) {
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

export function submitServiceRequestOffer(input: SubmitOfferInput): {
  ok: boolean;
  requestId: string;
  amount: number;
  recipientUserId: string;
  reason?: "own" | "full" | "already" | "invalid";
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
  const uid = String(getCurrentUserId());
  const offered = request.offeredByUserIds || [];
  if (offered.some((id) => String(id) === uid)) {
    return {
      ok: false,
      requestId: request.id,
      amount: input.amount,
      recipientUserId: request.createdByUserId,
      reason: "already",
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
  request.offeredByUserIds = [...offered, uid];
  return {
    ok: true,
    requestId: request.id,
    amount: input.amount,
    recipientUserId: request.createdByUserId,
  };
}
