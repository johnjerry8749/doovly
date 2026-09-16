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
