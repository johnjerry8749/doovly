/**
 * Notifications mock data
 * ----------------------
 * Each row belongs to a userId.
 * Later: replace with API rows.
 */

export type NotifType =
  | "booking"
  | "upcoming"
  | "message"
  | "payment"
  | "verification"
  | "review"
  | "general";

export type Notification = {
  id: string;
  /** Owner of this notification */
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  /** Optional local image for message avatars */
  avatar?: number | null;
};

/**
 * All notifications in the system (mock).
 * Filter with getNotificationsByUserId(userId).
 */
export const NOTIFICATIONS: Notification[] = [
  // —— user u1 (MOCK_USER / John Jerry)
  {
    id: "n1",
    userId: "u1",
    type: "booking",
    title: "Booking Confirmed",
    body: "Your booking with Tunde Electrician has been confirmed.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "n2",
    userId: "u1",
    type: "upcoming",
    title: "Upcoming Booking",
    body: "You have a booking with Bright Cleaning scheduled for tomorrow at 10:00 AM.",
    time: "25 min ago",
    unread: true,
  },
  {
    id: "n3",
    userId: "u1",
    type: "message",
    title: "New Message",
    body: "You have a new message from Sarah Makeover.",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: "n4",
    userId: "u1",
    type: "payment",
    title: "Payment Successful",
    body: "Your payment of ₦15,000 was successful.",
    time: "3 hrs ago",
    unread: true,
  },
  {
    id: "n5",
    userId: "u1",
    type: "verification",
    title: "Verification Update",
    body: "Your identity verification is under review.",
    time: "1 day ago",
    unread: true,
  },
  {
    id: "n6",
    userId: "u1",
    type: "review",
    title: "Review Received",
    body: "You received a 5-star review from John Doe.",
    time: "2 days ago",
    unread: true,
  },
  {
    id: "n7",
    userId: "u1",
    type: "general",
    title: "Welcome to Doovly",
    body: "Thanks for joining. Explore services near you.",
    time: "3 days ago",
    unread: false,
  },

  // —— example other user (u2) — will NOT show for u1
  {
    id: "n8",
    userId: "u2",
    type: "booking",
    title: "Booking Confirmed",
    body: "Your booking with Chioma Plumber has been confirmed.",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: "n9",
    userId: "u2",
    type: "general",
    title: "Tip",
    body: "Complete your profile to get more bookings.",
    time: "2 days ago",
    unread: true,
  },
];
