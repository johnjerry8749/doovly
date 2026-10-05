import { supabase } from "@/lib/supabase";

export type DashboardStats = {
  totalUsers: number;
  totalVerifiedUsers: number;
  totalProSubUsers: number;
  openRequests: number;
  totalRevenueFromPro: number;
  totalPostRequests: number;
  totalBookings: number;
  dateRangeLabel: string;
  overviewSeries: { label: string; value: number }[];
};

let cache: DashboardStats | null = null;

export async function getDashboardStats(): Promise<DashboardStats> {
  const [users, verified, pro, requests, revenue, posts, bookings] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("professionals").select("id", { count: "exact", head: true }).eq("is_verified", true),
      supabase.from("professional_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).in("status", ["open", "Open"]),
      supabase.from("professional_subscriptions").select("plan_id,subscription_plans(monthly_price)").eq("status", "active"),
      supabase.from("service_requests").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
    ]);

  const errors = [users, verified, pro, requests, revenue, posts, bookings].filter((r) => r.error);
  if (errors.length) throw errors[0].error;

  const totalRevenueFromPro = (revenue.data ?? []).reduce((sum: number, row: any) => {
    const price = Array.isArray(row.subscription_plans)
      ? row.subscription_plans[0]?.monthly_price
      : row.subscription_plans?.monthly_price;
    return sum + Number(price ?? 0);
  }, 0);

  const totalUsers = users.count ?? 0;
  const stats: DashboardStats = {
    totalUsers,
    totalVerifiedUsers: verified.count ?? 0,
    totalProSubUsers: pro.count ?? 0,
    openRequests: requests.count ?? 0,
    totalRevenueFromPro,
    totalPostRequests: posts.count ?? 0,
    totalBookings: bookings.count ?? 0,
    dateRangeLabel: "All time",
    overviewSeries: [
      { label: "Users", value: totalUsers },
      { label: "Verified", value: verified.count ?? 0 },
      { label: "Pro", value: pro.count ?? 0 },
      { label: "Requests", value: posts.count ?? 0 },
      { label: "Bookings", value: bookings.count ?? 0 },
    ],
  };
  cache = stats;
  return stats;
}

export function getCachedDashboardStats(): DashboardStats | null {
  return cache;
}
