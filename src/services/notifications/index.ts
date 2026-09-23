/**
 * Notification Service Entry Point
 *
 * Uses the production-ready notification service implementation.
 * On Android Expo Go, remote push is skipped safely; development builds
 * and production builds get real Expo push tokens.
 */

import { mockNotificationService } from './mockNotificationService';
// import { realNotificationService } from './realNotificationService';  // ← optional future split

import { NotificationPayload } from './types';

// ======================
// ACTIVE SERVICE
// ======================
const notificationService = mockNotificationService;
// const notificationService = realNotificationService; // ← if you split later

/**
 * Public API – use these functions everywhere in the app
 */

export async function registerForNotifications(): Promise<string | null> {
  return notificationService.register();
}

export async function sendNotification(
  payload: NotificationPayload,
): Promise<void> {
  return notificationService.send(payload);
}

/**
 * Convenient pre-made notifications for testing
 */
export const Notifications = {
  newBooking: () =>
    sendNotification({
      title: 'New Booking Request',
      body: 'Someone just booked your service',
      data: { type: 'booking', screen: 'bookings' },
    }),

  bookingAccepted: () =>
    sendNotification({
      title: 'Booking Accepted!',
      body: 'Your booking has been accepted by the professional',
      data: { type: 'booking_accepted', screen: 'bookings' },
    }),

  bookingCancelled: () =>
    sendNotification({
      title: 'Booking Cancelled',
      body: 'A booking was cancelled',
      data: { type: 'booking_cancelled' },
    }),

  newMessage: () =>
    sendNotification({
      title: 'New Message',
      body: 'You have a new message',
      data: { type: 'chat', screen: 'chat' },
    }),

  custom: (title: string, body: string, data?: Record<string, any>) =>
    sendNotification({ title, body, data }),
};
