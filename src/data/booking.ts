/**
 * Shared bookings mock data.
 *
 * Flow (status lifecycle):
 *   Pending → Accepted → Ongoing → Awaiting Approval → Completed
 *   (or Cancelled / Declined at any early stage)
 *
 * Booked  = jobs the current user booked as a customer (see professional)
 * Received = jobs the current user received as a professional (see customer)
 *
 * LATER: Replace BOOKED_JOBS / RECEIVED_JOBS with API responses.
 *        Keep the Booking type and listBookedJobs / listReceivedJobs signatures.
 */

import { PROFESSIONALS } from "@/data/professionals";

// =========================
// TYPES
// =========================

export type BookingStatus =
  | "Pending"
  | "Accepted"
  | "Ongoing"
  | "Awaiting Approval"
  | "Completed"
  | "Cancelled"
  | "Declined";

export type PaymentMethod = "pay_now" | "pay_on_site";

export type PaymentStatus =
  | "held" // money secured in Paystack until job is completed
  | "released" // paid to the professional
  | "pay_on_site" // no online payment
  | "refunded";

export type Booking = {
  id: string;
  professionalId: string;
  customerId: string;
  title: string;

  /** Display: professional side (always filled) */
  professionalName: string;
  professionalVerified: boolean;
  professionalImage: number;

  /** Display: customer side (for Received tab) */
  customerName: string;
  customerImage: number;

  rating: number;
  reviews: number;

  date: string;
  location: string;
  status: BookingStatus;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount?: number;
};

// =========================
// STATUS COLORS
// =========================

export const statusColors: Record<
  BookingStatus,
  { bg: string; text: string }
> = {
  Pending: { bg: "#E8F8EF", text: "#16A34A" },
  Accepted: { bg: "#E8F8EF", text: "#16A34A" },
  Ongoing: { bg: "#E8F8EF", text: "#16A34A" },
  "Awaiting Approval": { bg: "#FFF4E5", text: "#D97706" },
  Completed: { bg: "#F3F4F6", text: "#6B7280" },
  Cancelled: { bg: "#FEE2E2", text: "#DC2626" },
  Declined: { bg: "#FEE2E2", text: "#DC2626" },
};

// =========================
// MOCK CUSTOMERS (for Received display + chat)
// =========================

const CUSTOMERS: Record<
  string,
  { name: string; image: number }
> = {
  u1: { name: "You", image: require("@/assets/profile_1.jpg") },
  u2: { name: "Ada Okafor", image: require("@/assets/profile_2.jpg") },
  u3: { name: "Tunde Adebayo", image: require("@/assets/profile_3.jpg") },
  u4: { name: "Chioma Nwosu", image: require("@/assets/profile_4.jpg") },
  u5: { name: "Blessing Kalu", image: require("@/assets/profile_1.jpg") },
};

// =========================
// HELPERS
// =========================

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
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
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
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    amount: input.amount,
  };
}

// =========================
// BOOKED (current user = customer u1)
// =========================

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
    paymentMethod: "pay_now",
    paymentStatus: "held",
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
    paymentMethod: "pay_now",
    paymentStatus: "held",
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
    status: "Completed",
    paymentMethod: "pay_now",
    paymentStatus: "released",
    amount: 28000,
  }),
  createBooking({
    id: "b4",
    professionalId: "4",
    customerId: "u1",
    title: "Full Body Massage",
    rating: 4.9,
    reviews: 32,
    date: "May 20, 2025 04:00 PM",
    location: "Lagos",
    status: "Accepted",
    paymentMethod: "pay_on_site",
    paymentStatus: "pay_on_site",
    amount: 18000,
  }),
  createBooking({
    id: "b5",
    professionalId: "6",
    customerId: "u1",
    title: "Haircut",
    rating: 4.8,
    reviews: 25,
    date: "May 23, 2025 01:00 PM",
    location: "Abuja",
    status: "Awaiting Approval",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 8500,
  }),
  createBooking({
    id: "b6",
    professionalId: "2",
    customerId: "u1",
    title: "Nail Art Design",
    rating: 4.9,
    reviews: 89,
    date: "May 26, 2025 03:00 PM",
    location: "Lagos",
    status: "Cancelled",
    paymentMethod: "pay_now",
    paymentStatus: "refunded",
    amount: 15400,
  }),
];

// =========================
// RECEIVED (current user acts as professional)
// =========================

export const RECEIVED_JOBS: Booking[] = [
  createBooking({
    id: "r1",
    professionalId: "2",
    customerId: "u2",
    title: "House Cleaning",
    rating: 5.0,
    reviews: 12,
    date: "May 28, 2025 09:00 AM",
    location: "Lagos",
    status: "Pending",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 15400,
  }),
  createBooking({
    id: "r2",
    professionalId: "4",
    customerId: "u3",
    title: "AC Repair",
    rating: 4.8,
    reviews: 20,
    date: "May 27, 2025 02:30 PM",
    location: "Lagos",
    status: "Ongoing",
    paymentMethod: "pay_on_site",
    paymentStatus: "pay_on_site",
    amount: 22000,
  }),
  createBooking({
    id: "r3",
    professionalId: "6",
    customerId: "u4",
    title: "Furniture Assembly",
    rating: 4.9,
    reviews: 8,
    date: "May 24, 2025 11:00 AM",
    location: "Abuja",
    status: "Completed",
    paymentMethod: "pay_now",
    paymentStatus: "released",
    amount: 12000,
  }),
  createBooking({
    id: "r4",
    professionalId: "2",
    customerId: "u5",
    title: "Deep Cleaning",
    rating: 5.0,
    reviews: 12,
    date: "May 29, 2025 10:00 AM",
    location: "Lagos",
    status: "Awaiting Approval",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 15400,
  }),
  createBooking({
    id: "r5",
    professionalId: "1",
    customerId: "u3",
    title: "Drain Cleaning",
    rating: 4.6,
    reviews: 9,
    date: "May 21, 2025 03:00 PM",
    location: "Lagos",
    status: "Accepted",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 10000,
  }),
];

// =========================
// LIST / GET (same signatures for API swap)
// =========================

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
