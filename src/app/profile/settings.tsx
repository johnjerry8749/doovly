import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

/**
 * Settings preferences (mock local state).
 * LATER: load/save via GET/PATCH /me/settings
 */
type SettingsState = {
  pushNotifications: boolean;
  bookingUpdates: boolean;
  marketing: boolean;
  darkMode: boolean;
};

export default function Settings() {
  const [prefs, setPrefs] = useState<SettingsState>({
    pushNotifications: true,
    bookingUpdates: true,
    marketing: false,
    darkMode: false,
  });

  const toggle = (key: keyof SettingsState) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // TODO backend: apiRequest("/me/settings", { method: "PATCH", body: JSON.stringify(next) })
      return next;
    });
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
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Section title="ACCOUNT">
          <Row
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() =>
              Alert.alert("Coming soon", "Password change will be available after auth is wired.")
            }
          />
          <Row
            icon="mail-outline"
            title="Email Preferences"
            onPress={() =>
              Alert.alert("Coming soon", "Email preference controls will be available soon.")
            }
            last
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <ToggleRow
            icon="notifications-outline"
            title="Push Notifications"
            value={prefs.pushNotifications}
            onValueChange={() => toggle("pushNotifications")}
          />
          <ToggleRow
            icon="calendar-outline"
            title="Booking Updates"
            value={prefs.bookingUpdates}
            onValueChange={() => toggle("bookingUpdates")}
          />
          <ToggleRow
            icon="megaphone-outline"
            title="Marketing"
            value={prefs.marketing}
            onValueChange={() => toggle("marketing")}
            last
          />
        </Section>

        <Section title="PRIVACY">
          <Row
            icon="location-outline"
            title="Location"
            onPress={() =>
              Alert.alert("Location", "Location is managed from the Home screen.")
            }
          />
          <Row
            icon="shield-outline"
            title="Profile Visibility"
            onPress={() =>
              Alert.alert("Coming soon", "Visibility controls will be available soon.")
            }
            last
          />
        </Section>

        <Section title="APP">
          <Row
            icon="globe-outline"
            title="Language"
            rightText="English"
            onPress={() =>
              Alert.alert("Language", "Only English is available right now.")
            }
          />
          <ToggleRow
            icon="moon-outline"
            title="Dark Mode"
            value={prefs.darkMode}
            onValueChange={() => toggle("darkMode")}
            last
          />
        </Section>

        <Section title="SUPPORT">
          <Row
            icon="star-outline"
            title="Rate App"
            onPress={() =>
              Alert.alert("Rate Doovly", "Thanks! Rating will open the store later.")
            }
          />
          <Row
            icon="document-text-outline"
            title="Terms"
            onPress={() => router.push("/(auth)/terms_condition")}
          />
          <Row
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() =>
              Linking.openURL("https://doovly.com/privacy").catch(() =>
                Alert.alert("Privacy Policy", "Could not open link."),
              )
            }
            last
          />
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Doovly</Text>
          <Text style={styles.footerTag}>Buy. Book. Belong.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  rightText,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  rightText?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconBg}>
        <Ionicons name={icon} size={18} color={PRIMARY} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon,
  title,
  value,
  onValueChange,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  value: boolean;
  onValueChange: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.iconBg}>
        <Ionicons name={icon} size={18} color={PRIMARY} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E5E7EB", true: PRIMARY }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    marginHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: TEXT_DARK,
  },
  rightText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginRight: 4,
  },
  footer: {
    alignItems: "center",
    marginTop: 28,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
  },
  footerTag: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
});
