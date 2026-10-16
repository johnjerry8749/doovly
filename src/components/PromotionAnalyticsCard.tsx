import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

type Analytics = {
  promotionId: string;
  serviceName: string;
  startsAt: string | null;
  endsAt: string | null;
  impressions: number;
  serviceViews: number;
  bookingRequests: number;
  bookings: number;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function PromotionAnalyticsCard({ promotionId }: { promotionId: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: promotion, error: promotionError } = await supabase
        .from("service_promotions")
        .select("id,service_id,starts_at,ends_at,services(name)")
        .eq("id", promotionId)
        .maybeSingle();
      if (promotionError) throw promotionError;
      if (!promotion) {
        setAnalytics(null);
        setFailed(true);
        return;
      }

      const { data: rows, error: analyticsError } = await supabase
        .from("service_promotion_analytics")
        .select("impressions,service_views,booking_requests,bookings")
        .eq("promotion_id", promotionId);
      if (analyticsError) throw analyticsError;

      const totals = (rows ?? []).reduce(
        (sum, row) => ({
          impressions: sum.impressions + Number(row.impressions ?? 0),
          serviceViews: sum.serviceViews + Number(row.service_views ?? 0),
          bookingRequests: sum.bookingRequests + Number(row.booking_requests ?? 0),
          bookings: sum.bookings + Number(row.bookings ?? 0),
        }),
        { impressions: 0, serviceViews: 0, bookingRequests: 0, bookings: 0 },
      );

      const relatedService = Array.isArray(promotion.services) ? promotion.services[0] : promotion.services;
      setAnalytics({
        promotionId,
        serviceName: relatedService?.name ?? "Promoted service",
        startsAt: promotion.starts_at,
        endsAt: promotion.ends_at,
        ...totals,
      });
      setFailed(false);
    } catch (error) {
      console.warn("Promotion analytics load failed:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [promotionId]);

  useEffect(() => {
    let active = true;
    void load();
    const channel = supabase
      .channel("promotion-analytics-" + promotionId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_promotion_analytics", filter: "promotion_id=eq." + promotionId },
        () => { if (active) void load(); },
      )
      .subscribe();
    const refresh = setInterval(() => { if (active) void load(); }, 30000);
    return () => {
      active = false;
      clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, promotionId]);

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Ionicons name="stats-chart" size={18} color="#159447" />
        <Text style={styles.title}>Promotion analysis</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#159447" />
      ) : failed || !analytics ? (
        <Text style={styles.note}>Promotion analytics are temporarily unavailable. Try again shortly.</Text>
      ) : (
        <>
          <Text style={styles.serviceName} numberOfLines={2}>{analytics.serviceName}</Text>
          <Text style={styles.period}>Period: {formatDate(analytics.startsAt)} – {formatDate(analytics.endsAt)}</Text>
          <View style={styles.grid}>
            <Metric label="Impressions" value={analytics.impressions} />
            <Metric label="Service views" value={analytics.serviceViews} />
            <Metric label="Booking requests" value={analytics.bookingRequests} />
            <Metric label="Confirmed bookings" value={analytics.bookings} />
          </View>
          <Text style={styles.note}>Counts reflect events recorded by Doovly. Analytics refresh automatically.</Text>
        </>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value.toLocaleString("en-NG")}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "flex-start", width: "92%", maxWidth: 340, marginVertical: 8, marginLeft: 8, padding: 12, borderRadius: 14, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0" },
  heading: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: "800", color: "#14532D" },
  serviceName: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 4 },
  period: { fontSize: 11, color: "#6B7280", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "47%", minHeight: 54, padding: 8, borderRadius: 9, backgroundColor: "#FFFFFF" },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#159447" },
  metricLabel: { fontSize: 10, color: "#4B5563", marginTop: 2 },
  note: { fontSize: 10, lineHeight: 14, color: "#6B7280", marginTop: 8 },
});
