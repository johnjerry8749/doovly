import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { getCurrentUserId } from "@/services/inAppNotifications";
import { getProfessionalById } from "@/services/professionals";
import {
  getCurrentUser,
  getCurrentUserRole,
  getLoggedInProfessionalId,
  isCurrentUserPro,
} from "@/services/savedProviders";
import { listMyServiceRequests } from "@/services/serviceRequests";

const PRIMARY = "#159447";
const GOLD = "#D4AF37";

type MenuItemProps = {
  icon: React.ReactNode;
  title: string;
  rightText?: string;
  rightColor?: string;
  badge?: number;
  onPress?: () => void;
};

function MenuItem({
  icon,
  title,
  rightText,
  rightColor = PRIMARY,
  badge,
  onPress,
}: MenuItemProps) {
  const badgeBg =
    rightColor === PRIMARY
      ? "#DCFCE7"
      : rightColor === "#7C3AED"
        ? "#F3E8FF"
        : "#F3F4F6";

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <View style={styles.iconWrapper}>{icon}</View>

        <Text style={styles.menuTitle}>{title}</Text>
      </View>

      <View style={styles.menuRight}>
        {rightText ? (
          <View style={[styles.rightBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.rightBadgeText, { color: rightColor }]}>
              {rightText}
            </Text>
          </View>
        ) : null}

        {badge ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{badge}</Text>
          </View>
        ) : null}

        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

function MenuIcon({
  name,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.iconBg}>
      <Ionicons name={name} size={18} color={PRIMARY} />
    </View>
  );
}

