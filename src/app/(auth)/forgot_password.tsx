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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");

  const handleReset = () => {
    if (!contact.trim()) {
      Alert.alert(
        "Missing Information",
        method === "phone"
          ? "Please enter your phone number."
          : "Please enter your email address.",
      );
      return;
    }

    // TODO: Call your backend password-reset API here
    Alert.alert(
      "Request Sent",
      method === "phone"
        ? "We have sent a reset link to your phone number."
        : "We have sent a reset link to your email address.",
    );
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
            Enter your phone number or email address and we'll send you a link
            to reset your password.
          </Text>

          {/* Method Selector */}
          <View style={styles.methodContainer}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                method === "phone" && styles.activeMethod,
              ]}
              onPress={() => {
                setMethod("phone");
                setContact("");
              }}
            >
              <Text
                style={[
                  styles.methodText,
                  method === "phone" && styles.activeMethodText,
                ]}
              >
                Phone Number
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                method === "email" && styles.activeMethod,
              ]}
              onPress={() => {
                setMethod("email");
                setContact("");
              }}
            >
              <Text
                style={[
                  styles.methodText,
                  method === "email" && styles.activeMethodText,
                ]}
              >
                Email Address
              </Text>
            </TouchableOpacity>
          </View>
          {/* Input */}
          {method === "phone" ? (
            <View style={styles.phoneInput}>
              <Text style={styles.countryCode}>+234</Text>
              <TextInput
                style={styles.phoneTextInput}
                placeholder="801 234 5678"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={contact}
                onChangeText={setContact}
              />
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={contact}
              onChangeText={setContact}
            />
          )}

          {/* Send Reset Link */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleReset}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
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
  methodContainer: {
    width: "100%",
    height: 52,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    flexDirection: "row",
    padding: 4,
    marginTop: 28,
  },
  methodButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  activeMethod: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#16A34A",
  },
  methodText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  activeMethodText: {
    color: "#16A34A",
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
  phoneInput: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginRight: 10,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    height: "100%",
  },
});
