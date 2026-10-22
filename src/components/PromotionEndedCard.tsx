import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const GREEN = "#159447";
const MUTED = "#6B7280";

function metric(text: string, label: string) {
  const match = text.match(new RegExp(label + ":\\s*([\\d,]+)", "i"));
  return match ? Number(match[1].replace(/,/g, "")).toLocaleString("en-NG") : "0";
}

export function PromotionEndedCard({ message }: { message: string }) {
  const serviceMatch = message.match(/^Promotion ended — ["“](.+?)["”] has finished/i);
  const serviceName = serviceMatch?.[1] ?? "Your promoted service";

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="megaphone-outline" size={19} color={GREEN} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>DOOVLY PROMOTIONS</Text>
            <Text style={styles.title}>Promotion ended</Text>
          </View>
          <View style={styles.endedPill}>
            <Text style={styles.endedText}>ENDED</Text>
          </View>
        </View>

        <Text style={styles.serviceName} numberOfLines={2}>{serviceName}</Text>
        <Text style={styles.description}>Your promotion period has finished. Here are the final results recorded by Doovly.</Text>

        <View style={styles.metrics}>
          <Metric label="Impressions" value={metric(message, "Impressions")} />
          <Metric label="Service views" value={metric(message, "Service views")} />
          <Metric label="Booking requests" value={metric(message, "Booking requests")} />
          <Metric label="Confirmed bookings" value={metric(message, "Confirmed bookings")} />
        </View>

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={15} color={MUTED} />
          <Text style={styles.footerText}>This service is no longer promoted. You can promote it again whenever you’re ready.</Text>
        </View>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "flex-start", paddingHorizontal: 4, marginVertical: 7 },
  card: { width: "100%", maxWidth: 350, borderRadius: 16, padding: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1FAE5" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 },
  headingCopy: { flex: 1 },
  eyebrow: { color: GREEN, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: "#111827", fontSize: 16, fontWeight: "800", marginTop: 2 },
  endedPill: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  endedText: { color: "#6B7280", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  serviceName: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 5 },
  description: { color: "#4B5563", fontSize: 12, lineHeight: 17, marginBottom: 12 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48%", flexGrow: 1, minHeight: 62, borderRadius: 10, padding: 10, backgroundColor: "#F0FDF4" },
  metricValue: { color: "#166534", fontSize: 20, fontWeight: "800" },
  metricLabel: { color: "#4B5563", fontSize: 10, marginTop: 3 },
  footer: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  footerText: { flex: 1, color: MUTED, fontSize: 10, lineHeight: 15 },
});
