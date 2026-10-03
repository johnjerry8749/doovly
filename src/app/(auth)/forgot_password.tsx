import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getErrorMessage } from "@/utils/error";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert("Missing Information", "Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      // TODO: Call your real Supabase / backend password-reset API here
      // Example:
      // const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      // if (error) throw error;

      Alert.alert(
        "Request Sent",
        "We have sent a reset link to your email address.",
      );
    } catch (error) {
      Alert.alert("Reset Failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Forgot Password?</Text>

          {/* Logo */}
          <Text style={styles.logo}>Doovly</Text>

          {/* Padlock Illustration */}
          <Image
            source={require("@/assets/images/padlock.jpg")} // make sure this path is correct
            style={styles.padlockImage}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Reset your password</Text>

          <Text style={styles.description}>
            Enter your email address and we'll send you a link to reset your
            password.
          </Text>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          {/* Send Reset Link */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleReset}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.loginText}>← Back to Login</Text>
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
  scrollContent: {
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
    marginBottom: 12,
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
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 23,
    marginTop: 12,
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
    marginTop: 18,
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
