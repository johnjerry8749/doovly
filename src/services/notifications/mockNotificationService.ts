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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[MockNotifications] Permission not granted');
      return null;
    }

    // Android 13+ requires explicit channel for notifications to appear
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16A34A',
      });
    }

    // In mock mode we still return a fake token for compatibility
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
