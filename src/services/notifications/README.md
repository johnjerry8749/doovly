# Notifications System

Doovly uses `expo-notifications` for local + remote push notifications.

## Important (Android + Expo Go)

Starting with Expo SDK 53, **importing `expo-notifications` on Android Expo Go crashes the app** (side-effect in push token auto-registration).

This package handles that by:

- **Never importing** `expo-notifications` when running in Android Expo Go (stub service instead).
- Loading the real module only on iOS, development builds, and production.

| Environment | App loads? | Local notifications | Remote push |
|-------------|------------|---------------------|-------------|
| Android Expo Go | Yes (stub) | No (module not loaded) | No |
| Android development build | Yes | Yes | Yes |
| Android production | Yes | Yes | Yes |
| iOS (Expo Go / dev / prod) | Yes | Yes | Yes |

## How to use

```ts
import { Notifications, registerForNotifications } from '@/services/notifications';

await registerForNotifications();

Notifications.newBooking();
Notifications.bookingAccepted();
Notifications.newMessage();
```

Do **not** import `./mockNotificationService` or `expo-notifications` directly from screens — always go through this entry point.

## Android development build (required for real Android push)

```bash
npx eas-cli login
npx eas build --profile development --platform android
# Install the APK, then:
npx expo start --dev-client
```
