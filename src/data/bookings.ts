/**
 * Booking data layer
 * -----------------
 * Right now this is MOCK data.
 * Later: replace fetchBookings() / fetchBookingById() with real API / Supabase / Postgres calls.
 * The UI screens only talk to these functions — never hardcode rows inside components.
 */

export type BookingStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type BookingSide = "booked" | "received"; // Jobs I Booked vs Jobs I Received

export type Booking = {
  id: string;
  serviceName: string;
  professionalName: string;
  professionalAvatar?: string | number; // require() or remote URL later
  professionalId: string;
  dateLabel: string; // e.g. "May 25  10:00 AM"
  dateISO: string;
  status: BookingStatus;
  side: BookingSide;
  address: string;
  duration: string;
  price: string;
  paymentStatus: "Paid" | "Unpaid" | "Refunded";
  notes?: string;
};

// ---------- MOCK DATA (replace with DB) ----------
const MOCK_BOOKINGS: Booking[] = [
  {
    id: "DOO-1024",
    serviceName: "Plumbing Installation",
    professionalName: "Adebayo Williams",
    professionalId: "pro-1",
    professionalAvatar: require("@/assets/profile_1.jpg"),
    dateLabel: "May 25  10:00 AM",
    dateISO: "2025-05-25T10:00:00",
    status: "upcoming",
    side: "booked",
    address: "23 Adeola Odeku St, Victoria Island, Lagos",
    duration: "2 hours",
    price: "₦25,000",
    paymentStatus: "Paid",
    notes:
      "Please check the kitchen sink and bathroom pipes. Customer will be available at home.",
  },
  {
    id: "DOO-1025",
    serviceName: "Nail Extension",
    professionalName: "Chioma Eze",
    professionalId: "pro-2",
    professionalAvatar: require("@/assets/profile_2.jpg"),
    dateLabel: "May 22  02:30 PM",
    dateISO: "2025-05-22T14:30:00",
    status: "ongoing",
    side: "booked",
    address: "15 Allen Avenue, Ikeja, Lagos",
    duration: "1.5 hours",
    price: "₦12,000",
    paymentStatus: "Paid",
    notes: "Prefer nude colours.",
  },
  {
    id: "DOO-1020",
    serviceName: "Car Repair",
    professionalName: "Ikechukwu Obi",
    professionalId: "pro-3",
    professionalAvatar: require("@/assets/profile_3.jpg"),
    dateLabel: "May 18  11:00 AM",
    dateISO: "2025-05-18T11:00:00",
    status: "completed",
    side: "booked",
    address: "Lekki Phase 1, Lagos",
    duration: "3 hours",
    price: "₦35,000",
    paymentStatus: "Paid",
  },
  // Example of a job the current user RECEIVED (they are the pro)
  {
    id: "DOO-1101",
    serviceName: "Pipe Repair",
    professionalName: "Ada Okafor", // customer name when side=received
    professionalId: "cust-1",
    professionalAvatar: require("@/assets/profile_4.jpg"),
    dateLabel: "May 26  09:00 AM",
    dateISO: "2025-05-26T09:00:00",
    status: "upcoming",
    side: "received",
    address: "Surulere, Lagos",
    duration: "1 hour",
    price: "₦8,000",
    paymentStatus: "Unpaid",
    notes: "Kitchen sink leaking.",
  },
];

/**
 * Fetch bookings for the current user.
 * TODO: replace body with:
 *   const { data } = await supabase.from('bookings').select(...).eq('user_id', userId)
 * or your Express API: GET /api/bookings?side=booked&status=upcoming
 */
export async function fetchBookings(params?: {
  side?: BookingSide;
  status?: BookingStatus | "all";
}): Promise<Booking[]> {
  // simulate network
  await new Promise((r) => setTimeout(r, 300));

  let rows = [...MOCK_BOOKINGS];

  if (params?.side) {
    rows = rows.filter((b) => b.side === params.side);
  }
  if (params?.status && params.status !== "all") {
    rows = rows.filter((b) => b.status === params.status);
  }

  return rows;
}

/**
 * Fetch a single booking by id.
 * TODO: GET /api/bookings/:id  or  supabase.from('bookings').select().eq('id', id).single()
 */
export async function fetchBookingById(id: string): Promise<Booking | null> {
  await new Promise((r) => setTimeout(r, 200));
  return MOCK_BOOKINGS.find((b) => b.id === id) ?? null;
}
