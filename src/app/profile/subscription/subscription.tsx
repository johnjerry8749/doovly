import React from "react";
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
import { router } from "expo-router";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const FREE_FEATURES = [
  { label: "Create job request", included: true },
  { label: "Browse providers", included: true },
  { label: "Chat & book", included: true },
  { label: "Basic profile", included: true },
  { label: "Priority visibility", included: false },
];

const PRO_FEATURES = [
  { label: "All Free features", included: true },
  { label: "Priority visibility", included: true },
  { label: "More job requests", included: true },
  { label: "Showcase portfolio", included: true },
  { label: "Advanced analytics", included: true },
  { label: "Dedicated support", included: true },
];

function FeatureRow({
  label,
  included,
}: {
  label: string;
  included: boolean;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={included ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={included ? PRIMARY : "#D1D5DB"}
      />
      <Text
        style={[
          styles.featureText,
          !included && styles.featureTextMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function Subscription() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Upgrade banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="trophy" size={22} color="#F59E0B" />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>Upgrade to Doovly Pro</Text>
            <Text style={styles.bannerSubtitle}>
              Get more opportunities, more visibility and grow your business.
            </Text>
          </View>
          <View style={styles.bannerChart}>
            <View style={[styles.bar, { height: 12 }]} />
            <View style={[styles.bar, { height: 18 }]} />
            <View style={[styles.bar, { height: 26 }]} />
            <Ionicons
              name="trending-up"
              size={16}
              color={PRIMARY}
              style={styles.trendIcon}
            />
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Choose a Plan</Text>
        <Text style={styles.sectionSubtitle}>
          Simple plans. More opportunities.
        </Text>

        {/* Plans row */}
        <View style={styles.plansRow}>
          {/* Free card */}
          <View style={styles.planCard}>
            <View style={styles.planIconFree}>
              <Ionicons name="person" size={28} color="#9CA3AF" />
            </View>
            <Text style={styles.planName}>Free</Text>
            <Text style={styles.planTagline}>Get started</Text>
            <Text style={styles.planPrice}>₦0</Text>
            <Text style={styles.planPeriod}>per month</Text>

            <View style={styles.featuresList}>
              {FREE_FEATURES.map((f) => (
                <FeatureRow
                  key={f.label}
                  label={f.label}
                  included={f.included}
                />
              ))}
            </View>

            <View style={styles.currentPlanBtn}>
              <Text style={styles.currentPlanText}>Current Plan</Text>
            </View>
          </View>

          {/* Pro card */}
          <View style={[styles.planCard, styles.planCardPro]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popular</Text>
            </View>

            <View style={styles.planIconPro}>
              <Ionicons name="trophy" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.planName}>Pro</Text>
            <Text style={styles.planTagline}>For more opportunities</Text>
            <Text style={[styles.planPrice, { color: PRIMARY }]}>₦2,500</Text>
            <Text style={styles.planPeriod}>per month</Text>

            <View style={styles.featuresList}>
              {PRO_FEATURES.map((f) => (
                <FeatureRow
                  key={f.label}
                  label={f.label}
                  included={f.included}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.85}
              onPress={() => {
                // TODO: wire up payment / upgrade flow
              }}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safe payment banner */}
        <View style={styles.secureBanner}>
          <View style={styles.secureIcon}>
            <Ionicons name="shield-checkmark" size={20} color={PRIMARY} />
          </View>
          <View style={styles.secureTextCol}>
            <Text style={styles.secureTitle}>Safe & Secure Payment</Text>
            <Text style={styles.secureSubtitle}>
              Your payments are encrypted and secure.
            </Text>
          </View>
        </View>

        {/* Help link */}
        <TouchableOpacity
          style={styles.helpRow}
          activeOpacity={0.7}
          onPress={() => router.push("/profile/help_support")}
        >
          <Text style={styles.helpText}>
            Need help?{" "}
            <Text style={styles.helpLink}>Contact Support</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 22,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 3,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },
  bannerChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 28,
  },
  bar: {
    width: 6,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  trendIcon: {
    marginLeft: 2,
    marginBottom: 4,
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 16,
  },

  // Plans
  plansRow: {
    flexDirection: "row",
    gap: 12,
  },
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
  popularText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
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
    marginBottom: 10,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
  },
  planPeriod: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 14,
  },
  featuresList: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: TEXT_DARK,
    flex: 1,
  },
  featureTextMuted: {
    color: "#9CA3AF",
  },
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

  // Secure banner
  secureBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  secureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  secureTextCol: {
    flex: 1,
  },
  secureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  secureSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
  },

  // Help
  helpRow: {
    alignItems: "center",
    marginTop: 20,
  },
  helpText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  helpLink: {
    color: PRIMARY,
    fontWeight: "600",
  },
});
