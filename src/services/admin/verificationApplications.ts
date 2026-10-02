/**
 * Admin verification applications service
 * --------------------------------------
 * Admin screens import from @/services/admin/verificationApplications
 *
 * NOW  → mock from src/data/verificationApplications.ts
 * LATER → apiRequest("/admin/verification-applications...")
 */

import {
  getMockVerificationApplications,
  updateMockVerificationStatus,
  bulkUpdateMockVerificationStatus,
  getVerificationStats,
  type VerificationApplication,
  type VerificationStatus,
  type VerificationDocument,
} from "@/data/verificationApplications";

export type {
  VerificationApplication,
  VerificationStatus,
  VerificationDocument,
};

export { getVerificationStats };

export function listVerificationApplications(): VerificationApplication[] {
  // TODO backend: GET /admin/verification-applications
  return getMockVerificationApplications();
}

export function getVerificationApplicationById(
  id: string,
): VerificationApplication | undefined {
  // TODO backend: GET /admin/verification-applications/:id
  return getMockVerificationApplications().find((a) => a.id === id);
}

export function updateVerificationStatus(
  id: string,
  status: VerificationStatus,
): VerificationApplication | undefined {
  // TODO backend: PATCH /admin/verification-applications/:id
  return updateMockVerificationStatus(id, status);
}

export function bulkUpdateVerificationStatus(
  ids: string[],
  status: VerificationStatus,
): void {
  // TODO backend: PATCH /admin/verification-applications/bulk
  bulkUpdateMockVerificationStatus(ids, status);
}
