/**
 * Bookings service
 * ----------------
 * Screens import ONLY from here.
 *
 * NOW  → mock data from src/data/booking.ts
 * LATER → swap function bodies to apiRequest("/bookings...")
 *
 * Keep function names and return types stable when wiring the backend.
 *
 * Bookings tab list shows ONLY Accepted + Declined (no Pending, no Ongoing).
 * Accepted offers from service requests are recorded as Accepted.
 */

import {
  listBookedJobs as listBookedFromData,
  listReceivedJobs as listReceivedFromData,
  getBookingById as getBookingFromData,
  getProfessionalForBooking as getProfessionalFromData,
  statusColors,
  type Booking,
  type BookingStatus,
  appendAcceptedOfferBooking,
} from "@/data/booking";

export type { Booking, BookingStatus };

export { statusColors };

/** Bookings history filters: Accepted + Declined only (no Ongoing / Pending) */
export const BOOKING_LIST_STATUSES: BookingStatus[] = [
  "Accepted",
  "Declined",
];

function onlyListStatuses(jobs: Booking[]): Booking[] {
  return jobs.filter((j) => BOOKING_LIST_STATUSES.includes(j.status));
}

/** Jobs the current user booked (customer side). */
export function listBookedJobs(): Booking[] {
  // TODO backend: return apiRequest<Booking[]>("/bookings?role=customer")
  return onlyListStatuses(listBookedFromData());
}

/** Jobs the current user received (professional side). */
export function listReceivedJobs(): Booking[] {
  // TODO backend: return apiRequest<Booking[]>("/bookings?role=professional")
  return onlyListStatuses(listReceivedFromData());
}

export function getBookingById(
  id: string,
  type: "booked" | "received" = "booked",
): Booking | undefined {
  // TODO backend: return apiRequest<Booking>(`/bookings/${id}`)
  return getBookingFromData(id, type);
}

export function getProfessionalForBooking(booking: Booking) {
  // TODO backend: include professional on booking payload or GET /professionals/:id
  return getProfessionalFromData(booking);
}

/**
 * Record an accepted service-request offer into booking history (Accepted only).
 * Called from chat accept flow — never stores Pending offers here.
 */
export function recordAcceptedOfferBooking(input: {
  title: string;
  amount: number;
  location: string;
  professionalId: string;
  professionalName: string;
  professionalImage: number;
  customerId: string;
  customerName: string;
  customerImage: number;
}): Booking {
  return appendAcceptedOfferBooking(input);
}
