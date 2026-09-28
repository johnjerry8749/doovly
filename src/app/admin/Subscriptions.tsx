import React from "react";
import { View, Text, StyleSheet } from "react-native";

const SIDEBAR_WIDTH = 240;

export default function Subscriptions() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscriptions</Text>
      <Text style={styles.subtitle}>Manage subscriptions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginLeft: SIDEBAR_WIDTH,
    backgroundColor: "#F9FAFB",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
});
