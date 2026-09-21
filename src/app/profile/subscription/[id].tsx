import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MOCK_USER, isCurrentUserPro } from "@/services/savedProviders";
import Subscription from "./subscription";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 10;
const STAT_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP * 3) / 4;

// Simple sparkline made of small bars
function MiniSparkline({
  color,
  heights,
}: {
  color: string;
  heights: number[];
}) {
  return (
    <View style={styles.sparkline}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: h,
            borderRadius: 2,
            backgroundColor: color,
            opacity: 0.75 + (i / heights.length) * 0.25,
          }}
        />
      ))}
    </View>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  change,
  sparkColor,
  sparkHeights,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  change: string;
  sparkColor: string;
  sparkHeights: number[];
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statChange}>↑ {change}</Text>
      <MiniSparkline color={sparkColor} heights={sparkHeights} />
    </View>
  );
}

function ServiceBar({
  name,
  icon,
  color,
  count,
  pct,
}: {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  count: number;
  pct: number;
}) {
  return (
    <View style={styles.serviceRow}>
      <View style={[styles.serviceIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={styles.serviceName}>{name}</Text>
      <View style={styles.serviceBarTrack}>
        <View
          style={[
            styles.serviceBarFill,
            { width: `${pct}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.servicePct}>
        {count} ({pct}%)
      </Text>
    </View>
  );
}

function ToolCard({
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  link,
  linkColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  link: string;
  linkColor: string;
}) {
  return (
    <View style={styles.toolCard}>
      <View style={[styles.toolIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDesc} numberOfLines={3}>
        {desc}
      </Text>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={[styles.toolLink, { color: linkColor }]}>
          {link} →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ActivityItem({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  time,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
      <View style={styles.activityText}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );
}

function ProDashboard() {
  const firstName = MOCK_USER.name.split(" ")[0] || "there";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Good morning, {firstName}! 👋
            </Text>
            <Text style={styles.greetingSub}>
              Here's how your business is performing today.
            </Text>
          </View>
          <View style={styles.topActions}>
            <View style={styles.proBadge}>
              <Ionicons name="trophy" size={12} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color={TEXT_DARK} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
            <Image
              source={require("@/assets/profile_1.jpg")}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          <TouchableOpacity style={styles.periodBtn} activeOpacity={0.7}>
            <Ionicons name="calendar-outline" size={14} color={TEXT_MUTED} />
            <Text style={styles.periodText}>This Week</Text>
            <Ionicons name="chevron-down" size={14} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="wallet-outline"
            iconBg="#DCFCE7"
            iconColor={PRIMARY}
            label="Total Revenue"
            value="₦458,750"
            change="15.3% vs last week"
            sparkColor={PRIMARY}
            sparkHeights={[6, 10, 8, 12, 9, 14, 11, 16]}
          />
          <StatCard
            icon="card-outline"
            iconBg="#DBEAFE"
            iconColor="#3B82F6"
            label="Total Payout"
            value="₦312,480"
            change="18.7% vs last week"
            sparkColor="#3B82F6"
            sparkHeights={[8, 6, 11, 9, 13, 10, 15, 12]}
          />
          <StatCard
            icon="eye-outline"
            iconBg="#F3E8FF"
            iconColor="#8B5CF6"
            label="Profile Views"
            value="1,243"
            change="18.8% vs last week"
            sparkColor="#8B5CF6"
            sparkHeights={[7, 11, 9, 13, 8, 14, 10, 12]}
          />
          <StatCard
            icon="people-outline"
            iconBg="#FFEDD5"
            iconColor="#F97316"
            label="New Customers"
            value="24"
            change="14.3% vs last week"
            sparkColor="#F97316"
            sparkHeights={[5, 9, 7, 12, 8, 11, 14, 10]}
          />
        </View>

        {/* Charts row */}
        <View style={styles.chartsRow}>
          {/* Bookings Trend */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Bookings Trend</Text>
              <Text style={styles.chartPeriod}>This Month ▾</Text>
            </View>
            <Text style={styles.chartBigValue}>68</Text>
            <Text style={styles.chartBigLabel}>Total Bookings</Text>
            <Text style={styles.chartChange}>↑ 12.5% vs last month</Text>
            {/* Simple line approx */}
            <View style={styles.lineChart}>
              {[12, 22, 28, 42, 48, 55, 42, 50, 58, 72].map((h, i) => (
                <View key={i} style={styles.linePointWrap}>
                  <View
                    style={[
                      styles.linePoint,
                      {
                        bottom: h * 0.7,
                        backgroundColor: "#3B82F6",
                      },
                    ]}
                  />
                </View>
              ))}
              <View style={styles.lineArea} />
            </View>
            <View style={styles.chartXLabels}>
              <Text style={styles.xLabel}>May 1</Text>
              <Text style={styles.xLabel}>May 15</Text>
              <Text style={styles.xLabel}>May 29</Text>
            </View>
          </View>

          {/* Revenue Overview */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Revenue Overview</Text>
              <Text style={styles.chartPeriod}>This Month ▾</Text>
            </View>
            <Text style={styles.chartBigValue}>₦458,750</Text>
            <Text style={styles.chartBigLabel}>Total Revenue</Text>
            <Text style={[styles.chartChange, { color: PRIMARY }]}>
              ↑ 15.3% vs last month
            </Text>
            <View style={styles.lineChart}>
              {[18, 28, 35, 42, 38, 48, 52, 58, 62, 70].map((h, i) => (
                <View key={i} style={styles.linePointWrap}>
                  <View
                    style={[
                      styles.linePoint,
                      {
                        bottom: h * 0.7,
                        backgroundColor: PRIMARY,
                      },
                    ]}
                  />
                </View>
              ))}
              <View style={[styles.lineArea, { backgroundColor: "#DCFCE7" }]} />
            </View>
            <View style={styles.chartXLabels}>
              <Text style={styles.xLabel}>May 1</Text>
              <Text style={styles.xLabel}>May 15</Text>
              <Text style={styles.xLabel}>May 29</Text>
            </View>
          </View>
        </View>

        {/* Service Performance */}
        <View style={styles.serviceCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Service Performance</Text>
            <Text style={styles.chartPeriod}>This Month ▾</Text>
          </View>
          <Text style={styles.serviceBy}>By Bookings</Text>
          <ServiceBar
            name="Plumbing"
            icon="water-outline"
            color="#3B82F6"
            count={32}
            pct={47}
          />
          <ServiceBar
            name="Electrical"
            icon="flash-outline"
            color="#F59E0B"
            count={18}
            pct={26}
          />
          <ServiceBar
            name="AC Repair"
            icon="snow-outline"
            color="#06B6D4"
            count={10}
            pct={15}
          />
          <ServiceBar
            name="Home Cleaning"
            icon="home-outline"
            color={PRIMARY}
            count={8}
            pct={12}
          />
          <TouchableOpacity activeOpacity={0.7} style={{ marginTop: 8 }}>
            <Text style={styles.viewAllLink}>View all services →</Text>
          </TouchableOpacity>
        </View>

        {/* Doovly Pro Tools */}
        <View style={styles.toolsHeader}>
          <Text style={styles.sectionTitle}>Doovly Pro Tools</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>View all tools →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolsGrid}>
          <ToolCard
            icon="hardware-chip-outline"
            iconBg="#F3E8FF"
            iconColor="#8B5CF6"
            title="AI Business Assistant"
            desc="Get AI-powered insights and recommendations to grow your business."
            link="Open Assistant"
            linkColor="#8B5CF6"
          />
          <ToolCard
            icon="bar-chart-outline"
            iconBg="#DBEAFE"
            iconColor="#3B82F6"
            title="Booking Intelligence"
            desc="Analyze bookings and discover trends to make smarter decisions."
            link="View Analytics"
            linkColor="#3B82F6"
          />
          <ToolCard
            icon="people-outline"
            iconBg="#FFEDD5"
            iconColor="#F97316"
            title="Customer Leads"
            desc="Manage and track potential customers interested in your services."
            link="View Leads"
            linkColor="#F97316"
          />
          <ToolCard
            icon="calendar-outline"
            iconBg="#DCFCE7"
            iconColor={PRIMARY}
            title="Smart Availability"
            desc="Manage your availability and optimize your working schedule."
            link="Manage Availability"
            linkColor={PRIMARY}
          />
          <ToolCard
            icon="star-outline"
            iconBg="#FEF3C7"
            iconColor="#D97706"
            title="Review Insights"
            desc="Analyze customer reviews and improve your service quality."
            link="View Insights"
            linkColor="#D97706"
          />
          <ToolCard
            icon="megaphone-outline"
            iconBg="#FCE7F3"
            iconColor="#DB2777"
            title="Smart Boost"
            desc="Increase your profile visibility and get more bookings."
            link="Activate Boost"
            linkColor="#DB2777"
          />
        </View>

        {/* AI Insight + Recent Activity */}
        <View style={styles.bottomRow}>
          <View style={styles.aiCard}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>New</Text>
            </View>
            <Text style={styles.aiTitle}>AI Business Insight</Text>
            <View style={styles.aiBody}>
              <View style={styles.robotCircle}>
                <Ionicons name="hardware-chip" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.aiText}>
                Your bookings on Saturday are 24% higher than your weekday
                average. Consider opening more Saturday availability to maximize
                your earnings.
              </Text>
            </View>
            <TouchableOpacity style={styles.aiBtn} activeOpacity={0.85}>
              <Text style={styles.aiBtnText}>View Full Analysis →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.chartTitle}>Recent Activity</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.viewAllLink}>View all</Text>
              </TouchableOpacity>
            </View>
            <ActivityItem
              icon="calendar-outline"
              iconBg="#DCFCE7"
              iconColor={PRIMARY}
              title="New booking request received"
              subtitle="Plumbing Service · Sarah Johnson"
              time="10 min ago"
            />
            <ActivityItem
              icon="person-outline"
              iconBg="#DBEAFE"
              iconColor="#3B82F6"
              title="New customer joined"
              subtitle="Michael O. · Electrical Service"
              time="1 hour ago"
            />
            <ActivityItem
              icon="checkmark-circle-outline"
              iconBg="#F3E8FF"
              iconColor="#8B5CF6"
              title="Task completed"
              subtitle="AC Repair · Booking #B-1285"
              time="3 hours ago"
            />
            <ActivityItem
              icon="star-outline"
              iconBg="#FEF3C7"
              iconColor="#D97706"
              title="New review received"
              subtitle="5.0 ★★★★★ · Plumbing Service"
              time="5 hours ago"
            />
          </View>
        </View>

        {/* Bottom metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.metricLabel}>Response Time</Text>
            <Text style={styles.metricValue}>2.4 hrs</Text>
            <Text style={[styles.metricStatus, { color: PRIMARY }]}>Good</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="stats-chart-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.metricLabel}>Conversion Rate</Text>
            <Text style={styles.metricValue}>27%</Text>
            <Text style={[styles.metricStatus, { color: PRIMARY }]}>
              ↑ 6.5%
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="people-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.metricLabel}>Lead Conversion</Text>
            <Text style={styles.metricValue}>18%</Text>
            <Text style={[styles.metricStatus, { color: PRIMARY }]}>
              ↑ 4.2%
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="cash-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.metricLabel}>Earnings (This Month)</Text>
            <Text style={styles.metricValue}>₦458,750</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SubscriptionRoute() {
  // If user is Pro (from professional mock data) → show analytics dashboard
  // Else → show subscription plans
  if (isCurrentUserPro()) {
    return <ProDashboard />;
  }
  return <Subscription />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Header
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  greetingSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  periodRow: {
    marginBottom: 14,
  },
  periodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  periodText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    marginBottom: 14,
  },
  statCard: {
    width: STAT_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 2,
  },
  statChange: {
    fontSize: 9,
    color: PRIMARY,
    marginTop: 2,
  },
  sparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
    marginTop: 6,
  },
  chartsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  chartCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  chartPeriod: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  chartBigValue: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  chartBigLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  chartChange: {
    fontSize: 11,
    color: "#3B82F6",
    marginBottom: 8,
  },
  lineChart: {
    height: 70,
    flexDirection: "row",
    alignItems: "flex-end",
    position: "relative",
  },
  linePointWrap: {
    flex: 1,
    height: "100%",
    position: "relative",
  },
  linePoint: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    left: "50%",
    marginLeft: -3,
  },
  lineArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    backgroundColor: "#DBEAFE",
    opacity: 0.3,
    borderRadius: 8,
  },
  chartXLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  xLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  serviceBy: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  serviceIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: {
    width: 80,
    fontSize: 12,
    color: TEXT_DARK,
  },
  serviceBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  serviceBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  servicePct: {
    width: 50,
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "right",
  },
  viewAllLink: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
  },
  toolsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  toolCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  toolTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  toolDesc: {
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 15,
    marginBottom: 8,
  },
  toolLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomRow: {
    gap: 10,
    marginBottom: 14,
  },
  aiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
  },
  aiBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  aiBody: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  robotCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  aiText: {
    flex: 1,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },
  aiBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  aiBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  activitySub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  activityTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },

  // Metrics
  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metricLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_DARK,
  },
  metricStatus: {
    fontSize: 10,
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E5E7EB",
  },
});
