/**
 * Notification Service Entry Point
 *
 * CRITICAL (Android Expo Go / SDK 53+):
 * Simply importing `expo-notifications` crashes the app because of a side-effect
 * in DevicePushTokenAutoRegistration. We must NOT load that module at all on
 * Android Expo Go. Development builds and production still get full push support.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { NotificationPayload, NotificationService } from './types';

function isAndroidExpoGo(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === 'expo';
}

/** No-op service used only on Android Expo Go (never loads expo-notifications). */
const expoGoAndroidStub: NotificationService = {
  async register(): Promise<string | null> {
    console.log(
      '[Notifications] Android Expo Go detected — expo-notifications is not loaded. ' +
        'Remote push and native local notifications require a development build.',
    );
    return null;
  },

  async send(payload: NotificationPayload): Promise<void> {
    console.log(
      '[Notifications] Android Expo Go — notification not shown (no native module):',
      payload.title,
    );
  },
};

let cachedService: NotificationService | null = null;

function getNotificationService(): NotificationService {
  if (cachedService) return cachedService;

  if (isAndroidExpoGo()) {
    cachedService = expoGoAndroidStub;
    return cachedService;
  }

  // Lazy require — only evaluated outside Android Expo Go, so the import side-effect
  // that throws never runs in Expo Go on Android.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mockNotificationService } = require('./mockNotificationService');
  cachedService = mockNotificationService as NotificationService;
  return cachedService;
}

/**
 * Public API – use these functions everywhere in the app
 */

export async function registerForNotifications(): Promise<string | null> {
  return getNotificationService().register();
}

export async function sendNotification(
  payload: NotificationPayload,
): Promise<void> {
  return getNotificationService().send(payload);
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
