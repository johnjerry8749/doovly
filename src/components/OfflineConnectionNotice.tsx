import { useCallback, useEffect, useRef, useState } from "react";
import * as Updates from "expo-updates";
import { retryBootstrap } from "@/lib/bootstrapData";
import { checkOnline } from "@/lib/dataState";
import {
  getDataState,
  setDataPhase,
  subscribeDataState,
  type DataState,
} from "@/lib/dataState";
import { queryClient } from "@/lib/queryClient";
import { queryPersister } from "@/lib/queryPersister";

export default function OfflineConnectionNotice() {
  const [dataState, setDataState] = useState<DataState>(getDataState);
  const [retrying, setRetrying] = useState(false);
  const retryingRef = useRef(false);

  useEffect(() => {
    return subscribeDataState(setDataState);
  }, []);

  const handleRetry = useCallback(async () => {
    if (retryingRef.current) return;

    retryingRef.current = true;
    setRetrying(true);
    try {
      // Keep automatic recovery without displaying an offline blocking screen.
      const online = await checkOnline();
      if (!online) {
        setDataPhase("offline", "No network connection");
        return;
      }

      if (Updates.isEnabled) {
        queryClient.clear();
        await queryPersister.removeClient();
        await Updates.reloadAsync();
        return;
      }

      // Development clients may not have expo-updates enabled.
      await retryBootstrap();
      if (getDataState().phase === "error") {
        setDataPhase("error", getDataState().error ?? "Doovly could not refresh.");
      }
    } catch (error) {
      console.warn("[OfflineConnectionNotice] app reload failed:", error);
      setDataPhase("error", "Doovly could not refresh. Please try again.");
    } finally {
      retryingRef.current = false;
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (dataState.phase !== "offline" || retrying) return;

    // Quietly probe until connectivity returns, then refresh the complete app.
    const interval = setInterval(async () => {
      if (retryingRef.current) return;
      const online = await checkOnline(false);
      if (online) void handleRetry();
    }, 4000);

    return () => clearInterval(interval);
  }, [dataState.phase, retrying, handleRetry]);

  // Intentionally render nothing: connection recovery remains active in the background.
  return null;
}
