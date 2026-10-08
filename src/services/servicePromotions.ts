import { supabase } from "@/lib/supabase";
import { loadSessionUser } from "@/lib/session";
import { getOfferings, purchasePackage } from "@/lib/revenuecat";
import type { ProService } from "@/services/professionals";

export type PromotionPackage = {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  productId: string;
  active: boolean;
  sortOrder: number;
};

export type ServicePromotion = {
  id: string;
  serviceId: string;
  professionalId: string;
  userId: string;
  packageId: string;
  productId: string;
  status: "pending" | "active" | "expired" | "cancelled" | "refunded";
  amount?: number;
  currency?: string;
  startsAt?: string;
  endsAt?: string;
};

function mapPackage(row: any): PromotionPackage {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    durationDays: Number(row.duration_days),
    productId: row.product_id,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapPromotion(row: any): ServicePromotion {
  return {
    id: row.id,
    serviceId: row.service_id,
    professionalId: row.professional_id,
    userId: row.user_id,
    packageId: row.package_id,
    productId: row.product_id,
    status: row.status,
    amount: row.amount == null ? undefined : Number(row.amount),
    currency: row.currency ?? undefined,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
  };
}

export async function listPromotionPackagesAsync(): Promise<PromotionPackage[]> {
  const { data, error } = await supabase
    .from("promotion_packages")
    .select("id,code,name,duration_days,product_id,active,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapPackage);
}

export async function getServicePromotionAsync(
  serviceId: string,
): Promise<ServicePromotion | null> {
  const { data, error } = await supabase
    .from("service_promotions")
    .select("id,service_id,professional_id,user_id,package_id,product_id,status,amount,currency,starts_at,ends_at")
    .eq("service_id", serviceId)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPromotion(data) : null;
}

export function isPromotionActive(
  promotion: ServicePromotion | null | undefined,
): boolean {
  if (!promotion || promotion.status !== "active" || !promotion.endsAt) return false;
  return new Date(promotion.endsAt).getTime() > Date.now();
}

export async function promoteServiceAsync(
  service: ProService,
  professionalId: string,
  packageId: string,
): Promise<{ promotion: ServicePromotion; activated: boolean }> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");

  const { data: pkg, error: packageError } = await supabase
    .from("promotion_packages")
    .select("id,code,name,duration_days,product_id,active,sort_order")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();

  if (packageError) throw packageError;
  if (!pkg) throw new Error("Promotion package is no longer available.");

  const { data: activePromotion } = await supabase
    .from("service_promotions")
    .select("id,status,ends_at")
    .eq("service_id", service.id)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .maybeSingle();

  if (activePromotion) {
    throw new Error("This service is already being promoted.");
  }

  const { data: pending, error: pendingError } = await supabase
    .from("service_promotions")
    .insert({
      service_id: service.id,
      professional_id: professionalId,
      user_id: session.uuid,
      package_id: pkg.id,
      product_id: pkg.product_id,
      status: "pending",
    })
    .select("id,service_id,professional_id,user_id,package_id,product_id,status,amount,currency,starts_at,ends_at")
    .single();

  if (pendingError) throw pendingError;

  const promotion = mapPromotion(pending);

  try {
    const { default: Purchases } = await import("react-native-purchases");
    await Purchases.setAttributes({
      doovly_promotion_id: promotion.id,
      doovly_service_id: service.id,
    });
    await Purchases.syncAttributesAndOfferingsIfNeeded();

    const offering = await getOfferings();
    const purchasePackage = offering?.availablePackages.find(
      (item) => item.product.identifier === pkg.product_id,
    );

    if (!purchasePackage) {
      throw new Error(
        "This promotion is not available for purchase yet. Please try again later.",
      );
    }

    await purchasePackageAndReturn(purchasePackage);

    const activated = await waitForPromotionActivation(promotion.id);
    const latest = await getServicePromotionAsync(service.id);

    return {
      promotion: latest ?? promotion,
      activated,
    };
  } catch (error) {
    await supabase
      .from("service_promotions")
      .update({ status: "cancelled" })
      .eq("id", promotion.id)
      .eq("status", "pending");
    throw error;
  }
}

async function purchasePackageAndReturn(pkg: Parameters<typeof purchasePackage>[0]) {
  return purchasePackage(pkg);
}

async function waitForPromotionActivation(
  promotionId: string,
  timeoutMs = 15000,
): Promise<boolean> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase
      .from("service_promotions")
      .select("status")
      .eq("id", promotionId)
      .maybeSingle();

    if (data?.status === "active") return true;
    if (data?.status === "refunded" || data?.status === "cancelled") return false;

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}
