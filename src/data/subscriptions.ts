/**
 * Mock subscription data for admin panel.
 * Built from src/data/professionals.ts so names match the rest of the app.
 * Swap listSubscriptions / updateSubscription in services/subscriptions.ts
 * to apiRequest when backend is ready.
 */

import { PROFESSIONALS } from "@/data/professionals";

export type SubscriptionPlan = "Pro" | "Free";
export type SubscriptionStatus = "Active" | "Expired" | "Cancelled";

export type SubscriptionUser = {
  id: string;
  professionalId: string;
  name: string;
  profession: string;
  location: string;
  avatar: number | { uri: string };
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Display string e.g. "Renews Oct 15, 2026" or "Joined Jul 5, 2026" */
  statusLabel: string;
  startDate: string;
  endDate: string;
  email?: string;
};

function buildFromProfessionals(): SubscriptionUser[] {
  return PROFESSIONALS.map((p, index) => {
    const isPro = p.subscribed;
    const plan: SubscriptionPlan = isPro ? "Pro" : "Free";
    // One Pro marked expired for UI variety (first subscribed that isn't free)
    const isExpired = isPro && p.id === "5"; // Emeka Okoro
    const status: SubscriptionStatus = isExpired
      ? "Expired"
      : "Active";

    const start = new Date(2025, 9, 15 - index * 5); // staggered
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    const startDate = fmt(start);
    const endDate = isPro ? fmt(end) : "—";

    let statusLabel: string;
    if (!isPro) {
      statusLabel = `Joined ${startDate}`;
    } else if (isExpired) {
      statusLabel = `Expired ${fmt(new Date(2026, 7, 12))}`;
    } else {
      statusLabel = `Renews ${endDate}`;
    }

    return {
      id: `sub-${p.id}`,
      professionalId: p.id,
      name: p.name,
      profession: p.profession,
      location: p.city,
      avatar: p.image,
      plan,
      status,
      statusLabel,
      startDate,
      endDate: isExpired ? fmt(new Date(2026, 7, 12)) : endDate,
      email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
    };
  });
}

let MOCK_SUBSCRIPTIONS: SubscriptionUser[] = buildFromProfessionals();

export function getMockSubscriptions(): SubscriptionUser[] {
  return [...MOCK_SUBSCRIPTIONS];
}

export function updateMockSubscription(
  id: string,
  patch: Partial<
    Pick<SubscriptionUser, "plan" | "status" | "statusLabel" | "endDate">
  >,
): SubscriptionUser | undefined {
  const idx = MOCK_SUBSCRIPTIONS.findIndex((s) => s.id === id);
  if (idx < 0) return undefined;
  MOCK_SUBSCRIPTIONS[idx] = { ...MOCK_SUBSCRIPTIONS[idx], ...patch };
  return MOCK_SUBSCRIPTIONS[idx];
}

export function getSubscriptionStats(list: SubscriptionUser[]) {
  const pro = list.filter((s) => s.plan === "Pro").length;
  const free = list.filter((s) => s.plan === "Free").length;
  return {
    total: list.length,
    pro,
    free,
    proGrowthPercent: 25,
  };
}
