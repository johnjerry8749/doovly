/**
 * Notifications service
 * --------------------
 * Screens import ONLY from here.
 * NOW  → mock from src/data/notifications.ts filtered by userId
 * LATER → apiRequest(`/notifications?userId=...`)
 */

import {
  NOTIFICATIONS,
  type Notification,
  type NotifType,
} from "@/data/notifications";
import { MOCK_USER } from "@/services/savedProviders";

export type { Notification, NotifType };

/** Current logged-in user id (mock). Later: from auth context. */
export function getCurrentUserId(): string {
  return MOCK_USER.id;
}

/** All notifications for one user (newest first as stored). */
export function getNotificationsByUserId(userId: string): Notification[] {
  // TODO backend: return apiRequest(`/notifications?userId=${userId}`)
  return NOTIFICATIONS.filter((n) => n.userId === String(userId));
}

/** Convenience: notifications for the mock logged-in user. */
export function getMyNotifications(): Notification[] {
  return getNotificationsByUserId(getCurrentUserId());
}

export function getUnreadCount(userId?: string): number {
  const uid = userId ?? getCurrentUserId();
  return getNotificationsByUserId(uid).filter((n) => n.unread).length;
}

/**
 * Mark one notification read (mock: mutates in-memory row).
 * Later: PATCH /notifications/:id
 */
export function markNotificationRead(notificationId: string): void {
  const row = NOTIFICATIONS.find((n) => n.id === notificationId);
  if (row) row.unread = false;
}

/** Mark all of a user's notifications read. */
export function markAllNotificationsRead(userId?: string): void {
  const uid = userId ?? getCurrentUserId();
  NOTIFICATIONS.forEach((n) => {
    if (n.userId === String(uid)) n.unread = false;
  });
}
