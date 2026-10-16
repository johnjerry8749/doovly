import { supabase } from "@/lib/supabase";
import { getAdminPromotionSummary, formatPromotionRevenue } from "@/services/admin/promotions";

export type DashboardRange = "all" | "30days";

export type DashboardStats = {
  totalUsers: number;
  totalVerifiedUsers: number;
  totalProSubUsers: number;
  totalRequests: number;
  totalRevenueFromPro: number;
  totalPromotions: number;
  activePromotions: number;
  promotionRevenueLabel: string;
  totalPostRequests: number;
  totalBookings: number;
  dateRangeLabel: string;
  overviewSeries: { label: string; value: number }[];
};

let cache: DashboardStats | null = null;

export async function getDashboardStats(range: DashboardRange = "all"): Promise<DashboardStats> {
  const since = range === "30days"
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  let usersQuery: any = supabase.from("profiles").select("id", { count: "exact", head: true });
  let verifiedQuery: any = supabase.from("professionals").select("id", { count: "exact", head: true }).eq("is_verified", true);
  // Current-state metric: active subscriptions are counted across all time, not by creation range.
  const subsQuery: any = supabase.from("professional_subscriptions").select("id,plan_id,plan_code,status").eq("status", "active");
  let postsQuery: any = supabase.from("service_requests").select("id", { count: "exact", head: true });
  let bookingsQuery: any = supabase.from("bookings").select("id", { count: "exact", head: true });

  if (since) {
    usersQuery = usersQuery.gte("created_at", since);
    verifiedQuery = verifiedQuery.gte("created_at", since);
    postsQuery = postsQuery.gte("created_at", since);
    bookingsQuery = bookingsQuery.gte("created_at", since);
  }

  const [users, verified, subs, posts, bookings, proPlan, promotionSummary] = await Promise.all([
    usersQuery,
    verifiedQuery,
    subsQuery,
    postsQuery,
    bookingsQuery,
    supabase.from("subscription_plans").select("id,monthly_price").eq("code", "pro").maybeSingle(),
    getAdminPromotionSummary(since),
  ]);

  const err = [users, verified, subs, posts, bookings, proPlan].find((r) => r.error)?.error;
  if (err) throw err;

  const proSubs = (subs.data ?? []).filter((r: any) => r.plan_code === "pro" || r.plan_id === proPlan.data?.id);
  const requestCount = posts.count ?? 0;
  const bookingCount = bookings.count ?? 0;

  const stats: DashboardStats = {
    totalUsers: users.count ?? 0,
    totalVerifiedUsers: verified.count ?? 0,
    totalProSubUsers: proSubs.length,
    totalRequests: requestCount,
    totalRevenueFromPro: proSubs.length * Number(proPlan.data?.monthly_price ?? 0),
    totalPromotions: promotionSummary.total,
    activePromotions: promotionSummary.active,
    promotionRevenueLabel: formatPromotionRevenue(promotionSummary.revenueByCurrency),
    totalPostRequests: requestCount,
    totalBookings: bookingCount,
    dateRangeLabel: range === "30days" ? "Last 30 days" : "All time",
    overviewSeries: [
      { label: "Users created", value: users.count ?? 0 },
      { label: "Verified profiles", value: verified.count ?? 0 },
      { label: "Active Pro", value: proSubs.length },
      { label: "Requests created", value: requestCount },
      { label: "Bookings created", value: bookingCount },
    ],
  };

  cache = stats;
  return stats;
}

export function getCachedDashboardStats() {
  return cache;
}
