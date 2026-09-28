import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Animated,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREEN = "#159447";
const INACTIVE = "#6B7280";
const SIDEBAR_BG = "#FFFFFF";
const SIDEBAR_WIDTH = 240;

const ADMIN_TABS: {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { name: "Dashboard", label: "Dashboard", icon: "home-outline" },
  { name: "Users", label: "Users", icon: "people-outline" },
  { name: "Settings", label: "Settings", icon: "settings-outline" },
  {
    name: "Notifications",
    label: "Notifications",
    icon: "notifications-outline",
  },
  { name: "Subscriptions", label: "Subscriptions", icon: "card-outline" },
  {
    name: "Verification Aplications",
    label: "Verification Applications",
    icon: "checkmark-circle-outline",
  },
  { name: "Reports", label: "Reports", icon: "bar-chart-outline" },
];

function AdminSidebar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  // Start open on large screens, closed on mobile
  const [isOpen, setIsOpen] = useState(isLargeScreen);
  const slideAnim = useRef(
    new Animated.Value(isLargeScreen ? 0 : -SIDEBAR_WIDTH)
  ).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const menuLeftAnim = useRef(
    new Animated.Value(isLargeScreen ? SIDEBAR_WIDTH + 12 : 16)
  ).current;

  const focusedRoute = state.routes[state.index]?.name;

  useEffect(() => {
    if (isLargeScreen && !isOpen) {
      setIsOpen(true);
    }
  }, [isLargeScreen]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen && !isLargeScreen ? 0.4 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(menuLeftAnim, {
        toValue: isOpen ? SIDEBAR_WIDTH + 12 : 16,
        duration: 250,
        useNativeDriver: false, // left position can't use native driver
      }),
    ]).start();
  }, [isOpen, isLargeScreen]);

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeSidebar = () => setIsOpen(false);

  const goTo = (routeName: string) => {
    const route = state.routes.find((item) => item.name === routeName);
    if (!route) return;

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
      // Auto-close on mobile after navigation
      if (!isLargeScreen) {
        closeSidebar();
      }
    }
  };

  return (
    <>
      {/* Floating menu button (always visible) */}
      <Animated.View
        style={[
          styles.menuButtonWrap,
          {
            top: Math.max(insets.top, 12) + 4,
            left: menuLeftAnim,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.menuButton}
          onPress={toggleSidebar}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isOpen ? "Close menu" : "Open menu"}
        >
          <Ionicons
            name={isOpen ? "close" : "menu"}
            size={24}
            color="#111827"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Dark overlay when sidebar is open on small screens */}
      {!isLargeScreen && (
        <Animated.View
          pointerEvents={isOpen ? "auto" : "none"}
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Brand / Logo area */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>Admin</Text>
        </View>

        <ScrollView
          style={styles.navScroll}
          contentContainerStyle={styles.navContent}
          showsVerticalScrollIndicator={false}
        >
          {ADMIN_TABS.map((tab) => {
            const focused = focusedRoute === tab.name;
            const color = focused ? GREEN : INACTIVE;
            const bg = focused ? "rgba(21, 148, 71, 0.12)" : "transparent";

            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.navItem, { backgroundColor: bg }]}
                onPress={() => goTo(tab.name)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
              >
                <Ionicons name={tab.icon} size={22} color={color} />
                <Text style={[styles.navLabel, { color }]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={(props) => <AdminSidebar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // Keep tab bar container transparent so our custom overlay works
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: "100%",
        },
      }}
    >
      <Tabs.Screen name="Dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="Users" options={{ title: "Users" }} />
      <Tabs.Screen name="Settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="Notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="Subscriptions" options={{ title: "Subscriptions" }} />
      <Tabs.Screen
        name="Verification Aplications"
        options={{ title: "Verification Applications" }}
      />
      <Tabs.Screen name="Reports" options={{ title: "Reports" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  menuButtonWrap: {
    position: "absolute",
    zIndex: 100,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        // @ts-ignore
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      },
    }),
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 90,
  },

  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: SIDEBAR_BG,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#E5E7EB",
    zIndex: 95,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
      web: {
        // @ts-ignore
        boxShadow: "4px 0 16px rgba(0,0,0,0.08)",
      },
    }),
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },

  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  brandText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  navScroll: {
    flex: 1,
  },

  navContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  navLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
