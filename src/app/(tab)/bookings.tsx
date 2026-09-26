import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  listBookedJobs,
  listReceivedJobs,
  type Booking,
} from "@/services/bookings";

import { getCurrentUserId } from "@/services/inAppNotifications";
import { BookingCard } from "@/components/BookingCard";

const GREEN = "#16A34A";

export default function Bookings() {
  const [mainTab, setMainTab] = useState<"booked" | "received">("booked");

  const data = useMemo<Booking[]>(() => {
    return mainTab === "booked" ? listBookedJobs() : listReceivedJobs();
  }, [mainTab]);

  const handleMainTabChange = (tab: "booked" | "received") => {
    setMainTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bookings</Text>
          <Text style={styles.headerSubtitle}>
            Track your bookings and jobs
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/notification/[id]",
              params: {
                id: String(getCurrentUserId()),
              },
            })
          }
        >
          <Ionicons name="notifications-outline" size={28} color="#111" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* BOOKED / RECEIVED TABS ONLY */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === "booked" && styles.mainTabActive]}
          onPress={() => handleMainTabChange("booked")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "booked" && styles.mainTabTextActive,
            ]}
          >
            Booked
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === "received" && styles.mainTabActive,
          ]}
          onPress={() => handleMainTabChange("received")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "received" && styles.mainTabTextActive,
            ]}
          >
            Received
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOOKINGS LIST — full record history, no filters */}
      <FlatList
        data={data}
        keyExtractor={(item) => `${mainTab}-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={28} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              Your {mainTab === "booked" ? "bookings" : "received jobs"} will
              show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard item={item} mainTab={mainTab} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginBottom: 35,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  mainTabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },

  mainTab: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  mainTabActive: {
    backgroundColor: "#fff",
  },

  mainTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  mainTabTextActive: {
    color: GREEN,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
