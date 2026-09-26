/**
 * Bookings service
 * ----------------
 * Screens import ONLY from here.
 *
 * NOW  → mock data from src/data/booking.ts
 * LATER → swap function bodies to apiRequest("/bookings...")
 *
 * Keep function names and return types stable when wiring the backend.
 */

import {
  listBookedJobs as listBookedFromData,
  listReceivedJobs as listReceivedFromData,
  getBookingById as getBookingFromData,
  getProfessionalForBooking as getProfessionalFromData,
  statusColors,
  type Booking,
  type BookingStatus,
} from "@/data/booking";

export type { Booking, BookingStatus };

export { statusColors };

/** Active list statuses on Bookings tab */
export const BOOKING_LIST_STATUSES: BookingStatus[] = [
  "Pending",
  "Ongoing",
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
