/**
 * Bookings service
 * ----------------
 * Screens import ONLY from here.
 *
 * NOW  → reads mock data from src/data/booking.ts
 * LATER → swap the body of each function to call apiRequest("/bookings...")
 *
 * Do not change function names when you add the backend — only the insides.
 * Functions stay synchronous so the bookings screen does not need a loading rewrite.
 */

import {
  listBookedJobs as listBookedFromData,
  listReceivedJobs as listReceivedFromData,
  getBookingById as getBookingFromData,
  getProfessionalForBooking as getProfessionalFromData,
  BOOKED_FILTERS,
  RECEIVED_FILTERS,
  statusColors,
  type Booking,
  type BookingStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/data/booking";

export type { Booking, BookingStatus, PaymentMethod, PaymentStatus };

export { BOOKED_FILTERS, RECEIVED_FILTERS, statusColors };

/** Jobs the current user booked with a professional. */
export function listBookedJobs(): Booking[] {
  // TODO backend: return apiRequest<Booking[]>("/bookings?type=booked")
  return listBookedFromData();
}

/** Jobs the current user received as a professional. */
export function listReceivedJobs(): Booking[] {
  // TODO backend: return apiRequest<Booking[]>("/bookings?type=received")
  return listReceivedFromData();
}

export function getBookingById(
  id: string,
  type: "booked" | "received" = "booked",
): Booking | undefined {
  // TODO backend: return apiRequest<Booking>(`/bookings/${id}?type=${type}`)
  return getBookingFromData(id, type);
}

export function getProfessionalForBooking(booking: Booking) {
  // TODO backend: professional comes on the booking payload, or GET /professionals/:id
  return getProfessionalFromData(booking);
}
