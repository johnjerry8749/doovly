import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import {
  getSubscriptionPlans,
  getSubscriptionPlansAsync,
  type BillingPeriod,
  type SubscriptionPlansState,
  type SubscriptionPlanConfig,
} from "@/services/subscriptionPlans";
import {
  addCustomerInfoListener,
  getCustomerInfo,
  getProPackages,
  isPro,
  purchasePackage,
  restorePurchases,
} from "@/lib/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";
import { isCurrentUserPro } from "@/services/savedProviders";
import { loadSessionUser } from "@/lib/session";

const PRIMARY = "#159447";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const EMPTY_PLAN: SubscriptionPlanConfig = { id: "basic", name: "", tagline: "", monthlyPrice: 0, yearlyPrice: 0, popular: false, features: [] };

type CompareRow = {
  id: string;
  label: string;
  free: boolean;
  pro: boolean;
};

export default function Subscription() {
  const [plansState, setPlansState] = useState<SubscriptionPlansState>(() =>
    getSubscriptionPlans(),
  );
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [proActive, setProActive] = useState(false);

  useEffect(() => {
    let active = true;
    const removeListener = addCustomerInfoListener((info) => {
      if (active) setProActive(isCurrentUserPro());
    });

    void (async () => {
      try {
        const [packages] = await Promise.all([
          getProPackages(),
          loadSessionUser(true).then(() => getCustomerInfo()),
        ]);
        if (!active) return;
        setMonthlyPackage(packages.monthly);
        setYearlyPackage(packages.yearly);
        setProActive(isCurrentUserPro());
        if (!packages.monthly || !packages.yearly) {
          Alert.alert("Subscriptions unavailable", "Subscription packages are not available right now. Please try again later.");
        }
      } catch (error) {
        if (active) {
          Alert.alert("Subscriptions unavailable", error instanceof Error ? error.message : "Could not load subscription products.");
        }
      } finally {
        if (active) setProductsLoading(false);
      }
    })();

    return () => {
      active = false;
      removeListener();
    };
  }, []);

  const selectedPackage = period === "monthly" ? monthlyPackage : yearlyPackage;
  const selectedPrice = selectedPackage?.product.priceString ?? "";
  const periodWord = period === "monthly" ? "monthly" : "yearly";

  async function handlePurchase() {
    if (!selectedPackage || purchasing) return;
    setPurchasing(true);
    try {
      const info = await purchasePackage(selectedPackage);
      if (isPro(info)) {
        await loadSessionUser(true);
        setProActive(isCurrentUserPro());
      } else {
        Alert.alert("Pro not confirmed", "Purchase completed, but Pro access has not been confirmed yet. Please use Restore Purchases.");
      }
    } catch (error) {
      const purchaseError = error as { userCancelled?: boolean; code?: string; message?: string };
      if (purchaseError.userCancelled || purchaseError.code === "PURCHASE_CANCELLED_ERROR") {
        return;
      }
      Alert.alert("Purchase failed", purchaseError.message || "Your purchase could not be completed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    try {
      const info = await restorePurchases();
      await loadSessionUser(true);
      const active = isCurrentUserPro();
      setProActive(active);
      if (active) {
        Alert.alert("Purchases restored", "Doovly Pro is active on this account.");
      } else {
        Alert.alert("No active subscription", "No active Doovly Pro subscription was found for this account.");
      }
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Could not restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  }

  useEffect(() => {
    let active = true;

    getSubscriptionPlansAsync()
      .then((next) => {
        if (active) setPlansState(next);
      })
      .catch((error) => {
        console.warn("Subscription plans load failed:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSubscriptionPlansAsync(true)
        .then((next) => setPlansState(next))
        .catch((error) => console.warn("Subscription plans refresh failed:", error));
    }, []),
  );

  const pro = plansState.plans.find((p) => p.id === "pro") ?? { ...EMPTY_PLAN, id: "pro" as const };
  const basic = plansState.plans.find((p) => p.id === "basic") ?? EMPTY_PLAN;

  /** Merge Basic + Pro features into comparison rows */
  const rows: CompareRow[] = useMemo(() => {
    const basicLabels = new Set(basic.features.map((f) => f.label.toLowerCase()));
    const seen = new Set<string>();
    const out: CompareRow[] = [];

    // Free features first
    for (const f of basic.features) {
      const key = f.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: f.id,
        label: f.label,
        free: true,
        pro: true,
      });
    }
    // Pro-only features
    for (const f of pro.features) {
      const key = f.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: f.id,
        label: f.label,
        free: basicLabels.has(key),
        pro: true,
      });
    }
    return out;
  }, [basic.features, pro.features]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Get Doovly Pro</Text>
          <Text style={styles.headerSubtitle}>
            {plansState.promoSubtitle || "Do more with advanced tools"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Monthly / Yearly toggle (like Go / Plus) */}
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[
              styles.periodSegment,
              period === "monthly" && styles.periodSegmentActive,
            ]}
            onPress={() => setPeriod("monthly")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.periodSegmentText,
                period === "monthly" && styles.periodSegmentTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodSegment,
              period === "yearly" && styles.periodSegmentActive,
            ]}
            onPress={() => setPeriod("yearly")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.periodSegmentText,
                period === "yearly" && styles.periodSegmentTextActive,
              ]}
            >
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features comparison table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderLabel, { flex: 1 }]}>Features</Text>
            <Text style={styles.colHeader}>Free</Text>
            <Text style={[styles.colHeader, styles.colHeaderPro]}>Pro</Text>
          </View>

          {rows.map((row, index) => (
            <View
              key={row.id}
              style={[
                styles.tableRow,
                index === rows.length - 1 && styles.tableRowLast,
              ]}
            >
              <Text style={styles.featureLabel}>{row.label}</Text>
              <View style={styles.colCell}>
                {row.free ? (
                  <Ionicons name="checkmark" size={18} color={TEXT_MUTED} />
                ) : (
                  <Text style={styles.dash}>—</Text>
                )}
              </View>
              <View style={styles.colCell}>
                {row.pro ? (
                  <Ionicons name="checkmark" size={18} color={PRIMARY} />
                ) : (
                  <Text style={styles.dash}>—</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Existing paywall, now connected to the current RevenueCat offering. */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.upgradeBtn, (productsLoading || purchasing || !selectedPackage || proActive) && styles.upgradeBtnDisabled]}
          activeOpacity={0.85}
          disabled={productsLoading || purchasing || !selectedPackage || proActive}
          onPress={handlePurchase}
        >
          <Text style={styles.upgradeBtnText}>
            {productsLoading ? "Loading subscription…" : purchasing ? "Processing…" : proActive ? "Pro is active" : selectedPrice ? `Upgrade for ${selectedPrice}` : "Subscription unavailable"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          Auto-renews {periodWord}. Cancel anytime.{" "}
          <Text onPress={handleRestore} style={styles.restoreInlineText}>
            {restoring ? "Restoring…" : "Restore Purchases"}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  periodToggle: {
    flexDirection: "row",
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#F3F4F6",
    borderRadius: 28,
    padding: 4,
    marginBottom: 20,
  },
  periodSegment: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  periodSegmentActive: {
    backgroundColor: PRIMARY,
  },
  periodSegmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_MUTED,
    textAlign: "center",
    includeFontPadding: false,
  },
  periodSegmentTextActive: {
    color: "#FFFFFF",
  },

  table: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    backgroundColor: "#F9FAFB",
  },
  tableHeaderLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  colHeader: {
    width: 52,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  colHeaderPro: {
    color: PRIMARY,
    fontWeight: "800",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_DARK,
    paddingRight: 8,
    lineHeight: 20,
  },
  colCell: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  dash: {
    fontSize: 16,
    color: "#D1D5DB",
    fontWeight: "600",
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  upgradeBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  upgradeBtnDisabled: {
    opacity: 0.55,
  },
  restoreInlineText: {
    color: PRIMARY,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 10,
  },
});
