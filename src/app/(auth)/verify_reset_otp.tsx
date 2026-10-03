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
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/utils/error";

export default function VerifyResetOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = String(params.email ?? "")
    .trim()
    .toLowerCase();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const code = otp.replace(/\s/g, "").trim();

    if (!email) {
      Alert.alert(
        "Missing Email",
        "Go back and enter your email again.",
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      Alert.alert(
        "Invalid Code",
        "Enter the 6-digit code from your email.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });

      if (error) {
        throw error;
      }

      router.replace("/(auth)/new_password");
    } catch (error) {
      console.error("Verify reset OTP error:", error);
      Alert.alert(
        "Verification Failed",
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Verify Code</Text>

          <Text style={styles.logo}>Doovly</Text>

          <Image
            source={require("@/assets/images/padlock.jpg")}
            style={styles.padlockImage}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Enter verification code</Text>

          <Text style={styles.description}>
            We sent a 6-digit code to{" "}
            {email || "your email"}. Enter it below to
            continue resetting your password.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(t) =>
                setOtp(t.replace(/[^\d]/g, "").slice(0, 6))
              }
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleVerify}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Verify Code
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() =>
              router.replace("/(auth)/forgot_password")
            }
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              ← Resend code
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
  otpInput: {
    letterSpacing: 8,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
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
