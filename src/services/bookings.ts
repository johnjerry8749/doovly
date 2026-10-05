/**
 * Bookings service
 * ----------------
 * Screens import ONLY from here.
 * Same function names + return shapes — no UI changes.
 */

import { supabase } from "@/lib/supabase";
import { mapBookingRow, BOOKING_SELECT } from "@/lib/rowMappers";
import { bookingStatusToDb } from "@/lib/mappers";
import { toUuid, MOCK_SESSION, tryToUuid } from "@/lib/ids";
import type { Booking, BookingStatus } from "@/data/booking";
import { statusColors } from "@/data/booking";
import {
  ensureProfessionalsLoaded,
  getProfessionalById,
} from "@/services/professionals";

export type { Booking, BookingStatus };
export { statusColors };

export const BOOKING_LIST_STATUSES: BookingStatus[] = [
  "Pending",
  "Accepted",
  "Declined",
];

let bookedCache: Booking[] | null = null;
let receivedCache: Booking[] | null = null;
let loadPromise: Promise<void> | null = null;

function onlyListStatuses(jobs: Booking[]): Booking[] {
  return jobs.filter((j) => BOOKING_LIST_STATUSES.includes(j.status));
}

async function resolveCurrentIds(): Promise<{
  userUuid: string;
  userMockId: string;
  proUuid: string | null;
  proMockId: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userUuid: MOCK_SESSION.userUuid,
      userMockId: MOCK_SESSION.userMockId,
      proUuid: MOCK_SESSION.professionalUuid,
      proMockId: MOCK_SESSION.professionalMockId,
    };
  }

  const { data: pro } = await supabase
    .from("professionals")
    .select("id, mock_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userUuid: user.id,
    userMockId: MOCK_SESSION.userMockId,
    proUuid: pro?.id ?? null,
    proMockId: pro?.mock_id ?? null,
  };
}

async function fetchBookings(): Promise<void> {
  await ensureProfessionalsLoaded();
  const ids = await resolveCurrentIds();

  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const all = (data ?? []).map(mapBookingRow);
  const userMock = ids.userMockId;
  const proMock = ids.proMockId;

  bookedCache = onlyListStatuses(
    all.filter((b) => String(b.customerId) === String(userMock)),
  );
  receivedCache = onlyListStatuses(
    proMock
      ? all.filter((b) => String(b.professionalId) === String(proMock))
      : [],
  );
}

export async function ensureBookingsLoaded(): Promise<void> {
  if (bookedCache && receivedCache) return;
  if (!loadPromise) {
    loadPromise = fetchBookings().finally(() => {
      loadPromise = null;
    });
  }
  await loadPromise;
}

export function invalidateBookingsCache() {
  bookedCache = null;
  receivedCache = null;
}

/** Jobs the current user booked (customer side). */
export function listBookedJobs(): Booking[] {
  if (!bookedCache) void ensureBookingsLoaded();
  return bookedCache ?? [];
}

export async function listBookedJobsAsync(): Promise<Booking[]> {
  await ensureBookingsLoaded();
  return bookedCache ?? [];
}

/** Jobs the current user received (professional side). */
export function listReceivedJobs(): Booking[] {
  if (!receivedCache) void ensureBookingsLoaded();
  return receivedCache ?? [];
}

export async function listReceivedJobsAsync(): Promise<Booking[]> {
  await ensureBookingsLoaded();
  return receivedCache ?? [];
}

export function getBookingById(
  id: string,
  type: "booked" | "received" = "booked",
): Booking | undefined {
  const list = type === "booked" ? listBookedJobs() : listReceivedJobs();
  return list.find((job) => job.id === String(id));
}

export function getProfessionalForBooking(booking: Booking) {
  return getProfessionalById(booking.professionalId);
}

/**
 * Record an accepted service-request offer into booking history.
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
  const displayDate = new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const optimistic: Booking = {
    id: `offer-accepted-${Date.now()}`,
    professionalId: input.professionalId,
    customerId: input.customerId,
    title: input.title,
    professionalName: input.professionalName,
    professionalVerified: false,
    professionalImage: input.professionalImage,
    customerName: input.customerName,
    customerImage: input.customerImage,
    rating: 5,
    reviews: 0,
    date: displayDate,
    location: input.location,
    status: "Accepted",
    amount: input.amount,
  };

  if (receivedCache) receivedCache.unshift(optimistic);
  if (bookedCache) bookedCache.unshift(optimistic);

  void (async () => {
    try {
      const proUuid = toUuid("professional", input.professionalId);
      const customerUuid =
        tryToUuid("user", input.customerId) ?? MOCK_SESSION.userUuid;

      await supabase.from("bookings").insert({
        customer_id: customerUuid,
        professional_id: proUuid,
        title: input.title,
        professional_name: input.professionalName,
        customer_name: input.customerName,
        status: "accepted",
        amount: input.amount,
        location: input.location,
        display_date: displayDate,
        rating: 5,
        reviews_count: 0,
      });
      invalidateBookingsCache();
    } catch (err) {
      console.warn("[recordAcceptedOfferBooking]", err);
    }
  })();

  return optimistic;
}

/** Update booking status (accept / decline in chat). */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<Booking | null> {
  const uuid = tryToUuid("booking", bookingId) ?? bookingId;

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: bookingStatusToDb(status) })
    .or(`id.eq.${uuid},mock_id.eq.${bookingId}`)
    .select(BOOKING_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  invalidateBookingsCache();
  return mapBookingRow(data);
}
