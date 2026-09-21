# Notifications System

This folder contains a clean notification system that currently works with **mock data** (local notifications).

## How to use (right now)

```ts
import { Notifications, registerForNotifications } from '@/services/notifications';

// Request permission + get token (mock)
await registerForNotifications();

// Send test notifications
Notifications.newBooking();
Notifications.bookingAccepted();
Notifications.newMessage();
```

## How to switch to real Push Notifications later

1. Create `realNotificationService.ts` (we will do this together)
2. Open `index.ts`
3. Change this line:

```ts
const notificationService = mockNotificationService;
```

to:

```ts
const notificationService = realNotificationService;
```

That’s it. All screens that use `Notifications.xxx()` will automatically start using real push.
