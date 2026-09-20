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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";

// =====================================================
// MOCK DATA — edit / replace with API later
// =====================================================

type NotifType =
  | "booking"
  | "upcoming"
  | "message"
  | "payment"
  | "verification"
  | "review"
  | "general";

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  /** Optional avatar for message-style items */
  avatar?: number | null;
};

const NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "booking",
    title: "Booking Confirmed",
    body: "Your booking with Tunde Electrician has been confirmed.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "2",
    type: "upcoming",
    title: "Upcoming Booking",
    body: "You have a booking with Bright Cleaning scheduled for tomorrow at 10:00 AM.",
    time: "25 min ago",
    unread: true,
  },
  {
    id: "3",
    type: "message",
    title: "New Message",
    body: "You have a new message from Sarah Makeover.",
    time: "1 hr ago",
    unread: true,
    // avatar: require("@/assets/avatars/sarah.png"), // optional
  },
  {
    id: "4",
    type: "payment",
    title: "Payment Successful",
    body: "Your payment of ₦15,000 was successful.",
    time: "3 hrs ago",
    unread: true,
  },
  {
    id: "5",
    type: "verification",
    title: "Verification Update",
    body: "Your identity verification is under review.",
    time: "1 day ago",
    unread: true,
  },
  {
    id: "6",
    type: "review",
    title: "Review Received",
    body: "You received a 5-star review from John Doe.",
    time: "2 days ago",
    unread: true,
  },
];

// Icon + soft background per type
const TYPE_META: Record<
  NotifType,
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
  general: {
    icon: "notifications-outline",
    bg: LIGHT_GREEN,
    color: PRIMARY,
  },
};

// =====================================================
// SCREEN
// =====================================================

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const onPressItem = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
    // Later: router.push to booking / chat / etc.
  };

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
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionLabel}>Recent</Text>

        {items.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.general;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => onPressItem(item.id)}
            >
              {/* Left icon */}
              <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                {item.type === "general" ? (
                  <Image
                    source={require("@/assets/images/splash_screen.png")}
                    style={styles.logoIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                )}
              </View>

              {/* Text */}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBodyText} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>

              {/* Right: avatar (message) or unread dot */}
              <View style={styles.cardRight}>
                {item.avatar ? (
                  <Image source={item.avatar} style={styles.avatar} />
                ) : null}
                {item.unread ? <View style={styles.unreadDot} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Empty / caught up footer */}
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

// =====================================================
// STYLES
// =====================================================

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
    width: 22,
    height: 22,
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