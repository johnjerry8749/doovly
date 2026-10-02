/**
 * Mock admin users data.
 * Built from professionals so names/avatars stay consistent across the app.
 */

import { PROFESSIONALS } from "@/data/professionals";

export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Pro" | "Free";
export type UserRole = "admin" | "user" | "professional";

export type AdminUser = {
  id: string;
  name: string;
  profession: string;
  location: string;
  avatar: number | { uri: string };
  email: string;
  phone: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  subscription: SubscriptionTier;
  role: UserRole;
  memberSince: string;
  lastActive: string;
  isOnline: boolean;
  isSuspended: boolean;
};

function buildAdminUsers(): AdminUser[] {
  const lastActiveOptions = [
    "2 hours ago",
    "5 hours ago",
    "1 day ago",
    "3 days ago",
    "1 week ago",
    "Just now",
  ];
  const memberDates = [
    "Jan 12, 2025",
    "Feb 3, 2025",
    "Mar 18, 2025",
    "Apr 5, 2025",
    "May 22, 2025",
    "Jun 10, 2025",
  ];

  return PROFESSIONALS.map((p, index) => ({
    id: p.id,
    name: p.name,
    profession: p.profession,
    location: p.city,
    avatar: p.image,
    email: p.email,
    phone: p.phone,
    verified: p.verified,
    verificationStatus: p.verified
      ? "Verified"
      : index % 2 === 0
        ? "Pending"
        : "Rejected",
    subscription: p.subscribed ? "Pro" : "Free",
    role: (p.role as UserRole) || "user",
    memberSince: memberDates[index % memberDates.length],
    lastActive: lastActiveOptions[index % lastActiveOptions.length],
    isOnline: index < 3,
    isSuspended: false,
  }));
}

let MOCK_ADMIN_USERS: AdminUser[] = buildAdminUsers();

export function getMockAdminUsers(): AdminUser[] {
  return [...MOCK_ADMIN_USERS];
}

export function getMockAdminUserById(id: string): AdminUser | undefined {
  return MOCK_ADMIN_USERS.find((u) => u.id === id);
}

export function updateMockAdminUser(
  id: string,
  patch: Partial<
    Pick<
      AdminUser,
      | "isSuspended"
      | "verificationStatus"
      | "verified"
      | "subscription"
      | "role"
      | "name"
      | "profession"
      | "email"
      | "phone"
      | "location"
    >
  >,
): AdminUser | undefined {
  const idx = MOCK_ADMIN_USERS.findIndex((u) => u.id === id);
  if (idx < 0) return undefined;
  if (patch.verificationStatus === "Verified") {
    patch.verified = true;
  } else if (
    patch.verificationStatus === "Pending" ||
    patch.verificationStatus === "Rejected"
  ) {
    patch.verified = false;
  }
  MOCK_ADMIN_USERS[idx] = { ...MOCK_ADMIN_USERS[idx], ...patch };
  return MOCK_ADMIN_USERS[idx];
}

export function getAdminUserStats(list: AdminUser[]) {
  return {
    total: list.length,
    verified: list.filter((u) => u.verified).length,
    pro: list.filter((u) => u.subscription === "Pro").length,
    suspended: list.filter((u) => u.isSuspended).length,
  };
}
