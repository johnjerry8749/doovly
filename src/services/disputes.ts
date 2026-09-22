/**
 * Disputes service
 * ----------------
 * Screens import ONLY from here.
 *
 * NOW  → reads mock data from src/data/disputes.ts
 * LATER → swap the body of each function to call apiRequest("/disputes...")
 *
 * Do not change function names when you add the backend — only the insides.
 */

import {
  listDisputes as listFromData,
  getDisputeById as getFromData,
  getOpenDisputes as getOpenFromData,
  getDisputesByBookingId as getByBookingFromData,
  DISPUTE_REASONS,
  type Dispute,
  type DisputeReason,
  type DisputeStatus,
  type AdminDecision,
} from "@/data/disputes";

export type { Dispute, DisputeReason, DisputeStatus, AdminDecision };

export { DISPUTE_REASONS };

export function listDisputes(): Dispute[] {
  // TODO backend: return apiRequest<Dispute[]>("/disputes")
  return listFromData();
}

export function getDisputeById(id: string): Dispute | undefined {
  // TODO backend: return apiRequest<Dispute>(`/disputes/${id}`)
  return getFromData(id);
}

export function getOpenDisputes(): Dispute[] {
  // TODO backend: return apiRequest<Dispute[]>("/disputes?status=open")
  return getOpenFromData();
}

export function getDisputesByBookingId(bookingId: string): Dispute[] {
  // TODO backend: return apiRequest<Dispute[]>(`/bookings/${bookingId}/disputes`)
  return getByBookingFromData(bookingId);
}
