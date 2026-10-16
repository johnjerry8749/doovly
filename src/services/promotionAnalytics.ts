import { supabase } from "@/lib/supabase";

const lastImpressionAt = new Map<string, number>();

export async function trackPromotionEvent(
  serviceId: string,
  metric: "impressions" | "service_views",
): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)) return;
  if (metric === "impressions") {
    const lastCounted = lastImpressionAt.get(serviceId) ?? 0;
    if (Date.now() - lastCounted < 30000) return;
    lastImpressionAt.set(serviceId, Date.now());
  }
  try {
    const { error } = await supabase.rpc("track_service_promotion_event", {
      p_service_id: serviceId,
      p_metric: metric,
    });
    if (error) {
      if (metric === "impressions") lastImpressionAt.delete(serviceId);
      console.warn("Promotion event tracking failed:", error.message);
    }
  } catch (error) {
    if (metric === "impressions") lastImpressionAt.delete(serviceId);
    console.warn("Promotion event tracking failed:", error);
  }
}
