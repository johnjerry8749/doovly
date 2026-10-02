/**
 * Verification applications service (admin)
 * ----------------------------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock data from src/data/verificationApplications.ts
 * LATER → swap function bodies to apiRequest("/admin/verification-applications...")
 *
 * Keep function names and return types stable when wiring the backend.
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

/** List all verification applications (admin). */
export function listVerificationApplications(): VerificationApplication[] {
  // TODO backend: return apiRequest<VerificationApplication[]>("/admin/verification-applications")
  return getMockVerificationApplications();
}

/** Get one application by id. */
export function getVerificationApplicationById(
  id: string,
): VerificationApplication | undefined {
  // TODO backend: return apiRequest<VerificationApplication>(`/admin/verification-applications/${id}`)
  return getMockVerificationApplications().find((a) => a.id === id);
}

/** Update status for a single application (verify / reject). */
export function updateVerificationStatus(
  id: string,
  status: VerificationStatus,
): VerificationApplication | undefined {
  // TODO backend: return apiRequest<VerificationApplication>(
  //   `/admin/verification-applications/${id}`,
  //   { method: "PATCH", body: JSON.stringify({ status }) },
  // )
  return updateMockVerificationStatus(id, status);
}

/** Bulk update status for multiple applications. */
export function bulkUpdateVerificationStatus(
  ids: string[],
  status: VerificationStatus,
): void {
  // TODO backend: return apiRequest("/admin/verification-applications/bulk",
  //   { method: "PATCH", body: JSON.stringify({ ids, status }) })
  bulkUpdateMockVerificationStatus(ids, status);
}
