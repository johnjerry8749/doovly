/**
 * Subscription plans service
 * -------------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock (src/data/subscriptionPlans.ts)
 * LATER → apiRequest GET/PUT /admin/subscription-plans
 */

import {
  getMockSubscriptionPlans,
  updateMockSubscriptionPlans,
  updateProPrices as updateMockProPrices,
  getProMonthlyPrice as getMockProMonthlyPrice,
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

export function getSubscriptionPlans(): SubscriptionPlansState {
  // TODO: return apiRequest<SubscriptionPlansState>("/admin/subscription-plans")
  return getMockSubscriptionPlans();
}

export function saveSubscriptionPlans(
  state: SubscriptionPlansState,
): SubscriptionPlansState {
  // TODO: return apiRequest("/admin/subscription-plans", { method: "PUT", body: state })
  return updateMockSubscriptionPlans(state);
}

export function updateProPrices(
  monthlyPrice: number,
  yearlyPrice: number,
): SubscriptionPlansState {
  // TODO: apiRequest PUT /admin/subscription-plans/pro/prices
  return updateMockProPrices(monthlyPrice, yearlyPrice);
}

export function getProMonthlyPrice(): number {
  return getMockProMonthlyPrice();
}
