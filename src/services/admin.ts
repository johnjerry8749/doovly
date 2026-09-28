/**
 * Admin service
 * -------------
 * Screens import from here for admin-only helpers.
 *
 * NOW  → mock role check
 * LATER → Supabase role / claims (e.g. profiles.role === "admin")
 */

import { getCurrentUserId } from "@/services/inAppNotifications";

/** Mock admin user ids — replace with real role from backend */
const ADMIN_USER_IDS = new Set(["u1", "1", "admin"]);

export type AdminRole = "admin" | "user";

export function getAdminRole(userId?: string | null): AdminRole {
  const id = String(userId ?? getCurrentUserId() ?? "");
  return ADMIN_USER_IDS.has(id) ? "admin" : "user";
}

export function isAdmin(userId?: string | null): boolean {
  return getAdminRole(userId) === "admin";
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
