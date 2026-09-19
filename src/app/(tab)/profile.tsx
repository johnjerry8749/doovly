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
// MENU ITEM TYPES
// =====================================================

type MenuItemProps = {
  icon: React.ReactNode;
  title: string;
  rightText?: string;
  rightColor?: string;
  badge?: number;
  onPress?: () => void;
};

// =====================================================
// MENU ITEM
// =====================================================

function MenuItem({
  icon,
  title,
  rightText,
  rightColor = PRIMARY,
  badge,
  onPress,
}: MenuItemProps) {
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
          <View
            style={[
              styles.rightBadge,
              {
                backgroundColor:
                  rightColor === PRIMARY
                    ? "#DCFCE7"
                    : rightColor === "#7C3AED"
                      ? "#F3E8FF"
                      : "#F3F4F6",
              },
            ]}
          >
            <Text
              style={[
                styles.rightBadgeText,
                {
                  color: rightColor,
                },
              ]}
            >
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

// =====================================================
// PROFILE SCREEN
// =====================================================

export default function Profile() {
  const [isAvailable, setIsAvailable] = useState(true);

  // ===================================================
  // MOCK LOGGED-IN PROFESSIONAL
  // ===================================================

  const pro = getProfessionalById("1");

  // ===================================================
  // SAFETY CHECK
  // ===================================================

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
        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <View style={styles.header}>
          <View style={styles.profileHeaderContent}>
            {/* =================================================
                PROFILE IMAGE
            ================================================= */}

            <View style={styles.avatarWrapper}>
              <Image
                source={pro.image}
                style={styles.avatar}
                resizeMode="cover"
              />

              {/* =================================================
                  VERIFIED CHECKMARK IMAGE
              ================================================= */}

              {pro.verified && (
                <View style={styles.verifiedBadge}>
                  <Image
                    source={require("@/assets/premium/checkmark.png")}
                    style={styles.checkmarkImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* =================================================
                  CAMERA BUTTON
              ================================================= */}

              {/* <TouchableOpacity
                style={styles.cameraButton}
                activeOpacity={0.8}
                onPress={() => {}}
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color="#FFFFFF"
                />
              </TouchableOpacity> */}
            </View>

            {/* =================================================
                PROFILE INFORMATION
            ================================================= */}

            <View style={styles.profileInfo}>
              {/* =================================================
                  NAME + VERIFIED + PREMIUM
              ================================================= */}

              <View style={styles.nameRow}>
                <Text style={styles.name}>{pro.name}</Text>

                {/* VERIFIED IMAGE
                {pro.verified && (
                  <Image
                    source={require("@/assets/premium/checkmark.png")}
                    style={styles.nameCheckmark}
                    resizeMode="contain"
                  />
                )} */}

                {/* GOLD PREMIUM SHIELD */}
                {pro.subscribed && (
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={23}
                    color={GOLD}
                    style={styles.premiumShield}
                  />
                )}
              </View>

              {/* =================================================
                  PROFESSION
              ================================================= */}

              <Text style={styles.role}>{pro.profession}</Text>

              {/* =================================================
                  LOCATION
              ================================================= */}

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />

                <Text style={styles.location}>{pro.city}, Nigeria</Text>
              </View>

              {/* =================================================
                  AVAILABILITY
              ================================================= */}

              <TouchableOpacity
                style={styles.availabilityBadge}
                onPress={() => setIsAvailable((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isAvailable ? PRIMARY : "#EF4444",
                    },
                  ]}
                />

                <Text style={styles.availabilityText}>
                  {isAvailable ? "Available for bookings" : "Not available"}
                </Text>

                <Ionicons name="chevron-down" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* =================================================
              EDIT PROFILE
          ================================================= */}

          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <Ionicons name="pencil" size={16} color={PRIMARY} />

            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            DOOVLY PRO BANNER
            ONLY SHOWS WHEN NOT SUBSCRIBED
        ================================================= */}

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

            <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.85}>
              <Text style={styles.upgradeButtonText}>Upgrade</Text>

              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* =================================================
            SERVICES & JOBS
        ================================================= */}

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
            icon={
              <View style={styles.iconBg}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={PRIMARY}
                />
              </View>
            }
            title="Create Job Request"
            badge={15}
            onPress={() => router.push("/profile/createjob")}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="briefcase-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="My Services"
            onPress={() =>
              router.push({
                pathname: "/professional/[id]",
                params: {
                  id: pro.id,
                },
              })
            }
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="My Bookings"
            onPress={() => router.push("/(tab)/bookings")}
          />
        </View>

        {/* =================================================
            GROW & CONNECT
        ================================================= */}

        <Text style={styles.sectionTitle}>Grow & Connect</Text>

        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="images-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Portfolio Gallery"
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="heart-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Saved Providers"
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="chatbubble-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Chat"
            badge={2}
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={PRIMARY}
                />
              </View>
            }
            title="Notifications"
            badge={3}
            onPress={() => {}}
          />
        </View>

        {/* =================================================
            ACCOUNT & SUBSCRIPTION
        ================================================= */}

        <Text style={styles.sectionTitle}>Account & Subscription</Text>

        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="wallet-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Wallet / Payment Methods"
            onPress={() => {}}
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
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={PRIMARY}
                />
              </View>
            }
            title="Verification"
            rightText={pro.verified ? "Verified" : "Not Verified"}
            rightColor={pro.verified ? PRIMARY : "#6B7280"}
            onPress={() => {}}
          />
        </View>

        {/* =================================================
            PREFERENCES & SUPPORT
        ================================================= */}

        <Text style={styles.sectionTitle}>Preferences & Support</Text>

        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="time-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Availability"
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons name="settings-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Settings"
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <View style={styles.iconBg}>
                <Ionicons
                  name="help-circle-outline"
                  size={18}
                  color={PRIMARY}
                />
              </View>
            }
            title="Help & Support"
            onPress={() => {}}
          />
        </View>

        {/* =================================================
            LOG OUT
        ================================================= */}

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />

          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // ===================================================
  // SCREEN
  // ===================================================

  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  container: {
    paddingBottom: 20,
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

  // ===================================================
  // HEADER
  // ===================================================

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

  // ===================================================
  // PROFILE IMAGE
  // ===================================================

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

  // ===================================================
  // VERIFIED CHECKMARK IMAGE
  // ===================================================

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

  // ===================================================
  // PROFILE INFORMATION
  // ===================================================

  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
    paddingRight: 2,
  },

  // ===================================================
  // NAME + BADGES
  // ===================================================

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

  nameCheckmark: {
    width: 32,
    height: 32,
    marginLeft: 5,
    flexShrink: 0,
  },

  premiumShield: {
    marginLeft: 5,
    flexShrink: 0,
  },

  // ===================================================
  // PROFESSION
  // ===================================================

  role: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  // ===================================================
  // LOCATION
  // ===================================================

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

  // ===================================================
  // AVAILABILITY
  // ===================================================

  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
    gap: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  availabilityText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },

  // ===================================================
  // EDIT PROFILE
  // ===================================================

  editButton: {
    marginTop: 14,
    alignSelf: "flex-end",
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

  // ===================================================
  // DOOVLY PRO
  // ===================================================

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

  // ===================================================
  // SECTIONS
  // ===================================================

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

  // ===================================================
  // MENU ITEMS
  // ===================================================

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

  // ===================================================
  // LOGOUT
  // ===================================================

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
});
