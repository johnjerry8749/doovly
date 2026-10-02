/**
 * Admin subscription plans service
 * -------------------------------
 * Admin Settings imports from @/services/admin/subscriptionPlans
 * (save / price updates)
 *
 * User Subscription screen uses @/services/subscriptionPlans (read-only)
 *
 * NOW  → mock src/data/subscriptionPlans.ts
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
  // TODO: GET /admin/subscription-plans
  return getMockSubscriptionPlans();
}

export function saveSubscriptionPlans(
  state: SubscriptionPlansState,
): SubscriptionPlansState {
  // TODO: PUT /admin/subscription-plans
  return updateMockSubscriptionPlans(state);
}

export function updateProPrices(
  monthlyPrice: number,
  yearlyPrice: number,
): SubscriptionPlansState {
  // TODO: PUT /admin/subscription-plans/pro/prices
  return updateMockProPrices(monthlyPrice, yearlyPrice);
}

export function getProMonthlyPrice(): number {
  return getMockProMonthlyPrice();
}
