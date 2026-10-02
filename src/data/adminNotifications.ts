/**
 * Mock admin notification history & send helpers.
 */

export type NotificationChannel = "in-app" | "email" | "sms";
export type NotificationAudience =
  | "all"
  | "verified"
  | "subscribed"
  | "free";
export type NotificationStatus = "Sent" | "Scheduled" | "Failed";

export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  sentTo: NotificationAudience;
  sentToLabel: string;
  dateTime: string;
  status: NotificationStatus;
  link?: string;
};

const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  all: "All Users",
  verified: "Verified Users",
  subscribed: "Subscribed Users",
  free: "Free Users",
};

let MOCK_NOTIFICATIONS: AdminNotification[] = [
  {
    id: "n1",
    title: "New Feature Available",
    message: "Check out our latest features and improvements on the platform.",
    channels: ["in-app", "email", "sms"],
    sentTo: "all",
    sentToLabel: "All Users",
    dateTime: "Sep 30, 2026 10:45 AM",
    status: "Sent",
  },
  {
    id: "n2",
    title: "Service Request Alert",
    message: "There are new service requests waiting for professionals.",
    channels: ["in-app"],
    sentTo: "verified",
    sentToLabel: "Verified Users",
    dateTime: "Sep 29, 2026 02:15 PM",
    status: "Sent",
  },
  {
    id: "n3",
    title: "Subscription Offer",
    message: "Upgrade to Pro and get exclusive benefits this month.",
    channels: ["in-app", "email", "sms"],
    sentTo: "subscribed",
    sentToLabel: "Subscribed Users",
    dateTime: "Sep 28, 2026 09:30 AM",
    status: "Sent",
  },
  {
    id: "n4",
    title: "Account Verification",
    message: "Your verification documents have been received and are under review.",
    channels: ["email", "sms"],
    sentTo: "free",
    sentToLabel: "Free Users",
    dateTime: "Sep 27, 2026 04:10 PM",
    status: "Sent",
  },
  {
    id: "n5",
    title: "Payment Confirmation",
    message: "Your payment of ₦2,500 has been successfully processed.",
    channels: ["in-app", "email"],
    sentTo: "all",
    sentToLabel: "All Users",
    dateTime: "Sep 26, 2026 11:20 AM",
    status: "Sent",
  },
  {
    id: "n6",
    title: "System Maintenance",
    message: "Our platform will be down for scheduled maintenance on Oct 5.",
    channels: ["in-app", "email", "sms"],
    sentTo: "all",
    sentToLabel: "All Users",
    dateTime: "Sep 24, 2026 08:00 AM",
    status: "Scheduled",
  },
];

export function getMockAdminNotifications(): AdminNotification[] {
  return [...MOCK_NOTIFICATIONS];
}

export function addMockAdminNotification(input: {
  title: string;
  message: string;
  channels: NotificationChannel[];
  sentTo: NotificationAudience;
  link?: string;
}): AdminNotification {
  const now = new Date();
  const dateTime = now.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const item: AdminNotification = {
    id: `n-${Date.now()}`,
    title: input.title.trim(),
    message: input.message.trim(),
    channels: input.channels,
    sentTo: input.sentTo,
    sentToLabel: AUDIENCE_LABELS[input.sentTo],
    dateTime,
    status: "Sent",
    link: input.link?.trim() || undefined,
  };

  MOCK_NOTIFICATIONS = [item, ...MOCK_NOTIFICATIONS];
  return item;
}

export { AUDIENCE_LABELS };
