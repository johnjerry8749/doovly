import { supabase } from "@/lib/supabase";
import {
  type SubscriptionPlansState,
  type SubscriptionPlanConfig,
  type PlanFeature,
  type BillingPeriod,
} from "@/data/subscriptionPlans";

export type {
  SubscriptionPlansState,
  SubscriptionPlanConfig,
  PlanFeature,
  BillingPeriod,
};

let cache: SubscriptionPlansState | null = null;
let loadPromise: Promise<SubscriptionPlansState> | null = null;

async function fetchPlans(): Promise<SubscriptionPlansState> {
  const [{ data: plans, error: plansError }, { data: meta, error: metaError }] =
    await Promise.all([
      supabase
        .from("subscription_plans")
        .select("id,mock_id,name,tagline,monthly_price,yearly_price,popular,sort_order,subscription_plan_features(id,mock_id,label,sort_order)")
        .order("sort_order", { ascending: true }),
      supabase
        .from("subscription_plan_meta")
        .select("promo_title,promo_subtitle,yearly_save_percent")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (plansError) throw plansError;
  if (metaError) throw metaError;

  const rows = plans ?? [];
  if (!rows.length) {
    throw new Error("No subscription plans configured in Supabase.");
  }

  const mapped: SubscriptionPlanConfig[] = rows.map((row: any) => ({
    id: String(row.mock_id ?? "").toLowerCase() === "pro" ? "pro" : "basic",
    name: row.name,
    tagline: row.tagline ?? "",
    monthlyPrice: Number(row.monthly_price ?? 0),
    yearlyPrice: Number(row.yearly_price ?? 0),
    popular: Boolean(row.popular),
    features: (row.subscription_plan_features ?? [])
      .sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((f: any): PlanFeature => ({
        id: String(f.mock_id ?? f.id),
        label: String(f.label ?? ""),
      })),
  }));

  const result: SubscriptionPlansState = {
    plans: mapped,
    promoTitle: meta?.promo_title ?? "",
    promoSubtitle: meta?.promo_subtitle ?? "",
    yearlySavePercent: Number(meta?.yearly_save_percent ?? 0),
  };

  cache = result;
  return result;
}

export function getSubscriptionPlans(): SubscriptionPlansState {
  return cache ?? {
    plans: [],
    promoTitle: "",
    promoSubtitle: "",
    yearlySavePercent: 0,
  };
}

export async function getSubscriptionPlansAsync(): Promise<SubscriptionPlansState> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = fetchPlans().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export function getProMonthlyPrice(): number {
  return cache?.plans.find((p) => p.id === "pro")?.monthlyPrice ?? 0;
}

export async function getProMonthlyPriceAsync(): Promise<number> {
  const plans = await getSubscriptionPlansAsync();
  return plans.plans.find((p) => p.id === "pro")?.monthlyPrice ?? 0;
}

export function invalidateSubscriptionPlansCache() {
  cache = null;
}
