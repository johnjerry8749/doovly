import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREEN = "#159447";
const INACTIVE = "#6B7280";

/**
 * Bottom navigation:
 *
 * Home | Services | + Requests | Bookings | Profile
 */
const SIDE_TABS: {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    name: "home",
    label: "Home",
    icon: "home-outline",
  },
  {
    name: "services",
    label: "Services",
    icon: "briefcase-outline",
  },
  {
    name: "bookings",
    label: "Bookings",
    icon: "calendar-outline",
  },
  {
    name: "profile",
    label: "Profile",
    icon: "person-outline",
  },
];

const CENTER_TAB = "requests";

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const focusedRoute = state.routes[state.index]?.name;

  const goTo = (routeName: string) => {
    const route = state.routes.find((item) => item.name === routeName);

    if (!route) {
      return;
    }

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);

  const centerFocused = focusedRoute === CENTER_TAB;

  const renderTab = (tab: (typeof SIDE_TABS)[0]) => {
    const focused = focusedRoute === tab.name;

    const color = focused ? GREEN : INACTIVE;

    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tabItem}
        onPress={() => goTo(tab.name)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{
          selected: focused,
        }}
        accessibilityLabel={tab.label}
      >
        <Ionicons name={tab.icon} size={22} color={color} />

        <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {/* LEFT */}
        <View style={styles.side}>{leftTabs.map(renderTab)}</View>

        {/* CENTER SPACE */}
        <View style={styles.centerSlot} />

        {/* RIGHT */}
        <View style={styles.side}>{rightTabs.map(renderTab)}</View>
      </View>

      {/* CENTER REQUESTS BUTTON */}
      <TouchableOpacity
        style={styles.centerBtn}
        onPress={() => goTo(CENTER_TAB)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{
          selected: centerFocused,
        }}
        accessibilityLabel="Requests"
      >
        <Ionicons name="list" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />

      <Tabs.Screen
        name="all-requests"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="how-it-works"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },

  bar: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 32,

    height: 64,

    width: "100%",
    maxWidth: 420,

    paddingHorizontal: 8,

    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },

      android: {
        elevation: 10,
      },
    }),
  },

  side: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-evenly",
  },

  centerSlot: {
    width: 72,
  },

  tabItem: {
    alignItems: "center",
    justifyContent: "center",

    minWidth: 56,

    paddingVertical: 6,
  },

  tabLabel: {
    marginTop: 2,

    fontSize: 11,

    fontWeight: "600",
  },

  centerBtn: {
    position: "absolute",

    top: -18,

    width: 56,
    height: 56,

    borderRadius: 28,

    backgroundColor: GREEN,

    alignItems: "center",
    justifyContent: "center",

    ...Platform.select({
      ios: {
        shadowColor: GREEN,
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },

      android: {
        elevation: 8,
      },
    }),
  },
});
