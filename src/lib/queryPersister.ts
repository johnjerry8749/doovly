import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persister } from "@tanstack/react-query-persist-client";

const STORAGE_KEY = "doovly:react-query-cache:v1";

// Keep public/discoverable data across launches, but do not persist likely
// user-specific records such as chats, bookings, profiles, or notifications.
const PRIVATE_QUERY_KEY_PARTS = [
  "chat",
  "conversation",
  "message",
  "booking",
  "profile",
  "notification",
  "auth",
  "user",
  "my-",
];

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const normalizedKey = JSON.stringify(queryKey).toLowerCase();
  return !PRIVATE_QUERY_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

export const queryPersister: Persister = {
  async persistClient(client) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(client));
    } catch (error) {
      console.warn("[QueryCache] Could not persist cache:", error);
    }
  },

  async restoreClient() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return undefined;

      return JSON.parse(stored);
    } catch (error) {
      console.warn("[QueryCache] Could not restore cache:", error);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
      return undefined;
    }
  },

  async removeClient() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("[QueryCache] Could not remove cache:", error);
    }
  },
};
