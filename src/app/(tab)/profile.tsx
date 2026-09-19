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
import { getProfessionalById } from "@/services/professionals";

// =====================================================
// COLORS
// =====================================================

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const GOLD = "#D4AF37";

// =====================================================
// MOCK DATA — later replace with auth / API
// =====================================================

const MOCK_LOGGED_IN_PRO_ID = "1";
const MOCK_ROLE: "user" | "admin" = "admin"; // set to "user" to hide Admin Login

// =====================================================
// MENU ITEM
// =====================================================

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

// =====================================================
// PROFILE SCREEN
// =====================================================

export default function Profile() {
  const [isAvailable, setIsAvailable] = useState(true);

  // Mock role + professional — later: from auth context / API
  const role = MOCK_ROLE;
  const pro = getProfessionalById(MOCK_LOGGED_IN_PRO_ID);

  if (!pro) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Professional profile not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <View style={styles.profileHeaderContent}>
            <View style={styles.avatarWrapper}>
              <Image
                source={pro.image}
                style={styles.avatar}
                resizeMode="cover"
              />

              {pro.verified && (
                <View style={styles.verifiedBadge}>
                  <Image
                    source={require("@/assets/premium/checkmark.png")}
                    style={styles.checkmarkImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{pro.name}</Text>

                {pro.subscribed && (
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={23}
                    color={GOLD}
                    style={styles.premiumShield}
                  />
                )}
              </View>

              <Text style={styles.role}>{pro.profession}</Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.location}>{pro.city}, Nigeria</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
            onPress={() => router.push("/profile/edit_profile")}
          >
            <Ionicons name="pencil" size={16} color={PRIMARY} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ========== DOOVLY PRO (only if not subscribed) ========== */}
        {!pro.subscribed && (
          <View style={styles.proBanner}>
            <View style={styles.proLeft}>
              <View style={styles.crownCircle}>
                <MaterialCommunityIcons
                  name="crown"
                  size={22}
                  color="#F59E0B"
                />
              </View>

              <View style={styles.proTextContainer}>
                <Text style={styles.proTitle}>Doovly Pro</Text>
                <Text style={styles.proSubtitle}>
                  Get more bookings, more visibility and premium features.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.upgradeButton}
              activeOpacity={0.85}
              onPress={() => router.push("/profile/subscription/subscription")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ========== SERVICES & JOBS ========== */}
        <Text style={styles.sectionTitle}>Services & Jobs</Text>

        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="add" size={20} color={PRIMARY} />
              </View>
            }
            title="Add Service"
            onPress={() => router.push("/profile/addservice")}
          />

          <MenuItem
            icon={<MenuIcon name="document-text-outline" />}
            title="Create Job Request"
            onPress={() => router.push("/profile/createjob")}
          />

          <MenuItem
            icon={<MenuIcon name="briefcase-outline" />}
            title="My Services"
            onPress={() =>
              router.push({
                pathname: "/professional/[id]",
                params: { id: pro.id },
              })
            }
          />

          <MenuItem
            icon={<MenuIcon name="calendar-outline" />}
            title="My Bookings"
            onPress={() => router.push("/(tab)/bookings")}
          />

          <MenuItem
            icon={<MenuIcon name="briefcase-outline" />}
            title="Job Request"
            badge={15}
            onPress={() => router.push("/profile/offers")}
          />
        </View>

        {/* ========== GROW & CONNECT ========== */}
        <Text style={styles.sectionTitle}>Grow & Connect</Text>

        <View style={styles.card}>
          <MenuItem
            icon={<MenuIcon name="images-outline" />}
            title="Portfolio Gallery"
            onPress={() => router.push("/profile/portfolio_gallery")}
          />

          <MenuItem
            icon={<MenuIcon name="heart-outline" />}
            title="Saved Professionals"
            onPress={() => router.push("/profile/saved_providers")}
          />

          <MenuItem
            icon={<MenuIcon name="chatbubble-outline" />}
            title="Chat"
            badge={2}
            onPress={() => router.push("/profile/chat")}
          />

          <MenuItem
            icon={<MenuIcon name="notifications-outline" />}
            title="Notifications"
            badge={3}
            onPress={() => {}}
          />
        </View>

        {/* ========== ACCOUNT & SUBSCRIPTION ========== */}
        <Text style={styles.sectionTitle}>Account & Subscription</Text>

        <View style={styles.card}>
          <MenuItem
            icon={<MenuIcon name="wallet-outline" />}
            title="Wallet / Payment Methods"
            onPress={() => router.push("/profile/wallet_paymentmeth")}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <MaterialCommunityIcons
                  name="crown"
                  size={18}
                  color={PRIMARY}
                />
              </View>
            }
            title="Subscription"
            rightText={pro.subscribed ? "Active" : "Upgrade"}
            rightColor={pro.subscribed ? PRIMARY : "#7C3AED"}
            onPress={() => router.push("/profile/subscription/subscription")}
          />

          <MenuItem
            icon={<MenuIcon name="shield-checkmark-outline" />}
            title="Verification"
            rightText={pro.verified ? "Verified" : "Not Verified"}
            rightColor={pro.verified ? PRIMARY : "#6B7280"}
            onPress={() => router.push("/profile/verification")}
          />
        </View>

        {/* ========== PREFERENCES & SUPPORT ========== */}
        <Text style={styles.sectionTitle}>Preferences & Support</Text>

        <View style={styles.card}>
          <MenuItem
            icon={<MenuIcon name="time-outline" />}
            title="Availability"
            onPress={() => {}}
          />

          <MenuItem
            icon={<MenuIcon name="settings-outline" />}
            title="Settings"
            onPress={() => {}}
          />

          <MenuItem
            icon={<MenuIcon name="help-circle-outline" />}
            title="Help & Support"
            onPress={() => router.push("/profile/help_support")}
          />
        </View>

        {/* ========== LOG OUT ========== */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* ========== ADMIN LOGIN (only if role is admin) ========== */}
        {role === "admin" && (
          <TouchableOpacity
            style={styles.adminloginButton}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <Ionicons name="shield-outline" size={20} color="#ffffff" />
            <Text style={styles.adminloginText}>Admin Login</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    paddingBottom: 0,
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

  // Header
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  profileHeaderContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  avatarWrapper: {
    position: "relative",
    width: 76,
    height: 76,
    flexShrink: 0,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E5E7EB",
  },
  verifiedBadge: {
    position: "absolute",
    right: -8,
    bottom: -5,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 6,
  },
  checkmarkImage: {
    width: 48,
    height: 48,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
    paddingRight: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    minHeight: 28,
    paddingRight: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  premiumShield: {
    marginLeft: 5,
    flexShrink: 0,
  },
  role: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  location: {
    fontSize: 13,
    color: "#6B7280",
    flexShrink: 1,
  },
 
  editButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
  },
  editButtonText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },

  // Pro banner
  proBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  proLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  proTextContainer: {
    flex: 1,
  },
  crownCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  proTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  proSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    maxWidth: 180,
  },
  upgradeButton: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 4,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  // Sections
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },

  // Menu
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "500",
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
    borderRadius: 10,
  },
  rightBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  notificationBadge: {
    backgroundColor: "#EF4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  // Logout
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },

  // Admin
  adminloginButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#000000",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  adminloginText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});