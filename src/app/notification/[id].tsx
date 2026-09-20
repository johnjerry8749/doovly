import React, { useCallback, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import {
  getNotificationsByUserId,
  getCurrentUserId,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
  type NotifType,
} from "@/services/notifications";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";

// Known types → Ionicons. Anything else / general → app logo
const TYPE_META: Record<
  Exclude<NotifType, "general">,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  booking: {
    icon: "calendar-outline",
    bg: LIGHT_GREEN,
    color: PRIMARY,
  },
  upcoming: {
    icon: "time-outline",
    bg: "#FFF7ED",
    color: "#F59E0B",
  },
  message: {
    icon: "chatbubble-outline",
    bg: "#EFF6FF",
    color: "#3B82F6",
  },
  payment: {
    icon: "wallet-outline",
    bg: LIGHT_GREEN,
    color: PRIMARY,
  },
  verification: {
    icon: "shield-checkmark-outline",
    bg: "#FFF7ED",
    color: "#F59E0B",
  },
  review: {
    icon: "star-outline",
    bg: LIGHT_GREEN,
    color: PRIMARY,
  },
};

function NotifIcon({ type }: { type: NotifType }) {
  const meta = type !== "general" ? TYPE_META[type] : null;

  // No type / general / unknown → Doovly app logo
  if (!meta) {
    return (
      <View style={[styles.iconCircle, { backgroundColor: LIGHT_GREEN }]}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logoIcon}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={20} color={meta.color} />
    </View>
  );
}

export default function NotificationsScreen() {
  // Route: /notification/[id]  → id = userId (or fall back to logged-in mock user)
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ? String(id) : getCurrentUserId();

  const [items, setItems] = useState<Notification[]>(() =>
    getNotificationsByUserId(userId),
  );

  const refresh = useCallback(() => {
    setItems(getNotificationsByUserId(userId));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const markAllRead = () => {
    markAllNotificationsRead(userId);
    refresh();
  };

  const onPressItem = (notificationId: string) => {
    markNotificationRead(notificationId);
    refresh();
    // Later: navigate by type (booking, chat, …)
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={markAllRead}
          activeOpacity={0.7}
        >
          <Text style={styles.markReadText}>Read all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionLabel}>Recent</Text>

        {items.length === 0 ? (
          <Text style={styles.emptyList}>No notifications yet</Text>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => onPressItem(item.id)}
            >
              <NotifIcon type={item.type} />

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBodyText} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>

              <View style={styles.cardRight}>
                {item.avatar ? (
                  <Image source={item.avatar} style={styles.avatar} />
                ) : null}
                {item.unread ? <View style={styles.unreadDot} /> : null}
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.footer}>
          <View style={styles.footerIconWrap}>
            <Image
              source={require("@/assets/notification/bell.png")}
              style={styles.footerBell}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.footerTitle}>You're all caught up!</Text>
          <Text style={styles.footerSub}>
            We'll notify you when there's something new.
          </Text>
        </View>
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
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 4,
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 12,
    marginTop: 4,
  },
  emptyList: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoIcon: {
    width: 62,
    height: 62,
    borderRadius: 6,
  },
  cardBody: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  cardBodyText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
  },
  cardRight: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
    minWidth: 28,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  footer: {
    alignItems: "center",
    marginTop: 28,
    paddingVertical: 20,
  },
  footerIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBell: {
    width: 100,
    height: 100,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  footerSub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
