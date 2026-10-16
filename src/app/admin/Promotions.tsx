import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  formatPromotionRevenue,
  getAdminPromotionSummary,
  listAdminPromotions,
  type AdminPromotion,
  type PromotionSummary,
} from "@/services/admin/promotions";

const GREEN = "#159447";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

type Filter = "All" | "Active" | "Inactive";

function isCurrentlyActive(item: AdminPromotion) {
  const now = Date.now();
  return item.status === "active" && !!item.startsAt && !!item.endsAt &&
    new Date(item.startsAt).getTime() <= now && new Date(item.endsAt).getTime() > now;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(amount: number | null, currency: string) {
  if (amount == null) return "Not recorded";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString()}`.trim();
  }
}

function statusLabel(item: AdminPromotion) {
  if (isCurrentlyActive(item)) return "Active";
  if (item.status === "pending") return "Pending payment";
  if (item.status === "refunded") return "Refunded";
  if (item.status === "cancelled") return "Cancelled";
  if (item.status === "expired") return "Expired";
  return "Inactive";
}

export default function Promotions() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<PromotionSummary | null>(null);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [nextSummary, nextPromotions] = await Promise.all([
        getAdminPromotionSummary(),
        listAdminPromotions(),
      ]);
      setSummary(nextSummary);
      setPromotions(nextPromotions);
    } catch (err) {
      console.warn("[Admin Promotions]", err);
      setError("Could not load promotion data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => promotions.filter((item) => {
    if (filter === "Active") return isCurrentlyActive(item);
    if (filter === "Inactive") return !isCurrentlyActive(item);
    return true;
  }), [promotions, filter]);

  const summaryCards = [
    { label: "Total promotions", value: String(summary?.total ?? 0), icon: "megaphone-outline" as const, tint: "#D1FAE5", color: GREEN },
    { label: "Active now", value: String(summary?.active ?? 0), icon: "flash-outline" as const, tint: "#DBEAFE", color: "#2563EB" },
    { label: "Inactive", value: String(summary?.inactive ?? 0), icon: "pause-circle-outline" as const, tint: "#F3F4F6", color: "#4B5563" },
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 56 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={GREEN} colors={[GREEN]} />}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Promotions</Text>
            <Text style={styles.subtitle}>Monitor promoted services, activity and recorded purchase revenue.</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh promotions" style={styles.refreshButton} onPress={refresh}>
            <Ionicons name="refresh" size={19} color={GREEN} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <View style={[styles.iconCircle, { backgroundColor: card.tint }]}>
                <Ionicons name={card.icon} size={19} color={card.color} />
              </View>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.revenueCard}>
          <View style={styles.revenueIcon}>
            <Ionicons name="wallet-outline" size={21} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.revenueLabel}>Recorded promotion revenue</Text>
            <Text style={styles.revenueValue}>{summary ? formatPromotionRevenue(summary.revenueByCurrency) : "—"}</Text>
            <Text style={styles.revenueNote}>Based on successful purchases recorded by RevenueCat. Refunded and pending purchases are excluded.</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>All promotions</Text>
            <Text style={styles.sectionSubtitle}>{filtered.length} promotion{filtered.length === 1 ? "" : "s"}</Text>
          </View>
          <View style={styles.filters}>
            {(["All", "Active", "Inactive"] as Filter[]).map((item) => (
              <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
                <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading && promotions.length === 0 ? (
          <View style={styles.centerState}><ActivityIndicator color={GREEN} /><Text style={styles.stateText}>Loading promotions…</Text></View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color={GRAY} />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="megaphone-outline" size={30} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No promotions found</Text>
            <Text style={styles.stateText}>Promotions matching this filter will appear here.</Text>
          </View>
        ) : filtered.map((item) => {
          const active = isCurrentlyActive(item);
          return (
            <View key={item.id} style={styles.promotionCard}>
              <View style={styles.cardTop}>
                <View style={styles.serviceIcon}><Ionicons name="briefcase-outline" size={20} color={GREEN} /></View>
                <View style={styles.serviceCopy}>
                  <Text style={styles.serviceName} numberOfLines={2}>{item.serviceName}</Text>
                  <Text style={styles.packageName}>{item.packageName}</Text>
                </View>
                <View style={[styles.statusPill, active ? styles.statusActive : styles.statusInactive]}>
                  <View style={[styles.statusDot, { backgroundColor: active ? GREEN : "#9CA3AF" }]} />
                  <Text style={[styles.statusText, { color: active ? GREEN : "#6B7280" }]}>{statusLabel(item)}</Text>
                </View>
              </View>

              <View style={styles.ownerBlock}>
                <Ionicons name="person-outline" size={15} color={GRAY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ownerName}>{item.ownerName}</Text>
                  {!!item.ownerEmail && <Text style={styles.ownerEmail}>{item.ownerEmail}</Text>}
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Purchase amount</Text>
                  <Text style={styles.detailValue}>{formatAmount(item.amount, item.currency)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Purchased</Text>
                  <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Starts</Text>
                  <Text style={styles.detailValue}>{formatDate(item.startsAt)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ends</Text>
                  <Text style={styles.detailValue}>{formatDate(item.endsAt)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingHorizontal: 20, paddingBottom: 44 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  headerCopy: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, lineHeight: 20 },
  refreshButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, minWidth: 100, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 15, padding: 13 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  summaryValue: { fontSize: 23, fontWeight: "800", color: "#111827" },
  summaryLabel: { fontSize: 12, fontWeight: "600", color: GRAY, marginTop: 4 },
  revenueCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: GREEN, borderRadius: 16, padding: 16, marginBottom: 24 },
  revenueIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  revenueLabel: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  revenueValue: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 5 },
  revenueNote: { color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 16, marginTop: 5 },
  listHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: GRAY, marginTop: 3 },
  filters: { flexDirection: "row", gap: 4, backgroundColor: "#F3F4F6", borderRadius: 11, padding: 3 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  filterChipActive: { backgroundColor: "#D1FAE5" },
  filterText: { color: GRAY, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: GREEN },
  promotionCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 11 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  serviceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  packageName: { fontSize: 12, color: GRAY, marginTop: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  statusActive: { backgroundColor: "#D1FAE5" },
  statusInactive: { backgroundColor: "#F3F4F6" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  ownerBlock: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 13 },
  ownerName: { fontSize: 13, fontWeight: "700", color: "#374151" },
  ownerEmail: { fontSize: 12, color: GRAY, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailItem: { width: "47%", flexGrow: 1, minWidth: 120 },
  detailLabel: { fontSize: 11, color: GRAY },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 3 },
  centerState: { alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 15, padding: 24, gap: 8 },
  stateText: { fontSize: 13, color: GRAY, textAlign: "center", lineHeight: 19 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  retryButton: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9, marginTop: 4 },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
