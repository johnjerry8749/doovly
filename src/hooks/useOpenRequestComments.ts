import { useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  listServiceRequests,
  type ServiceRequest,
} from "@/services/serviceRequests";

/**
 * When navigating from Profile → My Service Requests with
 * `/(tab)/requests?openRequestId=…`, open the comments sheet.
 */
export function useOpenRequestComments(
  allRequests: ServiceRequest[],
  openChat: (item: ServiceRequest) => void,
) {
  const { openRequestId } = useLocalSearchParams<{
    openRequestId?: string | string[];
  }>();
  const openedRef = useRef<string | null>(null);

  useEffect(() => {
    const raw = openRequestId;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!id) return;
    if (openedRef.current === id) return;
    void (async () => {
      const found =
        allRequests.find((r) => r.id === String(id)) ||
        (await listServiceRequests()).find((r) => r.id === String(id));
      if (!found) return;
      openedRef.current = String(id);
      openChat(found);
      try {
        router.setParams({ openRequestId: undefined as unknown as string });
      } catch {
        /* ignore */
      }
    })();
  }, [openRequestId, allRequests, openChat]);
}
