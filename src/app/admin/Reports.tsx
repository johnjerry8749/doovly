import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getDashboardStats, type DashboardRange, type DashboardStats } from "@/services/admin/dashboard";

const GREEN = "#159447";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

function ReportCard({ title, value, icon, tint, color }: {
  title: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  color: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={styles.metricValue} numberOfLines={2} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export default function Reports() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<DashboardRange>("all");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      setStats(await getDashboardStats(range));
    } catch (e) {
      console.warn("[Admin Reports]", e);
      setError("Could not load report data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 56 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={GREEN} colors={[GREEN]} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>Platform performance, activity and revenue summary.</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh reports" style={styles.refresh} onPress={load}>
            <Ionicons name="refresh" size={19} color={GREEN} />
          </TouchableOpacity>
        </View>

        <View style={styles.rangeBar}>
          {([{ key: "all", label: "All time" }, { key: "30days", label: "Last 30 days" }] as const).map((option) => (
            <TouchableOpacity
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: range === option.key }}
              onPress={() => setRange(option.key)}
              style={[styles.rangeOption, range === option.key && styles.rangeOptionActive]}
            >
              <Text style={[styles.rangeText, range === option.key && styles.rangeTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.rangeCaption}>Showing: {range === "all" ? "All recorded activity" : "Activity created in the last 30 days"}</Text>

        {loading && !stats ? (
          <View style={styles.state}><ActivityIndicator color={GREEN} /><Text style={styles.stateText}>Loading report…</Text></View>
        ) : error && !stats ? (
          <View style={styles.state}>
            <Ionicons name="cloud-offline-outline" size={28} color={GRAY} />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        ) : stats ? (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Platform overview</Text>
              {loading && <ActivityIndicator size="small" color={GREEN} />}
            </View>
            <View style={styles.grid}>
              <ReportCard title="Users" value={stats.totalUsers.toLocaleString()} icon="people-outline" tint="#D1FAE5" color={GREEN} />
              <ReportCard title="Verified professionals" value={stats.totalVerifiedUsers.toLocaleString()} icon="shield-checkmark-outline" tint="#DBEAFE" color="#2563EB" />
              <ReportCard title="Pro subscriptions" value={stats.totalProSubUsers.toLocaleString()} icon="ribbon-outline" tint="#EDE9FE" color="#7C3AED" />
              <ReportCard title="Service requests" value={stats.totalPostRequests.toLocaleString()} icon="document-text-outline" tint="#FFEDD5" color="#EA580C" />
              <ReportCard title="Bookings" value={stats.totalBookings.toLocaleString()} icon="calendar-outline" tint="#DBEAFE" color="#2563EB" />
              <ReportCard title="Promotions" value={stats.totalPromotions.toLocaleString()} icon="megaphone-outline" tint="#D1FAE5" color={GREEN} />
              <ReportCard title="Active promotions now" value={stats.activePromotions.toLocaleString()} icon="flash-outline" tint="#FEF3C7" color="#B45309" />
            </View>

            <View style={styles.revenueCard}>
              <View style={styles.revenueIcon}><Ionicons name="wallet-outline" size={21} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.revenueTitle}>Pro subscription revenue estimate</Text>
                <Text style={styles.revenueValue}>{money(stats.totalRevenueFromPro)}</Text>
                <Text style={styles.revenueNote}>Estimated from the matching Pro subscription count and configured monthly plan price; this is not a payment-ledger total.</Text>
              </View>
            </View>

            <View style={styles.revenueCard}>
              <View style={styles.revenueIcon}><Ionicons name="megaphone-outline" size={21} color="#FFFFFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.revenueTitle}>Recorded promotion revenue</Text>
                <Text style={styles.revenueValue}>{stats.promotionRevenueLabel}</Text>
                <Text style={styles.revenueNote}>Recorded promotion purchase amounts by currency. Pending and refunded purchases are excluded.</Text>
              </View>
            </View>

            <View style={styles.noteCard}>
              <Ionicons name="information-circle-outline" size={18} color={GRAY} />
              <Text style={styles.noteText}>The selected range filters records by their creation date. “Active promotions now” is the number currently within its active time window.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingHorizontal: 20, paddingBottom: 44 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, lineHeight: 20 },
  refresh: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  rangeBar: { flexDirection: "row", alignSelf: "flex-start", gap: 4, backgroundColor: "#F3F4F6", borderRadius: 11, padding: 4 },
  rangeOption: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  rangeOptionActive: { backgroundColor: "#D1FAE5" },
  rangeText: { fontSize: 12, fontWeight: "700", color: GRAY },
  rangeTextActive: { color: GREEN },
  rangeCaption: { fontSize: 12, color: GRAY, marginTop: 9, marginBottom: 20 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  metricCard: { flexGrow: 1, width: "47%", minWidth: 140, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 15, padding: 14 },
  metricIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#111827" },
  metricTitle: { fontSize: 12, fontWeight: "600", color: GRAY, marginTop: 5 },
  revenueCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: GREEN, borderRadius: 16, padding: 16, marginBottom: 12 },
  revenueIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  revenueTitle: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700" },
  revenueValue: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 5 },
  revenueNote: { color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 16, marginTop: 5 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 13, marginTop: 2 },
  noteText: { flex: 1, color: GRAY, fontSize: 12, lineHeight: 18 },
  state: { alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 15, padding: 24 },
  stateText: { fontSize: 13, color: GRAY, textAlign: "center", lineHeight: 19 },
  retry: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9, marginTop: 4 },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
