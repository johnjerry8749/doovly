/**
 * Shared bookings mock data.
 *
 * Bookings are connected to professionals using professionalId.
 *
 * This keeps PROFESSIONALS as the main source of truth for:
 * - Professional name
 * - Profile image
 * - Verification status
 *
 * Later:
 * Replace this mock data with API / database data.
 */

import { PROFESSIONALS } from "@/data/professionals";

// =========================
// TYPES
// =========================

export type BookingStatus =
  | "Upcoming"
  | "Ongoing"
  | "Completed"
  | "Cancelled"
  | "Pending"
  | "Accepted"
  | "Declined"
  | "Awaiting Approval";

export type PaymentMethod = "pay_now" | "pay_on_site";

export type PaymentStatus =
  | "held" // money is secured in Paystack until job is completed
  | "released" // money has been paid to the professional
  | "pay_on_site" // no online payment
  | "refunded"; // money returned to customer

export type Booking = {
  id: string;

  /**
   * ID of the professional this booking belongs to.
   *
   * This is the connection between Booking
   * and Professional.
   */
  professionalId: string;

  title: string;

  /**
   * These values are copied from PROFESSIONALS
   * when the mock booking is created.
   */
  providerName: string;
  verified: boolean;
  image: number;

  rating: number;
  reviews: number;

  date: string;
  location: string;
  status: BookingStatus;

  /**
   * How the customer chose to pay.
   * - pay_now: paid online, money secured by Paystack until job is completed
   * - pay_on_site: Pro subscribers only, pay the professional directly
   */
  paymentMethod: PaymentMethod;

  /**
   * Current state of the payment.
   */
  paymentStatus: PaymentStatus;

  /**
   * Amount in Naira (optional for display on cards).
   */
  amount?: number;
};

// =========================
// FILTERS
// =========================

export const BOOKED_FILTERS = [
  "All",
  "Upcoming",
  "Ongoing",
  "Awaiting Approval",
  "Completed",
  "Cancelled",
] as const;

export const RECEIVED_FILTERS = [
  "All",
  "Pending",
  "Accepted",
  "Ongoing",
  "Awaiting Approval",
  "Completed",
  "Declined",
] as const;

// =========================
// STATUS COLORS
// =========================

export const statusColors: Record<
  BookingStatus,
  {
    bg: string;
    text: string;
  }
> = {
  Upcoming: {
    bg: "#E8F8EF",
    text: "#16A34A",
  },

  Ongoing: {
    bg: "#E8F8EF",
    text: "#16A34A",
  },

  Completed: {
    bg: "#F3F4F6",
    text: "#6B7280",
  },

  Cancelled: {
    bg: "#FEE2E2",
    text: "#DC2626",
  },

  Pending: {
    bg: "#E8F8EF",
    text: "#16A34A",
  },

  Accepted: {
    bg: "#E8F8EF",
    text: "#16A34A",
  },

  Declined: {
    bg: "#FEE2E2",
    text: "#DC2626",
  },

  "Awaiting Approval": {
    bg: "#FFF4E5",
    text: "#D97706",
  },
};

// =========================
// HELPER
// =========================

/**
 * Get a professional from the professional mock
 * using the professional ID.
 */
function getProfessional(professionalId: string) {
  return PROFESSIONALS.find(
    (professional) => professional.id === professionalId,
  );
}

/**
 * Create a booking from a professional.
 *
 * This automatically gets:
 * - name
 * - verification
 * - image
 *
 * from PROFESSIONALS.
 */
