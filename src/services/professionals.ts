/**
 * Professionals service
 * --------------------
 * Screens import ONLY from here.
 *
 * NOW  → reads mock data from src/data/professionals.ts
 * LATER → swap the body of each function to call apiRequest("/professionals...")
 *
 * Do not change function names when you add the backend — only the insides.
 */

import {
  PROFESSIONALS,
  getProfessionalById as getFromData,
  getDistanceKm,
  starsFromReviewCount,
  type Professional,
  type ProService,
  type ProReview,
} from "@/data/professionals";
import { SERVICE_CATEGORIES } from "@/data/serviceCategories";

export type { Professional, ProService, ProReview };
export { getDistanceKm, starsFromReviewCount };

/** List all professionals (Home, Search). */
export function listProfessionals(): Professional[] {
  // TODO backend: return apiRequest<Professional[]>("/professionals")
  return PROFESSIONALS;
}

/** Filter by city name (case-insensitive). */
export function listProfessionalsByCity(city: string): Professional[] {
  // TODO backend: return apiRequest(`/professionals?city=${encodeURIComponent(city)}`)
  const key = city.trim().toLowerCase();
  if (!key || key === "all nigeria" || key === "nigeria") {
    return PROFESSIONALS;
  }
  const filtered = PROFESSIONALS.filter(
    (p) =>
      p.city.toLowerCase().includes(key) || key.includes(p.city.toLowerCase()),
  );
  return filtered.length > 0 ? filtered : PROFESSIONALS;
}

/** Single professional by id (Profile screen). */
export function getProfessionalById(
  id: string,
): Professional | undefined {
  // TODO backend: return apiRequest<Professional>(`/professionals/${id}`)
  return getFromData(id);
}

/** Home category chips. */
export function listServiceCategories() {
  // TODO backend: return apiRequest("/categories") if they become dynamic
  return SERVICE_CATEGORIES;
}

/**
 * Add a review (mock: returns the new review object for local state).
 * Later: POST /professionals/:id/reviews and return server row.
 */
export async function addReview(
  professionalId: string,
  payload: { userName: string; comment: string },
): Promise<ProReview> {
  // TODO backend:
  // return apiRequest(`/professionals/${professionalId}/reviews`, {
  //   method: "POST",
  //   body: JSON.stringify(payload),
  // })
  await new Promise((r) => setTimeout(r, 300));
  return {
    id: `local-${Date.now()}`,
    userName: payload.userName.trim() || "Anonymous",
    comment: payload.comment.trim(),
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

// =====================================================
// AUTH USER SERVICES (My Services screen)
// =====================================================
//
// NOW  → read/write mock data on the professional object
// LATER → replace each body with apiRequest to your auth user's services API
//
// Example later:
//   GET    /me/services
//   POST   /me/services
//   PATCH  /me/services/:id
//   DELETE /me/services/:id
//

export type ServiceInput = {
  name: string;
  description: string;
  price: string;
  icon?: string;
};

/** Services for the logged-in professional (auth user). */
export function listMyServices(professionalId: string): ProService[] {
  // TODO backend: return apiRequest<ProService[]>("/me/services")
  const pro = getFromData(professionalId);
  return pro ? [...pro.services] : [];
}

/** Create a service for the auth user. */
export async function createMyService(
  professionalId: string,
  input: ServiceInput,
): Promise<ProService> {
  // TODO backend:
  // return apiRequest<ProService>("/me/services", {
  //   method: "POST",
  //   body: JSON.stringify(input),
  // })
  await new Promise((r) => setTimeout(r, 200));

  const priceValue = Number(String(input.price).replace(/[^0-9.]/g, "")) || 0;
  const newService: ProService = {
    id: `s-${Date.now()}`,
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price.trim().startsWith("₦")
      ? input.price.trim()
      : `₦${Number(input.price).toLocaleString()}`,
    priceValue,
    icon: input.icon || "briefcase-outline",
  };

  const pro = PROFESSIONALS.find((p) => p.id === String(professionalId));
  if (pro) {
    pro.services = [...pro.services, newService];
  }

  return newService;
}

/** Update an existing service for the auth user. */
export async function updateMyService(
  professionalId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<ProService | null> {
  // TODO backend:
  // return apiRequest<ProService>(`/me/services/${serviceId}`, {
  //   method: "PATCH",
  //   body: JSON.stringify(input),
  // })
  await new Promise((r) => setTimeout(r, 200));

  const pro = PROFESSIONALS.find((p) => p.id === String(professionalId));
  if (!pro) return null;

  const idx = pro.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return null;

  const priceValue = Number(String(input.price).replace(/[^0-9.]/g, "")) || 0;
  const updated: ProService = {
    ...pro.services[idx],
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price.trim().startsWith("₦")
      ? input.price.trim()
      : `₦${Number(input.price).toLocaleString()}`,
    priceValue,
    icon: input.icon || pro.services[idx].icon,
  };

  pro.services = pro.services.map((s, i) => (i === idx ? updated : s));
  return updated;
}

/** Delete a service for the auth user. */
export async function deleteMyService(
  professionalId: string,
  serviceId: string,
): Promise<boolean> {
  // TODO backend:
  // await apiRequest(`/me/services/${serviceId}`, { method: "DELETE" })
  // return true
  await new Promise((r) => setTimeout(r, 150));

  const pro = PROFESSIONALS.find((p) => p.id === String(professionalId));
  if (!pro) return false;

  const before = pro.services.length;
  pro.services = pro.services.filter((s) => s.id !== serviceId);
  return pro.services.length < before;
}
