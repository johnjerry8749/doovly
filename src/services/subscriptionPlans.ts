/**
 * User-facing subscription plans (read-only)
 * -----------------------------------------
 * Profile Subscription screen imports from here.
 *
 * Admin edits live in @/services/admin/subscriptionPlans
 * Both share the same mock data (src/data/subscriptionPlans.ts).
 *
 * LATER: GET /subscription-plans (public) vs admin PUT routes.
 */

import {
  getMockSubscriptionPlans,
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

/** Public plan catalog for the upgrade screen. */
export function getSubscriptionPlans(): SubscriptionPlansState {
  // TODO: return apiRequest<SubscriptionPlansState>("/subscription-plans")
  return getMockSubscriptionPlans();
}

export function getProMonthlyPrice(): number {
  return getMockProMonthlyPrice();
}
