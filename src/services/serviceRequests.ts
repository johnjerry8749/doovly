/**
 * Service requests service
 * -----------------------
 * Screens import ONLY from here — never from @/data/serviceRequests directly
 * (except types if needed).
 *
 * NOW  → mock data from src/data/serviceRequests.ts
 * LATER → swap each function body to apiRequest("/service-requests...")
 *         Keep function names + return types the same so screens need zero changes.
 */

import {
  SERVICE_REQUESTS,
  getServiceRequestById as getFromData,
  type ServiceRequest,
  type ServiceRequestComment,
  type ServiceRequestIcon,
} from "@/data/serviceRequests";
import { getCurrentUserId } from "@/services/inAppNotifications";
// import { apiRequest } from "@/services/api"; // ← uncomment when backend is ready

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

/** List all service requests. */
export function listServiceRequests(): ServiceRequest[] {
  // TODO backend: return apiRequest<ServiceRequest[]>("/service-requests")
  return SERVICE_REQUESTS;
}

/** Filter by city name (case-insensitive). */
export function listServiceRequestsByCity(city: string): ServiceRequest[] {
  // TODO backend: return apiRequest(`/service-requests?city=${encodeURIComponent(city)}`)
  const key = city.trim().toLowerCase();
  if (!key || key === "all nigeria" || key === "nigeria") {
    return SERVICE_REQUESTS;
  }
  const filtered = SERVICE_REQUESTS.filter(
    (r) =>
      r.city.toLowerCase().includes(key) ||
      key.includes(r.city.toLowerCase()) ||
      r.location.toLowerCase().includes(key),
  );
  return filtered.length > 0 ? filtered : SERVICE_REQUESTS;
}

/** Single request by id. */
export function getServiceRequestById(
  id: string,
): ServiceRequest | undefined {
  // TODO backend: return apiRequest<ServiceRequest>(`/service-requests/${id}`)
  return getFromData(id);
}

/** Recent requests (home / services). */
export function listRecentServiceRequests(limit = 5): ServiceRequest[] {
  // TODO backend: return apiRequest(`/service-requests?limit=${limit}&sort=recent`)
  return SERVICE_REQUESTS.slice(0, limit);
}

/** Create a new service request. */
export function createServiceRequest(
  input: CreateServiceRequestInput,
): ServiceRequest {
  // TODO backend:
  // return apiRequest<ServiceRequest>("/service-requests", {
  //   method: "POST",
  //   body: JSON.stringify(input),
  // });

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

/** Add a comment on a request. Returns the new comment. */
export function addServiceRequestComment(
  input: AddCommentInput,
): ServiceRequestComment | null {
  // TODO backend:
  // return apiRequest<ServiceRequestComment>(
  //   `/service-requests/${input.requestId}/comments`,
  //   { method: "POST", body: JSON.stringify({ text: input.text }) },
  // );

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

/** Toggle / set like. Returns new likes count. */
export function likeServiceRequest(requestId: string, liked: boolean): number {
  // TODO backend:
  // return apiRequest<{ likesCount: number }>(
  //   `/service-requests/${requestId}/like`,
  //   { method: liked ? "POST" : "DELETE" },
  // ).then((r) => r.likesCount);

  const request = getFromData(requestId);
  if (!request) return 0;

  if (liked) {
    request.likesCount = (request.likesCount || 0) + 1;
  } else {
    request.likesCount = Math.max(0, (request.likesCount || 0) - 1);
  }
  return request.likesCount;
}

/**
 * Submit a price offer on a request.
 * Returns a simple result object for the UI / notifications.
 */
export function submitServiceRequestOffer(input: SubmitOfferInput): {
  ok: boolean;
  requestId: string;
  amount: number;
  recipientUserId: string;
} | null {
  // TODO backend:
  // return apiRequest(`/service-requests/${input.requestId}/offers`, {
  //   method: "POST",
  //   body: JSON.stringify({ amount: input.amount, message: input.message }),
  // });

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
