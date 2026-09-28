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
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header / avatar section - keep existing structure from app */}
          <View style={styles.profileHeader}>
            <Image source={pro.image} style={styles.avatar} />
            <Text style={styles.name}>{pro.name}</Text>
            <Text style={styles.roleLabel}>
              {isPro ? "Professional" : "User"}
              {role === "admin" ? " · Admin" : ""}
            </Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push("/profile/edit_profile")}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={PRIMARY} />
              <Text style={styles.editBtnText}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          {/* Simplified menu — full original menus may differ; Admin is the critical path */}
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <MenuItem
              icon={<MenuIcon name="briefcase-outline" />}
              title="My services"
              onPress={() => router.push("/profile/addservice")}
            />
            <MenuItem
              icon={<MenuIcon name="calendar-outline" />}
              title="My bookings"
              onPress={() => router.push("/(tab)/bookings")}
            />
            <MenuItem
              icon={<MenuIcon name="chatbubble-outline" />}
              title="Messages"
              onPress={() => router.push("/profile/chat")}
            />
            <MenuItem
              icon={<MenuIcon name="settings-outline" />}
              title="Settings"
              onPress={() => router.push("/profile/settings")}
            />
            <MenuItem
              icon={<MenuIcon name="help-circle-outline" />}
              title="Help & Support"
              onPress={() => router.push("/profile/help_support")}
            />
          </View>

          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* ADMIN — only if role is admin */}
          {role === "admin" && (
            <TouchableOpacity
              style={styles.adminloginButton}
              activeOpacity={0.8}
              onPress={() => {
                // role already gated; open dashboard
                router.push("/admin");
              }}
            >
              <Ionicons name="shield-outline" size={20} color="#FFFFFF" />
              <Text style={styles.adminloginText}>Admin Login</Text>
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
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E5E7EB",
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  roleLabel: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
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
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bottomSpace: {
    height: 40,
  },
});
