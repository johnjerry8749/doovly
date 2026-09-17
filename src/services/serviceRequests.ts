/**
 * Service requests service
 * -----------------------
 * Screens import ONLY from here.
 *
 * NOW  → reads mock data from src/data/serviceRequests.ts
 * LATER → swap the body of each function to call apiRequest("/service-requests...")
 *
 * Do not change function names when you add the backend — only the insides.
 */

import {
  SERVICE_REQUESTS,
  getServiceRequestById as getFromData,
  type ServiceRequest,
} from "@/data/serviceRequests";

export type { ServiceRequest };

/** List all service requests. */
export function listServiceRequests(): ServiceRequest[] {
  // TODO backend: return apiRequest<ServiceRequest[]>("/service-requests")
  return SERVICE_REQUESTS;
}

/** Filter by city name (case-insensitive). Same pattern as listProfessionalsByCity. */
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

/** Recent requests (limit for home / services header). */
export function listRecentServiceRequests(limit = 5): ServiceRequest[] {
  // TODO backend: return apiRequest(`/service-requests?limit=${limit}&sort=recent`)
  return SERVICE_REQUESTS.slice(0, limit);
}
