/**
 * Service requests service
 * -----------------------
 * Screens import ONLY from here.
 */

import {
  SERVICE_REQUESTS,
  getServiceRequestById as getFromData,
  type ServiceRequest,
  type ServiceRequestIcon,
} from "@/data/serviceRequests";
import { getCurrentUserId } from "@/services/inAppNotifications";

export type { ServiceRequest };

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

/** List all service requests. */
export function listServiceRequests(): ServiceRequest[] {
  return SERVICE_REQUESTS;
}

/** Filter by city name (case-insensitive). */
export function listServiceRequestsByCity(city: string): ServiceRequest[] {
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
  return getFromData(id);
}

/** Add a request to the mock list. Later: POST /service-requests. */
export function createServiceRequest(
  input: CreateServiceRequestInput,
): ServiceRequest {
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
    posterAvatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    likesCount: 0,
    comments: [],
  };

  SERVICE_REQUESTS.unshift(request);
  return request;
}

/** Recent requests (limit for home / services header). */
export function listRecentServiceRequests(limit = 5): ServiceRequest[] {
  return SERVICE_REQUESTS.slice(0, limit);
}
