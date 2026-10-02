/**
 * Admin dashboard service
 * ----------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock from src/data/dashboard.ts (derived from professionals etc.)
 * LATER → swap to apiRequest("/admin/dashboard")
 */

import {
  computeDashboardStats,
  PRO_MONTHLY_PRICE_NGN,
  type DashboardStats,
} from "@/data/dashboard";

export type { DashboardStats };
export { PRO_MONTHLY_PRICE_NGN };

/** Platform overview stats for admin Dashboard. */
export function getDashboardStats(): DashboardStats {
  // TODO backend: return apiRequest<DashboardStats>("/admin/dashboard")
  return computeDashboardStats();
}
