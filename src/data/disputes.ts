/**
 * Mock dispute / report issue data.
 *
 * Later: replace this with API / database data.
 */

export type DisputeStatus =
  | "Open"
  | "Under Review"
  | "Resolved"
  | "Closed";

export type DisputeReason =
  | "Work not completed"
  | "Poor quality"
  | "Different from agreement"
  | "Professional was late"
  | "Other";

export type AdminDecision =
  | "release_to_professional"
  | "full_refund"
  | "partial_refund"
  | "keep_held"
  | null;

export type Dispute = {
  id: string;
  bookingId: string;
  professionalId: string;
  customerName: string;
  professionalName: string;
  serviceTitle: string;
  amountHeld: number;
  reason: DisputeReason;
  description: string;
  photos?: string[];
  status: DisputeStatus;
  adminDecision: AdminDecision;
  adminNote?: string;
  customerGets?: number;
  professionalGets?: number;
  createdAt: string;
  resolvedAt?: string;
};

export const DISPUTE_REASONS: DisputeReason[] = [
  "Work not completed",
  "Poor quality",
  "Different from agreement",
  "Professional was late",
  "Other",
];

export const DISPUTES: Dispute[] = [
  {
    id: "DSP-2026-0042",
    bookingId: "6",
    professionalId: "2",
    customerName: "Chioma Eze",
    professionalName: "Blessing Joy",
    serviceTitle: "Nail Art Design",
    amountHeld: 12400,
    reason: "Poor quality",
    description:
      "The nail art done by the professional did not meet the agreed design and quality. The nails are uneven and not what I requested.",
    status: "Open",
    adminDecision: null,
    createdAt: "2026-05-26T15:30:00Z",
  },
  {
    id: "DSP-2026-0041",
    bookingId: "3",
    professionalId: "3",
    customerName: "Ikechukwu Obi",
    professionalName: "John Chukwuemeka",
    serviceTitle: "Car Repair",
    amountHeld: 45000,
    reason: "Work not completed",
    description: "The mechanic left without finishing the brake pads.",
    status: "Under Review",
    adminDecision: null,
    createdAt: "2026-05-25T11:00:00Z",
  },
  {
    id: "DSP-2026-0039",
    bookingId: "2",
    professionalId: "4",
    customerName: "Aisha Bello",
    professionalName: "Blessing Joy",
    serviceTitle: "Full Body Massage",
    amountHeld: 15000,
    reason: "Different from agreement",
    description: "Session was much shorter than booked.",
    status: "Resolved",
    adminDecision: "partial_refund",
    customerGets: 7000,
    professionalGets: 8000,
    adminNote: "Customer and pro agreed on partial refund.",
    createdAt: "2026-05-20T09:00:00Z",
    resolvedAt: "2026-05-21T14:20:00Z",
  },
];

export function listDisputes(): Dispute[] {
  return DISPUTES;
}

export function getDisputeById(id: string): Dispute | undefined {
  return DISPUTES.find((d) => d.id === id);
}

export function getOpenDisputes(): Dispute[] {
  return DISPUTES.filter(
    (d) => d.status === "Open" || d.status === "Under Review",
  );
}

export function getDisputesByBookingId(bookingId: string): Dispute[] {
  return DISPUTES.filter((d) => d.bookingId === String(bookingId));
}
