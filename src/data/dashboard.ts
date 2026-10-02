/**
 * Admin dashboard mock stats
 * -------------------------
 * Built from professionals, subscriptions, service requests, bookings.
 * Revenue = active Pro subscription count × Pro monthly price (from subscriptionPlans)
 *
 * Later: replace getDashboardStats() body with apiRequest("/admin/dashboard")
 */

import { PROFESSIONALS } from "@/data/professionals";
import { getMockSubscriptions } from "@/data/subscriptions";
import { SERVICE_REQUESTS } from "@/data/serviceRequests";
import { BOOKED_JOBS, RECEIVED_JOBS } from "@/data/booking";
import { getProMonthlyPrice } from "@/data/subscriptionPlans";

export type DashboardStats = {
  totalUsers: number;
  totalVerifiedUsers: number;
  totalProSubUsers: number;
  openRequests: number;
  /** Revenue from Pro subscriptions (active Pro count × plan monthly price) */
  totalRevenueFromPro: number;
  totalPostRequests: number;
  totalBookings: number;
  overviewSeries: { label: string; value: number }[];
  dateRangeLabel: string;
};

function buildOverviewSeries(): { label: string; value: number }[] {
  const base = PROFESSIONALS.length * 8 + SERVICE_REQUESTS.length * 3;
  const series: { label: string; value: number }[] = [];
  for (let day = 1; day <= 30; day++) {
    const wave = Math.sin(day / 4) * 20 + Math.cos(day / 3) * 15;
    const value = Math.max(
      12,
      Math.round(base + wave + (day % 7) * 6 + (day % 5) * 4),
    );
    series.push({
      label: day === 1 || day % 3 === 0 ? `Sep ${day}` : "",
      value,
    });
  }
  return series;
}

export function computeDashboardStats(): DashboardStats {
  const pros = PROFESSIONALS;
  const subs = getMockSubscriptions();
  const requests = SERVICE_REQUESTS;
  const bookings = [...BOOKED_JOBS, ...RECEIVED_JOBS];

  const totalUsers = pros.length;
  const totalVerifiedUsers = pros.filter((p) => p.verified).length;
  const totalProSubUsers = subs.filter(
    (s) => s.plan === "Pro" && s.status === "Active",
  ).length;
  const openRequests = requests.filter((r) => r.isNew).length;
  const totalPostRequests = requests.length;
  const totalBookings = bookings.length;

  const proMonthly = getProMonthlyPrice();
  const totalRevenueFromPro = totalProSubUsers * proMonthly;

  return {
    totalUsers,
    totalVerifiedUsers,
    totalProSubUsers,
    openRequests,
    totalRevenueFromPro,
    totalPostRequests,
    totalBookings,
    overviewSeries: buildOverviewSeries(),
    dateRangeLabel: "Sep 1, 2026 - Sep 30, 2026",
  };
}
