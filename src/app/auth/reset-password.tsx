import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/error";

/**
 * Password change screen opened from the email reset link.
 * Deep link: doovly://auth/reset-password (and Supabase recovery tokens in the URL).
 */
export default function ResetPasswordScreen() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function establishRecoverySession() {
      try {
        // 1. If we already have a recovery/session, we're good
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          if (mounted) {
            setSessionReady(true);
            setChecking(false);
          }
          return;
        }

        // 2. Parse tokens from the deep link (Supabase puts them in the hash or query)
        const url = await Linking.getInitialURL();
        if (!url) {
          if (mounted) setChecking(false);
          return;
        }

        // Support both hash (#access_token=...) and query (?access_token=...)
        const hashPart = url.includes("#") ? url.split("#")[1] : "";
        const queryPart = url.includes("?")
          ? url.split("?")[1]?.split("#")[0] ?? ""
          : "";

        const params = new URLSearchParams(
          hashPart || queryPart || "",
        );

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (
          accessToken &&
          refreshToken &&
          (type === "recovery" || type === "signup" || !type)
        ) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Failed to set recovery session:", error);
            if (mounted) {
              Alert.alert(
                "Invalid or Expired Link",
                "This password reset link is invalid or has expired. Please request a new one.",
                [
                  {
                    text: "Request New Link",
                    onPress: () =>
                      router.replace("/(auth)/forgot_password"),
                  },
                ],
              );
            }
          } else if (mounted) {
            setSessionReady(true);
          }
        } else if (mounted) {
          // No tokens — user may have opened the screen manually
          setSessionReady(false);
        }
      } catch (err) {
        console.error("Recovery session error:", err);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    establishRecoverySession();

    // Also listen for URL events while the app is open
    const sub = Linking.addEventListener("url", ({ url }) => {
      // Re-run logic when a new recovery link arrives
      if (url.includes("access_token") || url.includes("type=recovery")) {
        establishRecoverySession();
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [router]);

  const handleUpdatePassword = async () => {
    if (!password || password.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords Don't Match",
        "Please make sure both password fields are the same.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully. You can now log in with your new password.",
        [
          {
            text: "Go to Login",
            onPress: async () => {
              await supabase.auth.signOut();
              router.replace("/(auth)/login");
            },
          },
        ],
      );
    } catch (error) {
      console.error("Update password error:", error);
      Alert.alert("Update Failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.checkingText}>Verifying reset link…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.heading}>Link Expired or Invalid</Text>
          <Text style={styles.description}>
            This password reset link is no longer valid. Request a new one to
            continue.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(auth)/forgot_password")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Request New Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.logo}>Doovly</Text>
          <Text style={styles.heading}>Set a new password</Text>
          <Text style={styles.description}>
            Choose a strong password for your Doovly account. It must be at
            least 8 characters long.
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              textContentType="newPassword"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleUpdatePassword}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleUpdatePassword}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/(auth)/login")}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryText}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  checkingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#6B7280",
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#16A34A",
    textAlign: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    height: 54,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 24,
    padding: 10,
    alignItems: "center",
  },
  secondaryText: {
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "600",
  },
});
