import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { getErrorMessage } from "@/utils/error";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/services/auth/googleAuth";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  // ========== NORMAL LOGIN ==========

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    if (!password) {
      Alert.alert("Missing password", "Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session || !data.user) {
        throw new Error("Login was not completed. Please try again.");
      }

      router.replace("/(tab)/home");
    } catch (error) {
      console.error("Login error:", error);

      Alert.alert("Login failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  
    // ========== GOOGLE LOGIN ==========
  const handleGoogleLogin = async () => {
  try {
    setLoading(true);

    await signInWithGoogle();

    router.replace("/(tab)/home");
  } catch (error) {
    Alert.alert(
      "Google Sign-In",
      getErrorMessage(error),
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require("@/assets/images/splash_screen.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Doovly</Text>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subText}>
              Login to continue booking trusted services
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot_password")}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialButtonsRow}>
            <TouchableOpacity
              style={[styles.socialButton, styles.socialButtonCompact]}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Image
                source={{
                  uri: "https://developers.google.com/identity/images/g-logo.png",
                }}
                style={[styles.socialIcon, styles.socialIconCompact]}
              />
              <Text style={[styles.socialButtonText, styles.socialButtonTextCompact]}>
                Google
              </Text>
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  styles.socialButtonCompact,
                  styles.appleButton,
                ]}
                onPress={() =>
                  Alert.alert(
                    "Apple Sign-In",
                    "Apple sign-in is not configured yet.",
                  )
                }
                disabled={loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                <Text
                  style={[
                    styles.socialButtonText,
                    styles.socialButtonTextCompact,
                    { color: "#FFFFFF" },
                  ]}
                >
                  Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.registerContainer}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text style={styles.registerLink}>Register</Text>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fefffe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
  },
  subText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: "#111827",
  },
  loginButton: {
    backgroundColor: "#16A34A",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  socialButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  orText: {
    marginHorizontal: 12,
    color: "#9CA3AF",
    fontSize: 14,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    height: 52,
    marginBottom: 14,
  },
  socialButtonCompact: {
    flex: 1,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  socialIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  socialIconCompact: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  socialButtonTextCompact: {
    fontSize: 14,
  },
  appleButton: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  logoImage: {
    width: 170,
    height: 170,
    borderRadius: 90,
  },
  registerContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  registerText: {
    fontSize: 15,
    color: "#6B7280",
  },
  registerLink: {
    color: "#16A34A",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between", // label left, forgot right
    alignItems: "center",
    marginBottom: 6,
  },
  forgotText: {
    color: "#007AFF",
    fontSize: 13,
  },
});
function promptAsync() {
  throw new Error("Function not implemented.");
}

