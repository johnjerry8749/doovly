/**
 * Mock subscription data for admin panel.
 * Swap listSubscriptions / updateSubscription in services/subscriptions.ts
 * to apiRequest when backend is ready.
 */

export type SubscriptionPlan = "Pro" | "Free";
export type SubscriptionStatus = "Active" | "Expired" | "Cancelled";

export type SubscriptionUser = {
  id: string;
  name: string;
  profession: string;
  location: string;
  /** Local require() asset or remote URI string */
  avatar: number | { uri: string };
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Display string e.g. "Renews Oct 15, 2026" or "Joined Jul 5, 2026" */
  statusLabel: string;
  startDate: string; // ISO or display "Oct 15, 2025"
  endDate: string; // ISO or display "Oct 15, 2026"
  email?: string;
};

const AVATAR_1 = require("@/assets/profile_1.jpg");
const AVATAR_2 = require("@/assets/profile_2.jpg");
const AVATAR_3 = require("@/assets/profile_3.jpg");
const AVATAR_4 = require("@/assets/profile_4.jpg");

let MOCK_SUBSCRIPTIONS: SubscriptionUser[] = [
  {
    id: "sub-1",
    name: "Sarah Johnson",
    profession: "Product Designer",
    location: "Toronto, ON",
    avatar: AVATAR_1,
    plan: "Pro",
    status: "Active",
    statusLabel: "Renews Oct 15, 2026",
    startDate: "Oct 15, 2025",
    endDate: "Oct 15, 2026",
    email: "sarah.j@example.com",
  },
  {
    id: "sub-2",
    name: "Michael Chen",
    profession: "Software Engineer",
    location: "Vancouver, BC",
    avatar: AVATAR_2,
    plan: "Pro",
    status: "Active",
    statusLabel: "Renews Sep 28, 2026",
    startDate: "Sep 28, 2025",
    endDate: "Sep 28, 2026",
    email: "michael.c@example.com",
  },
  {
    id: "sub-3",
    name: "Priya Patel",
    profession: "Marketing Manager",
    location: "Calgary, AB",
    avatar: AVATAR_3,
    plan: "Pro",
    status: "Active",
    statusLabel: "Renews Nov 10, 2026",
    startDate: "Nov 10, 2025",
    endDate: "Nov 10, 2026",
    email: "priya.p@example.com",
  },
  {
    id: "sub-4",
    name: "James Wilson",
    profession: "UX Researcher",
    location: "Montreal, QC",
    avatar: AVATAR_4,
    plan: "Pro",
    status: "Expired",
    statusLabel: "Expired Aug 12, 2026",
    startDate: "Aug 12, 2025",
    endDate: "Aug 12, 2026",
    email: "james.w@example.com",
  },
  {
    id: "sub-5",
    name: "Emily Davis",
    profession: "Data Analyst",
    location: "Ottawa, ON",
    avatar: AVATAR_1,
    plan: "Free",
    status: "Active",
    statusLabel: "Joined Jul 5, 2026",
    startDate: "Jul 5, 2026",
    endDate: "—",
    email: "emily.d@example.com",
  },
  {
    id: "sub-6",
    name: "David Okoro",
    profession: "Electrician",
    location: "Toronto, ON",
    avatar: AVATAR_2,
    plan: "Pro",
    status: "Active",
    statusLabel: "Renews Dec 1, 2026",
    startDate: "Dec 1, 2025",
    endDate: "Dec 1, 2026",
    email: "david.o@example.com",
  },
];

export function getMockSubscriptions(): SubscriptionUser[] {
  return [...MOCK_SUBSCRIPTIONS];
}

export function updateMockSubscription(
  id: string,
  patch: Partial<Pick<SubscriptionUser, "plan" | "status" | "statusLabel" | "endDate">>,
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
    /** Mock growth % for Pro subscribers */
    proGrowthPercent: 25,
  };
}
