/**
 * Profile subscription plans (Basic + Pro)
 * ----------------------------------------
 * Single source of truth for prices & features.
 * Admin Settings edits this mock; user Subscription screen reads it.
 *
 * Later: load/save via API (GET/PUT /admin/subscription-plans).
 */

export type BillingPeriod = "monthly" | "yearly";

export type PlanFeature = {
  id: string;
  label: string;
};

export type SubscriptionPlanConfig = {
  id: "basic" | "pro";
  name: string;
  tagline: string;
  /** NGN */
  monthlyPrice: number;
  /** NGN */
  yearlyPrice: number;
  features: PlanFeature[];
  popular?: boolean;
};

export type SubscriptionPlansState = {
  plans: SubscriptionPlanConfig[];
  /** Banner on subscription screen */
  promoTitle: string;
  promoSubtitle: string;
  yearlySavePercent: number;
};

const defaultPlans: SubscriptionPlanConfig[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Get started for free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { id: "b1", label: "Basic profile" },
      { id: "b2", label: "Browse service requests" },
      { id: "b3", label: "Limited applications (5 per month)" },
      { id: "b4", label: "Basic job filters" },
      { id: "b5", label: "Community support" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlock more opportunities",
    monthlyPrice: 2500,
    yearlyPrice: 25000,
    popular: true,
    features: [
      { id: "p1", label: "Verified / featured profile" },
      { id: "p2", label: "Unlimited applications" },
      { id: "p3", label: "Advanced job filters" },
      { id: "p4", label: "Priority nearby job alerts" },
      { id: "p5", label: "Earnings & performance dashboard" },
      { id: "p6", label: "Portfolio boost" },
      { id: "p7", label: "Dedicated support" },
    ],
  },
];

let MOCK_PLANS: SubscriptionPlansState = {
  plans: defaultPlans.map((p) => ({
    ...p,
    features: p.features.map((f) => ({ ...f })),
  })),
  promoTitle: "Unlock more opportunities",
  promoSubtitle:
    "Upgrade to get advanced tools, more visibility and grow your business faster.",
  yearlySavePercent: 17,
};

export function getMockSubscriptionPlans(): SubscriptionPlansState {
  return {
    ...MOCK_PLANS,
    plans: MOCK_PLANS.plans.map((p) => ({
      ...p,
      features: p.features.map((f) => ({ ...f })),
    })),
  };
}

export function updateMockSubscriptionPlans(
  patch: Partial<SubscriptionPlansState>,
): SubscriptionPlansState {
  if (patch.plans) {
    MOCK_PLANS.plans = patch.plans.map((p) => ({
      ...p,
      features: p.features.map((f) => ({ ...f })),
    }));
  }
  if (patch.promoTitle !== undefined) MOCK_PLANS.promoTitle = patch.promoTitle;
  if (patch.promoSubtitle !== undefined)
    MOCK_PLANS.promoSubtitle = patch.promoSubtitle;
  if (patch.yearlySavePercent !== undefined)
    MOCK_PLANS.yearlySavePercent = patch.yearlySavePercent;
  return getMockSubscriptionPlans();
}

/** Update Pro monthly / yearly prices only (common admin action). */
export function updateProPrices(
  monthlyPrice: number,
  yearlyPrice: number,
): SubscriptionPlansState {
  MOCK_PLANS.plans = MOCK_PLANS.plans.map((p) =>
    p.id === "pro" ? { ...p, monthlyPrice, yearlyPrice } : p,
  );
  return getMockSubscriptionPlans();
}

export function getProMonthlyPrice(): number {
  const pro = MOCK_PLANS.plans.find((p) => p.id === "pro");
  return pro?.monthlyPrice ?? 2500;
}
