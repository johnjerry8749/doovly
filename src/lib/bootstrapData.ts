/**
 * Load Supabase-backed caches once after app start.
 * Updates dataState for loading / error / offline (no UI).
 */

import { loadSessionUser, bindAuthListener, clearSessionCache } from "@/lib/session";
import {
  setDataPhase,
  checkOnline,
  setOnline,
} from "@/lib/dataState";
import { ensureProfessionalsLoaded } from "@/services/professionals";
import { ensureBookingsLoaded } from "@/services/bookings";
import { ensureSavedLoaded } from "@/services/savedProviders";
import { ensureNotificationsLoaded } from "@/services/inAppNotifications";
import { ensureServiceRequestsLoaded } from "@/services/serviceRequests";

let bootstrapped = false;
let bootPromise: Promise<void> | null = null;
let unbindAuth: (() => void) | null = null;

async function loadAllCaches() {
  await loadSessionUser(true);
  await Promise.all([
    ensureProfessionalsLoaded(),
    ensureBookingsLoaded(),
    ensureSavedLoaded(),
    ensureNotificationsLoaded(),
    ensureServiceRequestsLoaded(),
  ]);
}

export async function bootstrapAppData(): Promise<void> {
  if (bootstrapped && !bootPromise) return;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    setDataPhase("loading");
    const online = await checkOnline();
    if (!online) {
      setDataPhase("offline", "No network connection");
      return;
    }

    try {
      await loadAllCaches();
      if (!unbindAuth) {
        unbindAuth = bindAuthListener(async (user) => {
          if (!user) {
            clearSessionCache();
            setDataPhase("ready");
            return;
          }
          setDataPhase("loading");
          try {
            await loadAllCaches();
            setDataPhase("ready");
          } catch (e: any) {
            setDataPhase("error", e?.message ?? "Failed to refresh data");
          }
        });
      }
      bootstrapped = true;
      setDataPhase("ready");
    } catch (err: any) {
      console.warn("[bootstrapAppData]", err);
      const msg = err?.message ?? "Failed to load data";
      if (/network|fetch|offline/i.test(msg)) {
        setOnline(false);
        setDataPhase("offline", msg);
      } else {
        setDataPhase("error", msg);
      }
    } finally {
      bootPromise = null;
    }
  })();

  return bootPromise;
}

export async function retryBootstrap(): Promise<void> {
  bootstrapped = false;
  return bootstrapAppData();
}
