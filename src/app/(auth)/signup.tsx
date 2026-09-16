import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function handleCreateAccount() {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Please enter your full name.");
      return;
    }

    if (!phone.trim()) {
      Alert.alert("Missing phone number", "Please enter your phone number.");
      return;
    }

    if (!password) {
      Alert.alert("Missing password", "Please enter a password.");
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Weak password",
        "Your password must contain at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Your passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        "Terms required",
        "Please accept the Terms & Conditions and Privacy Policy.",
      );
      return;
    }

    // TODO: Connect your backend API here
    // await api.post("/auth/register", {
    //   fullName,
    //   phone: `+234${phone}`,
    //   email,
    //   password,
    // });

    Alert.alert(
      "Account created",
      "Your account has been created successfully.",
    );
    router.replace("/(tab)/home");
  }

  function handleGoogleSignup() {
    Alert.alert("Google signup", "Connect Google authentication here.");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#16A34A" />
          </Pressable>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Image
                source={require("@/assets/images/icon.jpg")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.logoText}>
              <Text style={styles.logoGreen}>Doovly</Text>
            </Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Join thousands of professionals and customers{"\n"}across Nigeria.
          </Text>

          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={22}
              color="#16A34A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.phoneContainer}>
            <Ionicons
              name="call-outline"
              size={22}
              color="#16A34A"
              style={styles.phoneIcon}
            />

            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇳🇬</Text>
              <Text style={styles.codeText}>+234</Text>
            </View>

            <View style={styles.verticalLine} />

            <TextInput
              style={styles.phoneInput}
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={22}
              color="#16A34A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={22}
              color="#16A34A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={22}
              color="#16A34A"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </View>

          {/* Terms */}

          <Pressable
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            android_ripple={null}
            style={({ pressed }) => [
              styles.termsRow,
              { opacity: pressed ? 1 : 1 }, // no opacity change
            ]}
          >
            <View
              style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
            >
              {acceptedTerms && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>

            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                style={styles.greenText}
                onPress={() => router.push("/(auth)/terms_condition")}
              >
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text
                style={styles.greenText}
                onPress={() => router.push("/(auth)/terms_condition")}
              >
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          {/* Create Account Button */}
          <Pressable style={styles.createButton} onPress={handleCreateAccount}>
            <Text style={styles.createButtonText}>Create Account</Text>
          </Pressable>

          {/* Divider */}
          {/* <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.divider} />
          </View> */}

          {/* Google Button */}
          {/* <Pressable style={styles.googleButton} onPress={handleGoogleSignup}>
            <Text style={styles.googleLogo}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable> */}

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.loginLink}>Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    marginBottom: 12,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },

  logoImage: {
    width: 55,
    height: 80,
    borderRadius: 50,
  },

  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },

  logoGreen: {
    color: "#16A34A",
  },

  title: {
    textAlign: "center",
    color: "#111827",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 28,
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 30,
  },

  inputContainer: {
    height: 58,
    borderWidth: 1.3,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  inputIcon: {
    marginRight: 14,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 0,
  },

  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },

  phoneContainer: {
    height: 58,
    borderWidth: 1.3,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  phoneIcon: {
    marginLeft: 16,
    marginRight: 12,
  },

  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  flag: {
    fontSize: 20,
  },

  codeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  verticalLine: {
    width: 1,
    height: 28,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 0,
    paddingRight: 12,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    marginBottom: 24,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  termsText: {
    flex: 1,
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 22,
  },

  greenText: {
    color: "#16A34A",
    fontWeight: "600",
  },

  createButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  orText: {
    color: "#6B7280",
    fontSize: 14,
    marginHorizontal: 14,
  },

  googleButton: {
    height: 58,
    borderWidth: 1.3,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  googleLogo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4285F4",
    marginRight: 14,
  },

  googleButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },

  loginText: {
    color: "#6B7280",
    fontSize: 15,
  },

  loginLink: {
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "700",
  },
});
