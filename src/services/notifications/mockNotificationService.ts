import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationPayload, NotificationService } from './types';

// Show notifications even when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Mock Notification Service
 * Works fully offline / locally.
 * Later we will replace this file with a real Expo Push + Supabase version.
 */
class MockNotificationService implements NotificationService {
  async register(): Promise<string | null> {
    // In mock mode we just return a fake token
    // This makes it easy to test the flow without a real device token
    const mockToken = `ExponentPushToken[mock-${Date.now()}]`;
    console.log('[MockNotifications] Registered with token:', mockToken);
    return mockToken;
  }

  async send(payload: NotificationPayload): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: true,
      },
      trigger: null, // send immediately
    });

    console.log('[MockNotifications] Sent:', payload.title);
  }
}

export const mockNotificationService = new MockNotificationService();
