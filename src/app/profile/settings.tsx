import React, { useEffect, useState } from "react";
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
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/error";
import { registerForNotifications, unregisterForNotifications } from "@/services/notifications";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const PUSH_NOTIFICATIONS_KEY = "doovly_push_notifications_enabled";

export default function Settings() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PUSH_NOTIFICATIONS_KEY)
      .then((saved) => {
        if (active && saved !== null) setPushNotifications(saved === "true");
      })
      .catch((error) => console.warn("Could not load notification preference:", error));
    return () => {
      active = false;
    };
  }, []);

  const togglePushNotifications = async (enabled: boolean) => {
    setPushNotifications(enabled);
    try {
      await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, String(enabled));
      if (enabled) {
        await registerForNotifications();
      } else {
        await unregisterForNotifications();
      }
    } catch (error) {
      setPushNotifications(!enabled);
      await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, String(!enabled)).catch(() => {});
      Alert.alert("Settings", "Your notification preference could not be saved. Please try again.");
    }
  };

  const openPasswordChange = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Information", "Complete all password fields to continue.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "Your new password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Confirm your new password correctly.");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Choose a New Password", "Your new password must be different from your current password.");
      return;
    }

    try {
      setSavingPassword(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user || (!user.email && !user.phone)) {
        throw new Error("Your signed-in account could not be verified. Please sign in again.");
      }

      const credentials = user.email
        ? { email: user.email, password: currentPassword }
        : { phone: user.phone!, password: currentPassword };
      const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
      if (signInError) {
        Alert.alert("Current Password Incorrect", "Check your current password and try again.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password Updated", "Your Doovly password has been changed successfully.");
    } catch (error) {
      Alert.alert("Update Failed", getErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
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
            onPress={openPasswordChange}
            last
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <ToggleRow
            icon="notifications-outline"
            title="Push Notifications"
            value={pushNotifications}
            onValueChange={togglePushNotifications}
            last
          />
        </Section>

        <Section title="SUPPORT">
          <Row
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => router.push("/profile/help_support")}
          />
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

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !savingPassword && setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.passwordModal}>
            <View style={styles.passwordModalHeader}>
              <Text style={styles.passwordModalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                disabled={savingPassword}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>Confirm your current password, then choose a new one.</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Current password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!savingPassword}
              textContentType="password"
              returnKeyType="next"
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="New password (8+ characters)"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!savingPassword}
              textContentType="newPassword"
              returnKeyType="next"
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!savingPassword}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={changePassword}
            />
            <TouchableOpacity
              style={[styles.passwordSubmit, savingPassword && styles.passwordSubmitDisabled]}
              onPress={changePassword}
              disabled={savingPassword}
              activeOpacity={0.85}
            >
              {savingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.passwordSubmitText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  passwordModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
  },
  passwordModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  passwordModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  passwordHint: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
    marginBottom: 14,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: TEXT_DARK,
    marginTop: 10,
  },
  passwordSubmit: {
    height: 50,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  passwordSubmitDisabled: {
    opacity: 0.7,
  },
  passwordSubmitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
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
