/**
 * Bookings mock data
 * ------------------
 * DB parity: public.bookings (mock_id b1–b3, r1–r3) — see seed.sql
 * Status in DB is lowercase; map with bookingStatusToApp/ToDb in src/lib/mappers.ts
 *
 * Status lifecycle (UI):
 *   Pending → Accepted  (professional accepts in chat)
 *   Pending → Declined  (professional declines in chat)
 *
 * Bookings history list shows Pending + Accepted + Declined.
 *
 * Booked   = current user is the customer (u1)
 * Received = current user is the professional (id "1")
 *
 * LATER: replace BOOKED_JOBS / RECEIVED_JOBS with API payloads.
 */

import { PROFESSIONALS } from "@/data/professionals";

export type BookingStatus = "Pending" | "Accepted" | "Declined";

export type Booking = {
  id: string;
  professionalId: string;
  customerId: string;
  title: string;
  professionalName: string;
  professionalVerified: boolean;
  professionalImage: number;
  customerName: string;
  customerImage: number;
  rating: number;
  reviews: number;
  date: string;
  location: string;
  status: BookingStatus;
  amount?: number;
};

export const statusColors: Record<
  BookingStatus,
  { bg: string; text: string }
> = {
  Pending: { bg: "#E8F8EF", text: "#16A34A" },
  Accepted: { bg: "#DBEAFE", text: "#2563EB" },
  Declined: { bg: "#FEE2E2", text: "#DC2626" },
};

const CUSTOMERS: Record<string, { name: string; image: number }> = {
  u1: { name: "You", image: require("@/assets/profile_1.jpg") },
  u2: { name: "Ada Okafor", image: require("@/assets/profile_2.jpg") },
  u3: { name: "Tunde Adebayo", image: require("@/assets/profile_3.jpg") },
  u4: { name: "Chioma Nwosu", image: require("@/assets/profile_4.jpg") },
};

function getProfessional(professionalId: string) {
  return PROFESSIONALS.find((p) => p.id === professionalId);
}

function getCustomer(customerId: string) {
  return (
    CUSTOMERS[customerId] ?? {
      name: "Customer",
      image: require("@/assets/profile_1.jpg"),
    }
  );
}

function createBooking(input: {
  id: string;
  professionalId: string;
  customerId: string;
  title: string;
  rating: number;
  reviews: number;
  date: string;
  location: string;
  status: BookingStatus;
  amount?: number;
  professionalName?: string;
  professionalImage?: number;
  professionalVerified?: boolean;
  customerName?: string;
  customerImage?: number;
}): Booking {
  const professional = getProfessional(input.professionalId);
  const customer = getCustomer(input.customerId);

  return {
    id: input.id,
    professionalId: input.professionalId,
    customerId: input.customerId,
    title: input.title,
    professionalName:
      input.professionalName ?? professional?.name ?? "Professional",
    professionalVerified:
      input.professionalVerified ?? professional?.verified ?? false,
    professionalImage:
      input.professionalImage ??
      professional?.image ??
      require("@/assets/profile_1.jpg"),
    customerName: input.customerName ?? customer.name,
    customerImage: input.customerImage ?? customer.image,
    rating: input.rating,
    reviews: input.reviews,
    date: input.date,
    location: input.location,
    status: input.status,
    amount: input.amount,
  };
}

/**
 * Booked = you hired someone else (professionalId ≠ "1")
 * You are the customer → Open Chat + Cancel (Pending); no Accept/Decline
 */
export const BOOKED_JOBS: Booking[] = [
  createBooking({
    id: "b1",
    professionalId: "2", // Chioma — NOT you
    customerId: "u1",
    title: "Nail Extension",
    rating: 4.9,
    reviews: 89,
    date: "May 25, 2025 10:00 AM",
    location: "Lagos",
    status: "Pending",
    amount: 15400,
  }),
  createBooking({
    id: "b2",
    professionalId: "4",
    customerId: "u1",
    title: "Full Body Massage",
    rating: 4.9,
    reviews: 32,
    date: "May 22, 2025 02:30 PM",
    location: "Lagos",
    status: "Accepted",
    amount: 18000,
  }),
  createBooking({
    id: "b3",
    professionalId: "3",
    customerId: "u1",
    title: "Car Repair",
    rating: 4.7,
    reviews: 64,
    date: "May 18, 2025 11:00 AM",
    location: "Abuja",
    status: "Declined",
    amount: 28000,
  }),
];

/**
 * Received = customers hired YOU (professionalId "1")
 * You are the pro → Open Chat; Accept/Decline only in chat when Pending
 */
export const RECEIVED_JOBS: Booking[] = [
  createBooking({
    id: "r1",
    professionalId: "1",
    customerId: "u2",
    title: "House Cleaning",
    rating: 5.0,
    reviews: 12,
    date: "May 28, 2025 09:00 AM",
    location: "Lagos",
    status: "Pending",
    amount: 15400,
  }),
  createBooking({
    id: "r2",
    professionalId: "1",
    customerId: "u3",
    title: "AC Repair",
    rating: 4.8,
    reviews: 20,
    date: "May 27, 2025 02:30 PM",
    location: "Lagos",
    status: "Accepted",
    amount: 22000,
  }),
  createBooking({
    id: "r3",
    professionalId: "1",
    customerId: "u4",
    title: "Furniture Assembly",
    rating: 4.9,
    reviews: 8,
    date: "May 24, 2025 11:00 AM",
    location: "Abuja",
    status: "Declined",
    amount: 12000,
  }),
];

export function listBookedJobs(): Booking[] {
  return BOOKED_JOBS;
}

export function listReceivedJobs(): Booking[] {
  return RECEIVED_JOBS;
}

export function getBookingById(
  id: string,
  type: "booked" | "received" = "booked",
): Booking | undefined {
  const list = type === "booked" ? BOOKED_JOBS : RECEIVED_JOBS;
  return list.find((job) => job.id === String(id));
}

export function getProfessionalForBooking(booking: Booking) {
  return PROFESSIONALS.find(
    (professional) => professional.id === booking.professionalId,
  );
}

/**
 * Push an accepted service-request offer into history as Accepted only.
 * Never stores Pending offers here.
 */
export function appendAcceptedOfferBooking(input: {
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
  const id = `offer-accepted-${Date.now()}`;
  const date = new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const booking = createBooking({
    id,
    professionalId: input.professionalId,
    customerId: input.customerId,
    title: input.title,
    rating: 5.0,
    reviews: 0,
    date,
    location: input.location,
    status: "Accepted",
    amount: input.amount,
    professionalName: input.professionalName,
    professionalImage: input.professionalImage,
    professionalVerified: false,
    customerName: input.customerName,
    customerImage: input.customerImage,
  });

  // Place on the correct side of history for the current mock user (u1 / pro 1)
  const currentProId = "1";
  if (String(input.professionalId) === currentProId) {
    RECEIVED_JOBS.unshift(booking);
  } else if (String(input.customerId) === "u1") {
    BOOKED_JOBS.unshift(booking);
  } else {
    RECEIVED_JOBS.unshift(booking);
  }

  return booking;
}
