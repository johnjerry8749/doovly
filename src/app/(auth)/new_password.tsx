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

export default function NewPasswordScreen() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    const next = password.trim();
    const again = confirm.trim();

    if (!next || !again) {
      Alert.alert(
        "Missing Information",
        "Please enter and confirm your new password.",
      );
      return;
    }

    if (next.length < 5) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (next !== again) {
      Alert.alert(
        "Passwords Don't Match",
        "New password and confirmation must be the same.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: next,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      Alert.alert(
        "Password Updated",
        "Your password has been changed. Please sign in with your new password.",
        [
          {
            text: "Back to Login",
            onPress: () => router.replace("/(auth)/login"),
          },
        ],
      );
    } catch (error) {
      console.error("Update password error:", error);
      Alert.alert(
        "Update Failed",
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
          <Text style={styles.title}>New Password</Text>

          <Text style={styles.logo}>Doovly</Text>

          <Image
            source={require("@/assets/images/padlock.jpg")}
            style={styles.padlockImage}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Create a new password</Text>

          <Text style={styles.description}>
            Choose a strong password for your Doovly
            account. You’ll use it the next time you sign in.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              value={confirm}
              onChangeText={setConfirm}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
            ]}
            onPress={handleUpdate}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Update Password
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace("/(auth)/login")}
            disabled={loading}
            activeOpacity={0.7}
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
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    marginTop: 8,
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
