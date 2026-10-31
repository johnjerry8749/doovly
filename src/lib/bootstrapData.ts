/**
 * Load Supabase-backed caches once after app start.
 * Updates dataState for loading / error / offline (no UI).
 */

import { loadSessionUser, bindAuthListener, clearSessionCache } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import {
  setDataPhase,
  checkOnline,
  setOnline,
} from "@/lib/dataState";
import {
  ensureProfessionalsLoaded,
  invalidateProfessionalsCache,
} from "@/services/professionals";
import { ensureBookingsLoaded, invalidateBookingsCache } from "@/services/bookings";
import { ensureSavedLoaded, invalidateSavedCache } from "@/services/savedProviders";
import { ensureNotificationsLoaded, invalidateNotificationsCache } from "@/services/inAppNotifications";
import { ensureServiceRequestsLoaded, invalidateServiceRequestsCache } from "@/services/serviceRequests";

let bootstrapped = false;
let bootPromise: Promise<void> | null = null;
let unbindAuth: (() => void) | null = null;
let professionalsChannel: ReturnType<typeof supabase.channel> | null = null;

async function loadAllCaches() {
  // Drop in-memory service caches so reconnect never reuses pre-offline data.
  await loadSessionUser(true);
  invalidateProfessionalsCache();
  invalidateBookingsCache();
  invalidateSavedCache();
  invalidateNotificationsCache();
  invalidateServiceRequestsCache();

  await Promise.all([
    ensureProfessionalsLoaded(),
    ensureBookingsLoaded(),
    ensureSavedLoaded(),
    ensureNotificationsLoaded(),
    ensureServiceRequestsLoaded(),
  ]);

  // Refresh mounted React Query screens as well, while retaining the current
  // route and navigation state.
  // invalidateQueries refetches active queries by default.
}

export async function bootstrapAppData(): Promise<void> {
  if (bootstrapped && !bootPromise) return;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    setDataPhase("loading");

    try {
      // Keep the connectivity check inside the try/finally so an offline
      // return or a rejected check cannot leave bootPromise permanently set.
      const online = await checkOnline();
      if (!online) {
        setDataPhase("offline", "No network connection");
        return;
      }

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
      if (!professionalsChannel) {
        professionalsChannel = supabase
          .channel("professionals-subscription-sync")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "professionals" },
            () => {
              void loadAllCaches().catch((e: any) =>
                console.warn("[professionals realtime]", e?.message ?? e),
              );
            },
          )
          .subscribe();
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
      // Always release the in-flight guard so a later retry can run.
      bootPromise = null;
    }
  })();

  return bootPromise;
}

export async function retryBootstrap(): Promise<void> {
  bootstrapped = false;
  return bootstrapAppData();
}
