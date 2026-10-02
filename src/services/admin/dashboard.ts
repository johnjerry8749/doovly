/**
 * Admin dashboard service
 * ----------------------
 * Admin screens import from @/services/admin/dashboard
 *
 * NOW  → mock from src/data/dashboard.ts
 * LATER → apiRequest("/admin/dashboard")
 */

import {
  computeDashboardStats,
  type DashboardStats,
} from "@/data/dashboard";

export type { DashboardStats };

/** Platform overview stats for admin Dashboard. */
export function getDashboardStats(): DashboardStats {
  // TODO backend: return apiRequest<DashboardStats>("/admin/dashboard")
  return computeDashboardStats();
}
