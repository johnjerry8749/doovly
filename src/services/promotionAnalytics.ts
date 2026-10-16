import { supabase } from "@/lib/supabase";

const countedImpressions = new Set<string>();

export async function trackPromotionEvent(
  serviceId: string,
  metric: "impressions" | "service_views",
): Promise<void> {
  if (!serviceId) return;
  if (metric === "impressions") {
    if (countedImpressions.has(serviceId)) return;
    countedImpressions.add(serviceId);
  }
  try {
    const { error } = await supabase.rpc("track_service_promotion_event", {
      p_service_id: serviceId,
      p_metric: metric,
    });
    if (error) {
      if (metric === "impressions") countedImpressions.delete(serviceId);
      console.warn("Promotion event tracking failed:", error.message);
    }
  } catch (error) {
    if (metric === "impressions") countedImpressions.delete(serviceId);
    console.warn("Promotion event tracking failed:", error);
  }
}
