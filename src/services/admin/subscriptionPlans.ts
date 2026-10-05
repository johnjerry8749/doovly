import { supabase } from "@/lib/supabase";

export type BillingPeriod = "monthly" | "yearly";
export type PlanFeature = { id: string; label: string };
export type SubscriptionPlanConfig = {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular: boolean;
  features: PlanFeature[];
};
export type SubscriptionPlansState = {
  plans: SubscriptionPlanConfig[];
  yearlySavePercent: number;
  promoTitle?: string;
  promoSubtitle?: string;
};

export async function getSubscriptionPlans(): Promise<SubscriptionPlansState> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id,code,name,tagline,monthly_price,yearly_price,popular,sort_order,subscription_plan_features(id,code,label,sort_order)")
    .order("sort_order");

  if (error) throw error;

  const meta = await supabase
    .from("subscription_plan_meta")
    .select("promo_title,promo_subtitle,yearly_save_percent")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (meta.error) throw meta.error;

  return {
    plans: (data ?? []).map((p: any) => ({
      id: p.code ?? p.id,
      name: p.name ?? "",
      tagline: p.tagline ?? "",
      monthlyPrice: Number(p.monthly_price ?? 0),
      yearlyPrice: Number(p.yearly_price ?? 0),
      popular: Boolean(p.popular),
      features: (p.subscription_plan_features ?? [])
        .sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((f: any) => ({ id: f.code ?? f.id, label: f.label ?? "" })),
    })),
    yearlySavePercent: Number(meta.data?.yearly_save_percent ?? 0),
    promoTitle: meta.data?.promo_title ?? "",
    promoSubtitle: meta.data?.promo_subtitle ?? "",
  };
}

export async function saveSubscriptionPlans(
  state: SubscriptionPlansState,
): Promise<SubscriptionPlansState> {
  for (const p of state.plans) {
    const row = await supabase
      .from("subscription_plans")
      .upsert(
        {
          code: p.id,
          name: p.name,
          tagline: p.tagline,
          monthly_price: p.monthlyPrice,
          yearly_price: p.yearlyPrice,
          popular: p.popular,
          sort_order: p.id === "basic" ? 0 : 1,
        },
        { onConflict: "code" },
      )
      .select("id")
      .single();

    if (row.error) throw row.error;

    for (const f of p.features) {
      const feature = await supabase
        .from("subscription_plan_features")
        .upsert(
          {
            id: f.id.length === 36 ? f.id : undefined,
            code: f.id,
            plan_id: row.data.id,
            label: f.label,
            sort_order: p.features.indexOf(f),
          },
          { onConflict: "plan_id,code" },
        );

      if (feature.error) throw feature.error;
    }
  }

  const m = await supabase
    .from("subscription_plan_meta")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (m.error) throw m.error;

  const metaPayload = {
    promo_title: state.promoTitle ?? "",
    promo_subtitle: state.promoSubtitle ?? "",
    yearly_save_percent: state.yearlySavePercent,
  };

  const metaResult = m.data
    ? await supabase.from("subscription_plan_meta").update(metaPayload).eq("id", m.data.id)
    : await supabase.from("subscription_plan_meta").insert(metaPayload);

  if (metaResult.error) throw metaResult.error;

  return getSubscriptionPlans();
}

export async function updateProPrices(monthlyPrice: number, yearlyPrice: number) {
  const state = await getSubscriptionPlans();
  const pro = state.plans.find((p) => p.id === "pro");
  if (!pro) throw new Error("Pro plan not found");
  pro.monthlyPrice = monthlyPrice;
  pro.yearlyPrice = yearlyPrice;
  return saveSubscriptionPlans(state);
}

export async function getProMonthlyPrice() {
  const s = await getSubscriptionPlans();
  return s.plans.find((p) => p.id === "pro")?.monthlyPrice ?? 0;
}
