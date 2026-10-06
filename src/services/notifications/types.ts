export type NotifType =
  | "booking"
  | "upcoming"
  | "message"
  | "payment"
  | "verification"
  | "review"
  | "general";

export type Notification = {
  id: string;
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  avatar?: number | null;
};

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

export interface NotificationService {
  /**
   * Send a notification to the current device (local or push)
   */
  send(payload: NotificationPayload): Promise<void>;

  /**
   * Request permission and return a real Expo push token
   */
  register(): Promise<string | null>;
}
