/**
 * Admin service
 * -------------
 * Screens import from here for admin-only helpers.
 *
 * Role source: getCurrentUserRole() (professional.role === "admin")
 * LATER → Supabase profiles.role / JWT claims
 */

import { getCurrentUserRole } from "@/services/savedProviders";

export type AdminRole = "admin" | "user";

export function getAdminRole(): AdminRole {
  return getCurrentUserRole();
}

export function isAdmin(): boolean {
  return getCurrentUserRole() === "admin";
}

export type AdminStats = {
  users: number;
  requests: number;
  bookings: number;
  pendingOffers: number;
};

/** Dashboard mock stats — swap to API later */
export function getAdminStats(): AdminStats {
  return {
    users: 128,
    requests: 46,
    bookings: 89,
    pendingOffers: 12,
  };
}
