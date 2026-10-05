import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { loadSessionUser } from "@/lib/session";
import { invalidateNotificationsCache } from "@/services/inAppNotifications";

type IncomingNotification = {
  id: string;
  title: string;
  body: string;
  avatar_url?: string | null;
};

export default function SystemNotificationBanner() {
  const notificationUserId = useRef("");
  const [notification, setNotification] = useState<IncomingNotification | null>(null);
  const translateY = useRef(new Animated.Value(-140)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const sessionUser = await loadSessionUser();
      if (cancelled || !sessionUser?.uuid) return;
      notificationUserId.current = sessionUser.uuid;

      channel = supabase
        .channel(`user-notifications-${sessionUser.uuid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${sessionUser.uuid}`,
          },
          (payload) => {
            const row = payload.new as IncomingNotification;
            invalidateNotificationsCache();
            setNotification({
              id: String(row.id),
              title: row.title,
              body: row.body,
              avatar_url: row.avatar_url,
            });

            if (hideTimer.current) clearTimeout(hideTimer.current);

            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }).start();

            hideTimer.current = setTimeout(() => {
              Animated.timing(translateY, {
                toValue: -140,
                duration: 220,
                useNativeDriver: true,
              }).start(() => setNotification(null));
            }, 6500);
          },
        )
        .subscribe();
    };

    void start();

    return () => {
      cancelled = true;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [translateY]);

  if (!notification) return null;

  const openNotification = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(translateY, {
      toValue: -140,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
      router.push({
        pathname: "/notification/[id]",
        params: {
          id: notificationUserId.current,
          notificationId: notification.id,
        },
      });
    });
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
      <Pressable style={styles.banner} onPress={openNotification}>
        <View style={styles.logoCircle}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.systemLabel}>DOOVLY</Text>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>

        <Pressable
          hitSlop={12}
          onPress={() => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            Animated.timing(translateY, {
              toValue: -140,
              duration: 180,
              useNativeDriver: true,
            }).start(() => setNotification(null));
          }}
        >
          <Text style={styles.close}>×</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 48,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logo: {
    width: 36,
    height: 36,
  },
  content: {
    flex: 1,
  },
  systemLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#159447",
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  close: {
    fontSize: 25,
    lineHeight: 25,
    color: "#9CA3AF",
    marginLeft: 8,
  },
});
