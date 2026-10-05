/**
 * Load Supabase-backed caches once after app start.
 * Screens keep the same imports; data fills in after this resolves.
 */

import { ensureProfessionalsLoaded } from "@/services/professionals";
import { ensureBookingsLoaded } from "@/services/bookings";
import { ensureSavedLoaded, ensureCurrentUserLoaded } from "@/services/savedProviders";
import { ensureNotificationsLoaded } from "@/services/inAppNotifications";
import { ensureServiceRequestsLoaded } from "@/services/serviceRequests";

let bootstrapped = false;
let bootPromise: Promise<void> | null = null;

export async function bootstrapAppData(): Promise<void> {
  if (bootstrapped) return;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    try {
      await ensureCurrentUserLoaded();
      await Promise.all([
        ensureProfessionalsLoaded(),
        ensureBookingsLoaded(),
        ensureSavedLoaded(),
        ensureNotificationsLoaded(),
        ensureServiceRequestsLoaded(),
      ]);
      bootstrapped = true;
    } catch (err) {
      console.warn("[bootstrapAppData]", err);
      // Leave caches empty; screens show empty until retry / login
    } finally {
      bootPromise = null;
    }
  })();

  return bootPromise;
}
