import { supabase } from "@/lib/supabase";

export type AdminPromotionPackageInput = {
  code: string;
  name: string;
  durationDays: number;
  productId: string;
  active?: boolean;
  sortOrder?: number;
};

export async function listPromotionPackagesAdminAsync() {
  const { data, error } = await supabase
    .from("promotion_packages")
    .select("id,code,name,duration_days,product_id,active,sort_order,created_at,updated_at")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPromotionPackageAdminAsync(
  input: AdminPromotionPackageInput,
) {
  const { data, error } = await supabase
    .from("promotion_packages")
    .insert({
      code: input.code.trim(),
      name: input.name.trim(),
      duration_days: input.durationDays,
      product_id: input.productId.trim(),
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePromotionPackageAdminAsync(
  id: string,
  input: Partial<AdminPromotionPackageInput>,
) {
  const payload: Record<string, unknown> = {};
  if (input.code !== undefined) payload.code = input.code.trim();
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.durationDays !== undefined) payload.duration_days = input.durationDays;
  if (input.productId !== undefined) payload.product_id = input.productId.trim();
  if (input.active !== undefined) payload.active = input.active;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("promotion_packages")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setPromotionPackageActiveAdminAsync(
  id: string,
  active: boolean,
) {
  return updatePromotionPackageAdminAsync(id, { active });
}


export type PromotionStatus = "pending" | "active" | "expired" | "cancelled" | "refunded";

export type AdminPromotion = {
  id: string;
  serviceName: string;
  ownerName: string;
  ownerEmail: string;
  status: PromotionStatus;
  amount: number | null;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  packageName: string;
};

export type PromotionSummary = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  expired: number;
  refunded: number;
  revenueByCurrency: Record<string, number>;
};

export function formatPromotionRevenue(revenue: Record<string, number>) {
  const entries = Object.entries(revenue).filter(([, amount]) => amount > 0);
  if (!entries.length) return "₦0";
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => {
      try {
        return new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: currency || "NGN",
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${currency || "Currency"} ${amount.toLocaleString()}`;
      }
    })
    .join(" · ");
}

export async function getAdminPromotionSummary(): Promise<PromotionSummary> {
  const { data, error } = await supabase
    .from("service_promotions")
    .select("id,status,amount,currency,starts_at,ends_at");

  if (error) throw error;

  const now = Date.now();
  const rows = data ?? [];
  const isActive = (row: any) =>
    row.status === "active" &&
    !!row.starts_at &&
    !!row.ends_at &&
    new Date(row.starts_at).getTime() <= now &&
    new Date(row.ends_at).getTime() > now;

  const revenueByCurrency: Record<string, number> = {};
  for (const row of rows) {
    // Count recorded purchases only; never estimate revenue from package prices.
    if (row.amount == null || row.status === "pending" || row.status === "refunded") continue;
    const currency = String(row.currency || "NGN").toUpperCase();
    revenueByCurrency[currency] = (revenueByCurrency[currency] ?? 0) + Number(row.amount);
  }

  return {
    total: rows.length,
    active: rows.filter(isActive).length,
    inactive: rows.filter((row: any) => !isActive(row)).length,
    pending: rows.filter((row: any) => row.status === "pending").length,
    expired: rows.filter((row: any) => row.status === "expired").length,
    refunded: rows.filter((row: any) => row.status === "refunded").length,
    revenueByCurrency,
  };
}

export async function listAdminPromotions(): Promise<AdminPromotion[]> {
  const { data, error } = await supabase
    .from("service_promotions")
    .select("id,service_id,user_id,package_id,status,amount,currency,starts_at,ends_at,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const serviceIds = [...new Set(rows.map((row: any) => row.service_id).filter(Boolean))];
  const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))];
  const packageIds = [...new Set(rows.map((row: any) => row.package_id).filter(Boolean))];

  const [services, profiles, packages] = await Promise.all([
    serviceIds.length ? supabase.from("services").select("id,name").in("id", serviceIds) : Promise.resolve({ data: [], error: null } as any),
    userIds.length ? supabase.from("profiles").select("id,full_name,email").in("id", userIds) : Promise.resolve({ data: [], error: null } as any),
    packageIds.length ? supabase.from("promotion_packages").select("id,name").in("id", packageIds) : Promise.resolve({ data: [], error: null } as any),
  ]);

  const lookupError = services.error ?? profiles.error ?? packages.error;
  if (lookupError) throw lookupError;

  const serviceById = new Map((services.data ?? []).map((item: any) => [item.id, item]));
  const profileById = new Map((profiles.data ?? []).map((item: any) => [item.id, item]));
  const packageById = new Map((packages.data ?? []).map((item: any) => [item.id, item]));

  return rows.map((row: any) => {
    const service: any = serviceById.get(row.service_id);
    const profile: any = profileById.get(row.user_id);
    const pkg: any = packageById.get(row.package_id);
    return {
      id: row.id,
      serviceName: service?.name ?? "Deleted service",
      ownerName: profile?.full_name ?? "Unknown user",
      ownerEmail: profile?.email ?? "",
      status: row.status as PromotionStatus,
      amount: row.amount == null ? null : Number(row.amount),
      currency: String(row.currency || ""),
      startsAt: row.starts_at ?? null,
      endsAt: row.ends_at ?? null,
      createdAt: row.created_at,
      packageName: pkg?.name ?? "Promotion package",
    };
  });
}
