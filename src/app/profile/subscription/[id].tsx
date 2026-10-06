import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { getCurrentUser, isCurrentUserPro } from "@/services/savedProviders";
import Subscription from "./subscription";
import {
  getCustomerInfo,
  hasProEntitlement,
  restorePurchases,
  PRO_ENTITLEMENT,
} from "@/lib/revenuecat";

const PRIMARY = "#159447";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";

function ActiveSubscription() {
  const user = getCurrentUser();
  const firstName = (user.name || "there").split(" ")[0];
  const [restoring, setRestoring] = useState(false);
  const [planLabel, setPlanLabel] = useState("Doovly Pro");
  const [expiresLabel, setExpiresLabel] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const info = await getCustomerInfo();
          if (!active || !info) return;
          const ent = info.entitlements.active[PRO_ENTITLEMENT];
          if (ent) {
            if (ent.productIdentifier) {
              setPlanLabel(
                ent.productIdentifier.toLowerCase().includes("year")
                  ? "Doovly Pro · Yearly"
                  : "Doovly Pro · Monthly",
              );
            }
            if (ent.expirationDate) {
              const d = new Date(ent.expirationDate);
              setExpiresLabel(
                d.toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              );
            }
          }
        } catch {
          // keep defaults
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (hasProEntitlement(info)) {
        Alert.alert("Restored", "Your Pro subscription is active.");
      } else {
        Alert.alert("No purchases found", "We could not find an active subscription.");
      }
    } catch {
      Alert.alert("Restore failed", "Please try again later.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero status card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="checkmark-circle" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Subscription active</Text>
          <Text style={styles.heroSub}>
            You’re on {planLabel}. Enjoy full Pro tools, {firstName}.
          </Text>
          {expiresLabel ? (
            <View style={styles.renewPill}>
              <Ionicons name="calendar-outline" size={14} color={PRIMARY} />
              <Text style={styles.renewText}>Renews {expiresLabel}</Text>
            </View>
          ) : (
            <View style={styles.renewPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={PRIMARY} />
              <Text style={styles.renewText}>Pro access unlocked</Text>
            </View>
          )}
        </View>

        {/* Benefits */}
        <Text style={styles.sectionLabel}>What’s included</Text>
        <View style={styles.benefitsCard}>
          {[
            { icon: "infinite-outline" as const, title: "Unlimited saves", desc: "Save as many providers as you need" },
            { icon: "flash-outline" as const, title: "Priority visibility", desc: "Appear higher in search & requests" },
            { icon: "analytics-outline" as const, title: "Pro insights", desc: "Booking trends and performance tools" },
            { icon: "headset-outline" as const, title: "Priority support", desc: "Faster help when you need it" },
          ].map((item, i, arr) => (
            <View
              key={item.title}
              style={[
                styles.benefitRow,
                i === arr.length - 1 && styles.benefitRowLast,
              ]}
            >
              <View style={styles.benefitIcon}>
                <Ionicons name={item.icon} size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{item.title}</Text>
                <Text style={styles.benefitDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.85}
        >
          {restoring ? (
            <ActivityIndicator color={PRIMARY} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color={PRIMARY} />
              <Text style={styles.secondaryBtnText}>Restore purchases</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Manage or cancel anytime in your App Store or Google Play subscription settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SubscriptionRoute() {
  // Pro users see the active-subscription status UI.
  // Everyone else sees the existing plans / upgrade screen (untouched).
  if (isCurrentUserPro()) {
    return <ActiveSubscription />;
  }
  return <Subscription />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  heroCard: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  renewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  renewText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  benefitsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 12,
  },
  benefitRowLast: {
    borderBottomWidth: 0,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "650",
    color: TEXT_DARK,
  },
  benefitDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 28,
    paddingVertical: 14,
    marginBottom: 16,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
  },
  footerNote: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
  },
});
