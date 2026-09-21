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
   * Request permission and return a token (mock or real Expo push token)
   */
  register(): Promise<string | null>;
}
