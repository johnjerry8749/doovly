import { supabase } from "@/lib/supabase";
import { loadSessionUser } from "@/lib/session";
import {
  getBoostPackage,
  getBoostPackages,
  purchaseBoostPackage,
  setPurchaseContext,
} from "@/lib/revenuecat";
import type { ProService } from "@/services/professionals";

export type PromotionPackage = {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  productId: string;
  active: boolean;
  sortOrder: number;
  priceString?: string;
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
    .select(
      "id,code,name,duration_days,product_id,active,sort_order",
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const packages = (data ?? []).map(mapPackage);
  if (!packages.length) return [];

  try {
    const boostPackages = await getBoostPackages();
    const prices = new Map(
      boostPackages.map((pkg) => [
        pkg.product.identifier,
        pkg.product.priceString,
      ]),
    );

    return packages.map((pkg) => ({
      ...pkg,
      priceString: prices.get(pkg.productId),
    }));
  } catch (error) {
    console.warn("[Promotion] product prices unavailable:", error);
    return packages;
  }
}

export async function getServicePromotionAsync(
  serviceId: string,
): Promise<ServicePromotion | null> {
  const { data, error } = await supabase
    .from("service_promotions")
    .select(
      "id,service_id,professional_id,user_id,package_id,product_id,status,amount,currency,starts_at,ends_at",
    )
    .eq("service_id", serviceId)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPromotion(data) : null;
}

export async function getProfessionalPromotionLockAsync(
  professionalId: string,
): Promise<ServicePromotion | null> {
  const { data: pending, error: pendingError } = await supabase
    .from("service_promotions")
    .select(
      "id,service_id,professional_id,user_id,package_id,product_id,status,amount,currency,starts_at,ends_at",
    )
    .eq("professional_id", professionalId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) throw pendingError;
  if (pending) return mapPromotion(pending);

  const now = new Date().toISOString();
  const { data: active, error: activeError } = await supabase
    .from("service_promotions")
    .select(
      "id,service_id,professional_id,user_id,package_id,product_id,status,amount,currency,starts_at,ends_at",
    )
    .eq("professional_id", professionalId)
    .eq("status", "active")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeError) throw activeError;
  return active ? mapPromotion(active) : null;
}

export function isPromotionActive(
  promotion: ServicePromotion | null | undefined,
): boolean {
  if (!promotion || promotion.status !== "active" || !promotion.endsAt) {
    return false;
  }

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
    .select(
      "id,code,name,duration_days,product_id,active,sort_order",
    )
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();

  if (packageError) throw packageError;
  if (!pkg) throw new Error("Promotion package is no longer available.");

  // Only one service promotion may be active or processing for a professional at a time.
  const activePromotion = await getProfessionalPromotionLockAsync(professionalId);
  if (activePromotion) {
    if (activePromotion.status === "active") {
      throw new Error("You already have an active promotion. You can promote another service after it expires.");
    }
    throw new Error("A promotion purchase is already processing. Please wait for it to finish before trying again.");
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
    .select(
      "id,service_id,professional_id,user_id,package_id,product_id,status,amount,currency,starts_at,ends_at",
    )
    .single();

  if (pendingError) throw pendingError;

  const promotion = mapPromotion(pending);

  try {
    await setPurchaseContext({
      doovly_promotion_id: promotion.id,
      doovly_service_id: service.id,
    });

    const boostPackage = await getBoostPackage(pkg.product_id);

    if (!boostPackage) {
      throw new Error(
        "This promotion is not available for purchase yet. Please try again later.",
      );
    }

    await purchaseBoostPackage(boostPackage);

    const activated = await waitForPromotionActivation(promotion.id);
    const latest = await getServicePromotionAsync(service.id);

    return {
      promotion: latest ?? promotion,
      activated,
    };
  } catch (error) {
    const purchaseError = error as {
      userCancelled?: boolean;
      code?: string;
      message?: string;
    };

    if (purchaseError.userCancelled) {
      await cancelPendingPromotion(promotion.id);
      const cancelled = new Error("PURCHASE_CANCELLED");
      throw cancelled;
    }

    const isPendingPayment =
      purchaseError.code === "PAYMENT_PENDING_ERROR" ||
      purchaseError.code === "paymentPendingError";

    if (!isPendingPayment) {
      await cancelPendingPromotion(promotion.id);
    }

    throw error;
  }
}

async function cancelPendingPromotion(promotionId: string): Promise<void> {
  await supabase
    .from("service_promotions")
    .update({ status: "cancelled" })
    .eq("id", promotionId)
    .eq("status", "pending");
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
    if (
      data?.status === "refunded" ||
      data?.status === "cancelled"
    ) {
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return false;
}
