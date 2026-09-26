/**
 * Bookings mock data
 * ------------------
 * Status lifecycle (UI):
 *   Pending → Ongoing   (professional accepts in chat)
 *   Pending → Declined  (professional declines in chat)
 *
 * Booked   = current user is the customer
 * Received = current user is the professional
 *
 * LATER: replace BOOKED_JOBS / RECEIVED_JOBS with API payloads.
 *        Keep Booking type + listBookedJobs / listReceivedJobs signatures.
 */

import { PROFESSIONALS } from "@/data/professionals";

/** Only statuses shown on the Bookings tab */
export type BookingStatus = "Pending" | "Ongoing" | "Declined";

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
  Ongoing: { bg: "#DBEAFE", text: "#2563EB" },
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
}): Booking {
  const professional = getProfessional(input.professionalId);
  if (!professional) {
    throw new Error(
      `Professional with ID "${input.professionalId}" was not found.`,
    );
  }
  const customer = getCustomer(input.customerId);

  return {
    id: input.id,
    professionalId: input.professionalId,
    customerId: input.customerId,
    title: input.title,
    professionalName: professional.name,
    professionalVerified: professional.verified,
    professionalImage: professional.image,
    customerName: customer.name,
    customerImage: customer.image,
    rating: input.rating,
    reviews: input.reviews,
    date: input.date,
    location: input.location,
    status: input.status,
    amount: input.amount,
  };
}

/** Booked by current user (customer u1) — Pending | Ongoing | Declined only */
export const BOOKED_JOBS: Booking[] = [
  createBooking({
    id: "b1",
    professionalId: "1",
    customerId: "u1",
    title: "Plumbing Installation",
    rating: 4.8,
    reviews: 126,
    date: "May 25, 2025 10:00 AM",
    location: "Lagos",
    status: "Pending",
    amount: 15400,
  }),
  createBooking({
    id: "b2",
    professionalId: "2",
    customerId: "u1",
    title: "Nail Extension",
    rating: 4.9,
    reviews: 89,
    date: "May 22, 2025 02:30 PM",
    location: "Lagos",
    status: "Ongoing",
    amount: 12500,
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

/** Received as professional (logged-in mock pro id = "1") */
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
    status: "Ongoing",
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
