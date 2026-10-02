/**
 * Admin notifications service
 * --------------------------
 * Admin screens import from @/services/admin/notifications
 *
 * NOW  → mock from src/data/adminNotifications.ts
 * LATER → apiRequest("/admin/notifications...")
 */

import {
  getMockAdminNotifications,
  addMockAdminNotification,
  AUDIENCE_LABELS,
  type AdminNotification,
  type NotificationChannel,
  type NotificationAudience,
  type NotificationStatus,
} from "@/data/adminNotifications";

export type {
  AdminNotification,
  NotificationChannel,
  NotificationAudience,
  NotificationStatus,
};
export { AUDIENCE_LABELS };

/** List notification history (admin). */
export function listAdminNotifications(): AdminNotification[] {
  // TODO backend: return apiRequest<AdminNotification[]>("/admin/notifications")
  return getMockAdminNotifications();
}

/** Send a notification to selected audience via selected channels. */
export function sendAdminNotification(input: {
  title: string;
  message: string;
  channels: NotificationChannel[];
  sentTo: NotificationAudience;
  link?: string;
}): AdminNotification {
  // TODO backend: return apiRequest("/admin/notifications", { method: "POST", body: JSON.stringify(input) })
  return addMockAdminNotification(input);
}
