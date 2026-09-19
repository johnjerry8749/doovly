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
import * as Location from "expo-location";

import {
  getProfessionalById,
  getDistanceKm,
  starsFromReviewCount,
  addReview,
  type ProService,
  type ProReview,
} from "@/services/professionals";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";

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
  rightColor = "#159447",
  badge,
  onPress,
}: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuLeft}>
        <View style={styles.iconWrapper}>{icon}</View>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>

      <View style={styles.menuRight}>
        {rightText ? (
          <View
            style={[
              styles.rightBadge,
              { backgroundColor: rightColor === PRIMARY ? "#DCFCE7" : "#F3E8FF" },
            ]}
          >
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

export default function Profile() {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrapper}>
              <Image
                source={require("@/assets/profile_1.jpg")} // change to your image
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8}>
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>John Jerry</Text>
                <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.role}>Service Provider</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.location}>Lagos, Nigeria</Text>
              </View>

              <TouchableOpacity
                style={styles.availabilityBadge}
                onPress={() => setIsAvailable(!isAvailable)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isAvailable ? PRIMARY : "#EF4444" },
                  ]}
                />
                <Text style={styles.availabilityText}>
                  {isAvailable ? "Available for bookings" : "Not available"}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.editButton} activeOpacity={0.8}>
              <Ionicons name="pencil" size={16} color={PRIMARY} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========== PRO BANNER ========== */}
        <View style={styles.proBanner}>
          <View style={styles.proLeft}>
            <View style={styles.crownCircle}>
              <MaterialCommunityIcons name="crown" size={22} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.proTitle}>Doovly Pro</Text>
              <Text style={styles.proSubtitle}>
                Get more bookings, more visibility and premium features.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.85}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ========== SERVICES & JOBS ========== */}
        <Text style={styles.sectionTitle}>Services & Jobs</Text>
        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="add" size={20} color={PRIMARY} />
              </View>
            }
            title="Add Service"
             onPress={() => router.push("/(tab)/myprofile/addservice")}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="document-text-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Create Job Request"
            onPress={() => router.push("/(tab)/myprofile/createjob")}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="briefcase-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="My Services"
            rightColor={PRIMARY}
            onPress={() => router.push("/professional/[id]")}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="My Bookings"
            onPress={() => router.push("/(tab)/bookings")}
          />
        </View>

        {/* ========== GROW & CONNECT ========== */}
        <Text style={styles.sectionTitle}>Grow & Connect</Text>
        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="person-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="My Portfolio"
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="heart-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Saved Providers"
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="chatbubble-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Chat"
            badge={2}
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7"}]}>
                <Ionicons name="notifications-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Notifications"
            badge={3}
            onPress={() => {}}
          />
        </View>

        {/* ========== ACCOUNT & SUBSCRIPTION ========== */}
        <Text style={styles.sectionTitle}>Account & Subscription</Text>
        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="wallet-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Wallet / Payment Methods"
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons name="crown" size={18} color={PRIMARY} />
              </View>
            }
            title="Subscription"
            rightText="Pro"
            rightColor="#7C3AED"
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Verification"
            rightText="Verified"
            rightColor={PRIMARY}
            onPress={() => {}}
          />
        </View>

        {/* ========== PREFERENCES & SUPPORT ========== */}
        <Text style={styles.sectionTitle}>Preferences & Support</Text>
        <View style={styles.card}>
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="time-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Availability"
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="settings-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Settings"
            onPress={() => {}}
          />
          <MenuItem
            icon={
              <View style={[styles.iconBg, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="help-circle-outline" size={18} color={PRIMARY} />
              </View>
            }
            title="Help & Support"
            onPress={() => {}}
          />
        </View>

        {/* ========== LOG OUT ========== */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    paddingBottom: 20,
  },

  // Header
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E5E7EB",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  role: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
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
  },
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  editButtonText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },

  // Pro Banner
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
    color: "#fff",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
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
  },
  iconWrapper: {},
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    color: "#fff",
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
});