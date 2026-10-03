import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/error";

type ResetResponse =
  | {
      status: "sent";
    }
  | {
      status: "not_registered";
    }
  | {
      status: "rate_limited";
      retry_after_seconds?: number;
    }
  | {
      error?: string;
    };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Try to extract a clean message from a Supabase FunctionsHttpError.
 * The edge function returns JSON like { error: "Enter a valid email address" }.
 */
async function getFunctionsErrorMessage(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: Response })?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (typeof body?.error === "string" && body.error.trim()) {
        return body.error.trim();
      }
      if (typeof body?.message === "string" && body.message.trim()) {
        return body.message.trim();
      }
    }
  } catch {
    // ignore parse failures
  }
  return null;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        "Missing Information",
        "Please enter your email address.",
      );
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address (e.g. you@example.com).",
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase.functions.invoke<ResetResponse>(
          "request-password-reset",
          {
            body: {
              email: cleanEmail,
            },
          },
        );

      if (error) {
        const status = (
          error as {
            context?: {
              status?: number;
            };
          }
        ).context?.status;

        if (status === 429) {
          Alert.alert(
            "Too Many Attempts",
            "You have reached the password reset limit. Please wait 15 minutes before trying again.",
          );
          return;
        }

        // Prefer the friendly message returned by the Edge Function (e.g. 400 invalid email)
        const functionMessage = await getFunctionsErrorMessage(error);
        if (functionMessage) {
          Alert.alert("Reset Failed", functionMessage);
          return;
        }

        throw error;
      }

      if (data?.status === "not_registered") {
        Alert.alert(
          "Email Not Registered",
          "This email is not registered in Doovly.",
        );
        return;
      }

      if (data?.status === "rate_limited") {
        const retrySeconds =
          data.retry_after_seconds ?? 900;

        const retryMinutes = Math.ceil(
          retrySeconds / 60,
        );

        Alert.alert(
          "Too Many Attempts",
          `You have reached the password reset limit. Please try again in about ${retryMinutes} minute${
            retryMinutes === 1 ? "" : "s"
          }.`,
        );
        return;
      }

      if (data?.status !== "sent") {
        // Edge function may return { error: "..." } with 200 in some edge cases
        const maybeError =
          data && typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : null;

        throw new Error(
          maybeError ??
            "Unable to process the password reset request.",
        );
      }

      Alert.alert(
        "Reset Link Sent",
        "A password reset link has been sent to your email address. Please check your inbox and spam folder.",
        [
          {
            text: "Back to Login",
            onPress: () => {
              router.replace("/(auth)/login");
            },
          },
        ],
      );
    } catch (error) {
      console.error(
        "Password reset error:",
        error,
      );

      Alert.alert(
        "Reset Failed",
        getErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>
            Forgot Password?
          </Text>

          {/* Logo */}
          <Text style={styles.logo}>
            Doovly
          </Text>

          {/* Padlock */}
          <Image
            source={require("@/assets/images/padlock.jpg")}
            style={styles.padlockImage}
            resizeMode="contain"
          />

          {/* Heading */}
          <Text style={styles.heading}>
            Reset your password
          </Text>

          <Text style={styles.description}>
            Enter the email address connected to
            your Doovly account and we'll send you
            a secure link to reset your password.
          </Text>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading &&
                styles.primaryButtonDisabled,
            ]}
            onPress={handleReset}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={styles.primaryButtonText}
              >
                Send Reset Link
              </Text>
            )}
          </TouchableOpacity>

          {/* Login */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() =>
              router.replace("/(auth)/login")
            }
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              ← Back to Login
            </Text>
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
    alignItems: "center",
  },

  backButton: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    justifyContent: "center",
    marginBottom: 8,
  },

  backText: {
    fontSize: 36,
    color: "#16A34A",
    fontWeight: "300",
    marginTop: -4,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#16A34A",
    marginTop: 8,
  },

  padlockImage: {
    width: 220,
    height: 220,
    marginTop: 20,
    marginBottom: 8,
  },

  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  description: {
    width: "100%",
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 8,
  },

  inputWrapper: {
    width: "100%",
    marginTop: 18,
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
    marginTop: 24,
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  loginButton: {
    marginTop: 28,
    padding: 10,
  },

  loginText: {
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "600",
  },
});