export default function Profile() {
  const [isAvailable, setIsAvailable] = useState(true);

  const role = getCurrentUserRole();
  const proId = getLoggedInProfessionalId();
  const pro = proId ? getProfessionalById(proId) : undefined;
  const isPro = isCurrentUserPro();
  const requestCount = listMyServiceRequests().length;

  if (!pro) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Professional profile not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const goToSubscription = () => {
    router.push({
      pathname: "/profile/subscription/[id]",
      params: { id: String(pro.id) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* =========================
          FIXED HEADER
      ========================== */}
      <View style={styles.header}>
        <View style={styles.profileHeaderContent}>
          <View style={styles.avatarWrapper}>
            <Image
              source={pro.image}
              style={styles.avatar}
            />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{pro.name}</Text>

              {isPro ? (
                <MaterialCommunityIcons
                  name="shield-check"
                  size={18}
                  color={GOLD}
                  style={styles.premiumShield}
                />
              ) : null}
            </View>

            <Text style={styles.role}>{pro.profession}</Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color="#6B7280"
              />
              <Text style={styles.location}>
                {pro.city}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.8}
          onPress={() => router.push("/profile/edit_profile")}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={PRIMARY}
          />
          <Text style={styles.editButtonText}>
            Edit Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================
          SCROLLABLE CONTENT
      ========================== */}
      <View style={styles.scrollArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PRO BANNER */}
          {!isPro ? (
            <View style={styles.proBanner}>
              <View style={styles.proLeft}>
                <View style={styles.crownCircle}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={18}
                    color={GOLD}
                  />
                </View>

                <View style={styles.proTextContainer}>
                  <Text style={styles.proTitle}>
                    Upgrade to Doovly Pro
                  </Text>
                  <Text style={styles.proSubtitle}>
                    Get more bookings & visibility
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.proButton}
                activeOpacity={0.85}
                onPress={goToSubscription}
              >
                <Text style={styles.proButtonText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* AVAILABILITY */}
          <Text style={styles.sectionTitle}>
            Availability
          </Text>

          <View style={styles.card}>
            <MenuItem
              icon={
                <MenuIcon name="radio-button-on-outline" />
              }
              title="Available for work"
              rightText={isAvailable ? "On" : "Off"}
              rightColor={isAvailable ? PRIMARY : "#6B7280"}
              onPress={() => setIsAvailable((v) => !v)}
            />
          </View>

          {/* SERVICES */}
          <Text style={styles.sectionTitle}>
            Services
          </Text>

          <View style={styles.card}>
            <MenuItem
              icon={
                <MenuIcon name="add-circle-outline" />
              }
              title="Add Service"
              onPress={() =>
                router.push("/profile/addservice")
              }
            />

            <MenuItem
              icon={
                <MenuIcon name="list-outline" />
              }
              title="My Service Requests"
              badge={requestCount || undefined}
              onPress={() =>
                router.push(
                  "/profile/my_service_requests",
                )
              }
            />

            <MenuItem
              icon={
                <MenuIcon name="calendar-outline" />
              }
              title="My Bookings"
              onPress={() =>
                router.push("/(tab)/bookings")
              }
            />
          </View>

          {/* PORTFOLIO & SOCIAL */}
          <Text style={styles.sectionTitle}>
            Portfolio & Social
          </Text>

          <View style={styles.card}>
            <MenuItem
              icon={
                <MenuIcon name="images-outline" />
              }
              title="Portfolio Gallery"
              onPress={() =>
                router.push(
                  "/profile/portfolio_gallery",
                )
              }
            />

            <MenuItem
              icon={
                <MenuIcon name="bookmark-outline" />
              }
              title="Saved Providers"
              onPress={() =>
                router.push(
                  "/profile/saved_providers",
                )
              }
            />

            <MenuItem
              icon={
                <MenuIcon name="chatbubble-outline" />
              }
              title="Messages"
              onPress={() =>
                router.push("/profile/chat")
              }
            />
          </View>

          {/* ACCOUNT & SUBSCRIPTION */}
          <Text style={styles.sectionTitle}>
            Account & Subscription
          </Text>

          <View style={styles.card}>
            <MenuItem
              icon={
                <MenuIcon name="diamond-outline" />
              }
              title="Subscription"
              rightText={isPro ? "Pro" : "Free"}
              rightColor={isPro ? GOLD : "#6B7280"}
              onPress={goToSubscription}
            />

            <MenuItem
              icon={
                <MenuIcon name="shield-checkmark-outline" />
              }
              title="Verification"
              rightText={
                pro.verified
                  ? "Verified"
                  : "Not Verified"
              }
              rightColor={
                pro.verified
                  ? PRIMARY
                  : "#6B7280"
              }
              onPress={() =>
                router.push(
                  "/profile/verification",
                )
              }
            />
          </View>

          {/* PREFERENCES & SUPPORT */}
          <Text style={styles.sectionTitle}>
            Preferences & Support
          </Text>

          <View style={styles.card}>
            <MenuItem
              icon={
                <MenuIcon name="settings-outline" />
              }
              title="Settings"
              onPress={() =>
                router.push("/profile/settings")
              }
            />

            <MenuItem
              icon={
                <MenuIcon name="help-circle-outline" />
              }
              title="Help & Support"
              onPress={() =>
                router.push(
                  "/profile/help_support",
                )
              }
            />
          </View>

          {/* LOG OUT */}
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#EF4444"
            />

            <Text style={styles.logoutText}>
              Log Out
            </Text>
          </TouchableOpacity>

          {/* ADMIN */}
          {role === "admin" && (
            <TouchableOpacity
              style={styles.adminloginButton}
              activeOpacity={0.8}
              onPress={() => router.push("/admin")}
            >
              <Ionicons
                name="shield-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.adminloginText}>
                Admin Login
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    marginBottom: 35,
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 15,
    color: "#6B7280",
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  profileHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarWrapper: {
    marginRight: 14,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E5E7EB",
  },

  profileInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  premiumShield: {
    marginLeft: 6,
  },

  role: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },

  location: {
    fontSize: 13,
    color: "#6B7280",
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    gap: 6,
  },

  editButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },

  scrollArea: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  proBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#111827",
  },

  proLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  crownCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  proTextContainer: {
    flex: 1,
  },

  proTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  proSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  proButton: {
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  proButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconWrapper: {
    marginRight: 12,
  },

  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  rightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  rightBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  notificationBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  notificationBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },

  adminloginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY,
  },

  adminloginText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  bottomSpace: {
    height: 40,
  },
});
