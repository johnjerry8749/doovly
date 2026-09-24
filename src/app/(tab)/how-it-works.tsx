import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS = [
  {
    icon: "search-outline" as const,
    title: "Find a service",
    description:
      "Browse categories or search for the service you need eg. Painter, plumber, electrician, barber, Nail Tech, Spa and more...",
  },
  {
    icon: "location-outline" as const,
    title: "Choose nearby pros",
    description:
      "We show verified professionals near your location so you get fast, reliable help.",
  },
  {
    icon: "calendar-outline" as const,
    title: "Book in minutes",
    description:
      "Pick a time that works for you, confirm your booking, and you’re done.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Verified & trusted",
    description:
      "Every pro is background checked. Pay securely and rate your experience after the job.",
  },
];

export default function HowItWorks() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How it works</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.subtitle}>
          Getting help on Doovly is simple, safe, and fast.
        </Text>

        {STEPS.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>

            <View style={styles.stepIconCircle}>
              <Ionicons name={step.icon} size={28} color="#159447" />
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.replace("/(tab)/home")}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Got it? find a pro</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    marginBottom: 35,
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    marginBottom: 28,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "#F8FBF8",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#159447",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  stepIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF8EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
  },
  ctaButton: {
    backgroundColor: "#159447",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