function createBooking(booking: {
  id: string;
  professionalId: string;
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
  const professional = getProfessional(booking.professionalId);

  if (!professional) {
    throw new Error(
      `Professional with ID "${booking.professionalId}" was not found.`,
    );
  }

  return {
    id: booking.id,
    professionalId: booking.professionalId,
    title: booking.title,

    providerName: professional.name,
    verified: professional.verified,
    image: professional.image,

    rating: booking.rating,
    reviews: booking.reviews,

    date: booking.date,
    location: booking.location,
    status: booking.status,

    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    amount: booking.amount,
  };
}

// =========================
// JOBS I BOOKED
// CUSTOMER
// =========================

export const BOOKED_JOBS: Booking[] = [
  // ---------------------------------------
  // JOHN CHUKWUEMEKA
  // verified: FALSE
  // ---------------------------------------
  createBooking({
    id: "1",
    professionalId: "1",
    title: "Plumbing Installation",
    rating: 4.8,
    reviews: 126,
    date: "May 25, 2025 10:00 AM",
    location: "Lagos",
    status: "Upcoming",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 15400,
  }),

  // ---------------------------------------
  // CHIOMA EZE
  // verified: TRUE
  // ---------------------------------------
  createBooking({
    id: "2",
    professionalId: "2",
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

  // ---------------------------------------
  // IKECHUKWU OBI
  // verified: FALSE
  // ---------------------------------------
  createBooking({
    id: "3",
    professionalId: "3",
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

  // ---------------------------------------
  // BLESSING JOY
  // verified: TRUE
  // ---------------------------------------
  createBooking({
    id: "4",
    professionalId: "4",
    title: "Full Body Massage",
    rating: 4.9,
    reviews: 32,
    date: "May 20, 2025 04:00 PM",
    location: "Lagos",
    status: "Upcoming",
    paymentMethod: "pay_on_site",
    paymentStatus: "pay_on_site",
    amount: 18000,
  }),

  // ---------------------------------------
  // AISHA BELLO
  // verified: TRUE
  // ---------------------------------------
  createBooking({
    id: "5",
    professionalId: "6",
    title: "Haircut",
    rating: 4.8,
    reviews: 25,
    date: "May 23, 2025 01:00 PM",
    location: "Abuja",
    status: "Accepted",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 8500,
  }),

  // ---------------------------------------
  // Awaiting customer approval (demo)
  // ---------------------------------------
  createBooking({
    id: "6",
    professionalId: "2",
    title: "Nail Art Design",
    rating: 4.9,
    reviews: 89,
    date: "May 26, 2025 03:00 PM",
    location: "Lagos",
    status: "Awaiting Approval",
    paymentMethod: "pay_now",
    paymentStatus: "held",
    amount: 15400,
  }),
];

// =========================
// JOBS I RECEIVED
// PROVIDER
// =========================
//
// These are customers booking services.
// The professional associated with the job
// is still connected through professionalId.
//
// You can change the professional IDs later
// when your real booking API is ready.
// =========================

export const RECEIVED_JOBS: Booking[] = [
  // ---------------------------------------
  // CHIOMA EZE
  // verified: TRUE
  // ---------------------------------------
  createBooking({
    id: "1",
    professionalId: "2",
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

  // ---------------------------------------
  // BLESSING JOY
  // verified: TRUE
  // ---------------------------------------
  createBooking({
    id: "2",
    professionalId: "4",
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

  // ---------------------------------------
  // AISHA BELLO
  // verified: TRUE
  // ---------------------------------------
  createBooking({
    id: "3",
    professionalId: "6",
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

  // ---------------------------------------
  // Awaiting customer approval (demo)
  // ---------------------------------------
  createBooking({
    id: "4",
    professionalId: "2",
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
];

// =========================
// LIST BOOKED JOBS
// =========================

export function listBookedJobs(): Booking[] {
  return BOOKED_JOBS;
}

// =========================
// LIST RECEIVED JOBS
// =========================

export function listReceivedJobs(): Booking[] {
  return RECEIVED_JOBS;
}

// =========================
// GET BOOKING BY ID
// =========================

export function getBookingById(
  id: string,
  type: "booked" | "received" = "booked",
): Booking | undefined {
  const list = type === "booked" ? BOOKED_JOBS : RECEIVED_JOBS;

  return list.find((job) => job.id === String(id));
}

// =========================
// GET PROFESSIONAL FOR BOOKING
// =========================

export function getProfessionalForBooking(booking: Booking) {
  return PROFESSIONALS.find(
    (professional) => professional.id === booking.professionalId,
  );
}
