import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import {
  getSubscriptionPlans,
  type BillingPeriod,
  type SubscriptionPlansState,
} from "@/services/subscriptionPlans";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function FeatureRow({ label }: { label: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

export default function Subscription() {
  const [plansState, setPlansState] = useState<SubscriptionPlansState>(() =>
    getSubscriptionPlans(),
  );
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  // Reload when screen is focused so Admin Settings changes apply immediately
  useFocusEffect(
    useCallback(() => {
      setPlansState(getSubscriptionPlans());
    }, []),
  );

  const basic = plansState.plans.find((p) => p.id === "basic")!;
  const pro = plansState.plans.find((p) => p.id === "pro")!;

  const proPrice =
    period === "monthly" ? pro.monthlyPrice : pro.yearlyPrice;
  const proPeriodLabel = period === "monthly" ? "/ month" : "/ year";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Subscription</Text>
          <Text style={styles.headerSubtitle}>
            Choose a plan that fits your needs
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Promo banner from admin-editable mock */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="ribbon" size={22} color="#F59E0B" />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>{plansState.promoTitle}</Text>
            <Text style={styles.bannerSubtitle}>{plansState.promoSubtitle}</Text>
          </View>
          <Ionicons name="rocket" size={28} color={PRIMARY} />
        </View>

        {/* Monthly / Yearly toggle */}
        <View style={styles.periodRow}>
          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[styles.periodBtn, period === "monthly" && styles.periodBtnActive]}
              onPress={() => setPeriod("monthly")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  period === "monthly" && styles.periodBtnTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodBtn, period === "yearly" && styles.periodBtnActive]}
              onPress={() => setPeriod("yearly")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  period === "yearly" && styles.periodBtnTextActive,
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
          {plansState.yearlySavePercent > 0 && (
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>
                Save up to {plansState.yearlySavePercent}% with yearly plan
              </Text>
            </View>
          )}
        </View>

        {/* Plans */}
        <View style={styles.plansRow}>
          {/* Basic */}
          <View style={styles.planCard}>
            <View style={styles.planIconFree}>
              <Ionicons name="person" size={28} color="#9CA3AF" />
            </View>
            <Text style={styles.planName}>{basic.name}</Text>
            <Text style={styles.planTagline}>{basic.tagline}</Text>
            <Text style={styles.planPrice}>{formatNaira(basic.monthlyPrice)}</Text>
            <Text style={styles.planPeriod}>/ month</Text>

            <View style={styles.featuresList}>
              {basic.features.map((f) => (
                <FeatureRow key={f.id} label={f.label} />
              ))}
            </View>

            <View style={styles.currentPlanBtn}>
              <Text style={styles.currentPlanText}>Current Plan</Text>
            </View>
          </View>

          {/* Pro */}
          <View style={[styles.planCard, styles.planCardPro]}>
            {pro.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}

            <View style={styles.planIconPro}>
              <Ionicons name="ribbon" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.planName}>{pro.name}</Text>
            <Text style={styles.planTagline}>{pro.tagline}</Text>

            <View style={styles.pricePills}>
              <View
                style={[
                  styles.pricePill,
                  period === "monthly" && styles.pricePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.pricePillMain,
                    period === "monthly" && styles.pricePillMainActive,
                  ]}
                >
                  {formatNaira(pro.monthlyPrice)}
                </Text>
                <Text
                  style={[
                    styles.pricePillSub,
                    period === "monthly" && styles.pricePillSubActive,
                  ]}
                >
                  / month
                </Text>
              </View>
              <View
                style={[
                  styles.pricePill,
                  period === "yearly" && styles.pricePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.pricePillMain,
                    period === "yearly" && styles.pricePillMainActive,
                  ]}
                >
                  {formatNaira(pro.yearlyPrice)}
                </Text>
                <Text
                  style={[
                    styles.pricePillSub,
                    period === "yearly" && styles.pricePillSubActive,
                  ]}
                >
                  / year
                </Text>
                {plansState.yearlySavePercent > 0 && (
                  <Text style={styles.pricePillSave}>
                    Save {plansState.yearlySavePercent}%
                  </Text>
                )}
              </View>
            </View>

            <Text style={styles.selectedPrice}>
              {formatNaira(proPrice)}{" "}
              <Text style={styles.selectedPricePeriod}>{proPeriodLabel}</Text>
            </Text>

            <View style={styles.featuresList}>
              {pro.features.map((f) => (
                <FeatureRow key={f.id} label={f.label} />
              ))}
            </View>

            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.85}
              onPress={() => {
                // TODO: payment flow — will use proPrice + period from plans mock/API
              }}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* What you get */}
        <Text style={styles.sectionTitle}>What you get with Pro</Text>
        <Text style={styles.sectionSubtitle}>
          Powerful tools to help you get more jobs and grow faster.
        </Text>

        <View style={styles.benefitsGrid}>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="rocket" size={18} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Priority Visibility</Text>
              <Text style={styles.benefitDesc}>Get noticed by more clients</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="bar-chart" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>More Opportunities</Text>
              <Text style={styles.benefitDesc}>Access exclusive job requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: "#FFEDD5" }]}>
              <Ionicons name="briefcase" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Advanced Analytics</Text>
              <Text style={styles.benefitDesc}>
                Track your views, applications and earnings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="star" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Portfolio Boost</Text>
              <Text style={styles.benefitDesc}>
                Showcase your best work and stand out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark-outline" size={14} color={PRIMARY} />
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="lock-closed-outline" size={14} color={PRIMARY} />
            <Text style={styles.trustText}>Secure payment</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="card-outline" size={14} color={PRIMARY} />
            <Text style={styles.trustText}>Multiple payment options</Text>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextCol: { flex: 1 },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 3,
  },
  bannerSubtitle: { fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },

  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    padding: 4,
  },
  periodBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodBtnText: { fontSize: 13, fontWeight: "600", color: TEXT_MUTED },
  periodBtnTextActive: { color: "#FFFFFF" },
  saveBadge: {
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  saveBadgeText: { fontSize: 11, fontWeight: "700", color: PRIMARY },

  plansRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  planCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    paddingTop: 18,
  },
  planCardPro: {
    borderColor: PRIMARY,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  planIconFree: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  planIconPro: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  planName: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
  },
  planTagline: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
  },
  planPeriod: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 12,
  },
  pricePills: { gap: 6, marginBottom: 8 },
  pricePill: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  pricePillActive: {
    borderColor: PRIMARY,
    backgroundColor: "#ECFDF5",
  },
  pricePillMain: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
  },
  pricePillMainActive: { color: PRIMARY },
  pricePillSub: {
    fontSize: 10,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  pricePillSubActive: { color: PRIMARY },
  pricePillSave: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
    textAlign: "center",
    marginTop: 2,
  },
  selectedPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: PRIMARY,
    textAlign: "center",
    marginBottom: 12,
  },
  selectedPricePeriod: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  featuresList: { gap: 8, marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 12, color: TEXT_DARK, flex: 1 },
  currentPlanBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  currentPlanText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  upgradeBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  upgradeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  benefitsGrid: { gap: 10, marginBottom: 20 },
  benefitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: { fontSize: 13, fontWeight: "700", color: TEXT_DARK },
  benefitDesc: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },

  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingTop: 4,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { fontSize: 11, color: TEXT_MUTED, fontWeight: "500" },
});
