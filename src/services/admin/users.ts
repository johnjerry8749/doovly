/**
 * Admin users service
 * ------------------
 * Admin screens import from @/services/admin/users
 *
 * NOW  → mock from src/data/adminUsers.ts
 * LATER → apiRequest("/admin/users...")
 */

import {
  getMockAdminUsers,
  getMockAdminUserById,
  updateMockAdminUser,
  getAdminUserStats,
  type AdminUser,
  type VerificationStatus,
  type SubscriptionTier,
  type UserRole,
} from "@/data/adminUsers";

export type { AdminUser, VerificationStatus, SubscriptionTier, UserRole };
export { getAdminUserStats };

/** List all platform users (admin). */
export function listUsers(): AdminUser[] {
  // TODO backend: return apiRequest<AdminUser[]>("/admin/users")
  return getMockAdminUsers();
}

/** Get one user by id. */
export function getUserById(id: string): AdminUser | undefined {
  // TODO backend: return apiRequest<AdminUser>(`/admin/users/${id}`)
  return getMockAdminUserById(id);
}

/** Suspend a user. */
export function suspendUser(id: string): AdminUser | undefined {
  // TODO backend: PATCH /admin/users/:id { isSuspended: true }
  return updateMockAdminUser(id, { isSuspended: true });
}

/** Unsuspend a user. */
export function unsuspendUser(id: string): AdminUser | undefined {
  // TODO backend: PATCH /admin/users/:id { isSuspended: false }
  return updateMockAdminUser(id, { isSuspended: false });
}

/** Update user profile fields. */
export function updateUser(
  id: string,
  input: Partial<
    Pick<
      AdminUser,
      | "name"
      | "profession"
      | "email"
      | "phone"
      | "location"
      | "verificationStatus"
      | "subscription"
      | "role"
    >
  >,
): AdminUser | undefined {
  // TODO backend: PATCH /admin/users/:id
  return updateMockAdminUser(id, input);
}
