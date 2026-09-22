/**
 * In-App Notifications service
 * ----------------------------
 * Screens import ONLY from here for the notification list inside the app.
 * NOW  → mock from src/data/notifications.ts filtered by userId
 * LATER → apiRequest(`/notifications?userId=...`)
 *
 * NOTE: Push notifications (device alerts) live in src/services/notifications/
 */

import {
  NOTIFICATIONS,
  type Notification,
  type NotifType,
} from "@/data/notifications";
import {
  getLoggedInProfessionalId,
  MOCK_USER,
} from "@/services/savedProviders";
import { listProfessionals } from "@/services/professionals";

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

export type InAppNotificationInput = {
  userId: string;
  type: NotifType;
  title: string;
  body: string;
};

/** Store one in-app notification. Later: POST /notifications. */
export function addInAppNotification(
  input: InAppNotificationInput,
): Notification {
  const notification: Notification = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: String(input.userId),
    type: input.type,
    title: input.title,
    body: input.body,
    time: "Just now",
    unread: true,
  };

  // TODO backend: return apiRequest("/notifications", { method: "POST", body })
  NOTIFICATIONS.unshift(notification);
  return notification;
}

/**
 * In-app alerts for subscribed pros in the request city.
 * Later: the API fans these out; the bell still reads getNotificationsByUserId.
 * The logged-in pro is included only when they are subscribed and in that city,
 * so the top bell can show the alert without changing the notification screen.
 */
export function notifySubscribedProsInArea(input: {
  city: string;
  title: string;
  body: string;
}): number {
  const city = input.city.trim().toLowerCase();
  const pros = listProfessionals().filter((pro) => {
    if (!pro.subscribed) return false;
    const proCity = pro.city.trim().toLowerCase();
    return proCity.includes(city) || city.includes(proCity);
  });

  const currentUserId = getCurrentUserId();
  const currentProId = getLoggedInProfessionalId();
  const recipientIds = new Set<string>();

  pros.forEach((pro) => {
    if (currentProId && String(pro.id) === String(currentProId)) {
      recipientIds.add(currentUserId);
      return;
    }
    recipientIds.add(`pro-${pro.id}`);
  });

  recipientIds.forEach((userId) => {
    addInAppNotification({
      userId,
      type: "general",
      title: input.title,
      body: input.body,
    });
  });

  return recipientIds.size;
}

/** Mark all of a user's notifications read. */
export function markAllNotificationsRead(userId?: string): void {
  const uid = userId ?? getCurrentUserId();
  NOTIFICATIONS.forEach((n) => {
    if (n.userId === String(uid)) n.unread = false;
  });
}
