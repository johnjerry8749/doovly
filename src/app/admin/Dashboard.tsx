import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getDashboardStats,
  type DashboardStats,
} from "@/services/dashboard";

const GREEN = "#159447";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

type StatCardProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sparkColor: string;
};

function MiniSpark({ color }: { color: string }) {
  // Simple decorative sparkline bars (mock visual only)
  const heights = [4, 7, 5, 9, 6, 11, 8, 12, 9, 14];
  return (
    <View style={styles.sparkRow}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.sparkBar,
            { height: h, backgroundColor: color, opacity: 0.35 + i * 0.05 },
          ]}
        />
      ))}
    </View>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, sparkColor }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.statValue}>{value}</Text>
      <MiniSpark color={sparkColor} />
    </View>
  );
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const [stats] = useState<DashboardStats>(() => getDashboardStats());
  const maxBar = useMemo(
    () => Math.max(...stats.overviewSeries.map((s) => s.value), 1),
    [stats.overviewSeries],
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 56 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Platform overview and key statistics</Text>
          </View>
          <TouchableOpacity style={styles.dateChip} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={14} color={GRAY} />
            <Text style={styles.dateChipText} numberOfLines={1}>
              {stats.dateRangeLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={GRAY} />
          </TouchableOpacity>
        </View>

        {/* Top stats row */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="people"
            iconBg="#D1FAE5"
            iconColor={GREEN}
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            sparkColor={GREEN}
          />
          <StatCard
            icon="shield-checkmark"
            iconBg="#DBEAFE"
            iconColor="#2563EB"
            label="Total Verified Users"
            value={stats.totalVerifiedUsers.toLocaleString()}
            sparkColor="#3B82F6"
          />
          <StatCard
            icon="ribbon"
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            label="Total Pro Sub Users"
            value={stats.totalProSubUsers.toLocaleString()}
            sparkColor="#8B5CF6"
          />
          <StatCard
            icon="clipboard"
            iconBg="#FFEDD5"
            iconColor="#EA580C"
            label="Open Requests"
            value={stats.openRequests.toLocaleString()}
            sparkColor="#F97316"
          />
        </View>

        {/* Second stats row */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="cash"
            iconBg="#D1FAE5"
            iconColor={GREEN}
            label="Total Revenue From Pro Users"
            value={formatNaira(stats.totalRevenueFromPro)}
            sparkColor={GREEN}
          />
          <StatCard
            icon="document-text"
            iconBg="#FEE2E2"
            iconColor="#DC2626"
            label="Total Post Request From Users"
            value={stats.totalPostRequests.toLocaleString()}
            sparkColor="#EF4444"
          />
          <StatCard
            icon="calendar"
            iconBg="#DBEAFE"
            iconColor="#2563EB"
            label="Total Bookings From All Users"
            value={stats.totalBookings.toLocaleString()}
            sparkColor="#3B82F6"
          />
        </View>

        {/* Overview chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Overview</Text>
            <TouchableOpacity style={styles.chartRange} activeOpacity={0.8}>
              <Text style={styles.chartRangeText}>Last 30 Days</Text>
              <Ionicons name="chevron-down" size={14} color={GRAY} />
            </TouchableOpacity>
          </View>

          <View style={styles.chartArea}>
            <View style={styles.yAxis}>
              <Text style={styles.yLabel}>150</Text>
              <Text style={styles.yLabel}>100</Text>
              <Text style={styles.yLabel}>50</Text>
              <Text style={styles.yLabel}>0</Text>
            </View>
            <View style={styles.barsWrap}>
              {stats.overviewSeries.map((point, index) => {
                const h = Math.max(4, (point.value / maxBar) * 120);
                return (
                  <View key={index} style={styles.barCol}>
                    <View style={[styles.bar, { height: h }]} />
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.xAxis}>
            <Text style={styles.xLabel}>Sep 1</Text>
            <Text style={styles.xLabel}>Sep 10</Text>
            <Text style={styles.xLabel}>Sep 20</Text>
            <Text style={styles.xLabel}>Sep 30</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: GRAY,
    marginTop: 4,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 160,
  },
  dateChipText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
    flexShrink: 1,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    width: "47%",
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: {
        // @ts-ignore
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      },
    }),
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GRAY,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  sparkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
  },
  sparkBar: {
    width: 4,
    borderRadius: 2,
  },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: {
        // @ts-ignore
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      },
    }),
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  chartRange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chartRangeText: {
    fontSize: 12,
    fontWeight: "600",
    color: GRAY,
  },
  chartArea: {
    flexDirection: "row",
    height: 140,
  },
  yAxis: {
    width: 28,
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  yLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  barsWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    paddingLeft: 4,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "80%",
    maxWidth: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: GREEN,
    opacity: 0.85,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 28,
  },
  xLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
