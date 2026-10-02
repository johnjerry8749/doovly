/**
 * Admin subscriptions service
 * --------------------------
 * Admin screens import from @/services/admin/subscriptions
 *
 * NOW  → mock from src/data/subscriptions.ts
 * LATER → apiRequest("/admin/subscriptions...")
 */

import {
  getMockSubscriptions,
  updateMockSubscription,
  getSubscriptionStats,
  type SubscriptionUser,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/data/subscriptions";

export type { SubscriptionUser, SubscriptionPlan, SubscriptionStatus };
export { getSubscriptionStats };

/** List all user subscriptions (admin). */
export function listSubscriptions(): SubscriptionUser[] {
  // TODO backend: return apiRequest<SubscriptionUser[]>("/admin/subscriptions")
  return getMockSubscriptions();
}

/** Get one subscription by id. */
export function getSubscriptionById(id: string): SubscriptionUser | undefined {
  // TODO backend: return apiRequest<SubscriptionUser>(`/admin/subscriptions/${id}`)
  return getMockSubscriptions().find((s) => s.id === id);
}

/** Update plan and/or status for a subscription. */
export function updateSubscription(
  id: string,
  input: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
  },
): SubscriptionUser | undefined {
  // TODO backend: PATCH /admin/subscriptions/:id
  const patch: Parameters<typeof updateMockSubscription>[1] = { ...input };

  if (input.plan === "Free") {
    patch.statusLabel = "Joined (Free)";
    patch.endDate = "—";
  } else if (input.plan === "Pro" && input.status !== "Expired") {
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    const label = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    patch.statusLabel = `Renews ${label}`;
    patch.endDate = label;
  }

  if (input.status === "Expired") {
    patch.statusLabel = `Expired ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } else if (input.status === "Cancelled") {
    patch.statusLabel = "Cancelled";
  }

  return updateMockSubscription(id, patch);
}
