import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import RequestDetailModal from "@/components/ui/RequestDetailModal";
import {
  listServiceRequests,
  type ServiceRequest,
} from "@/services/serviceRequests";
import { useLocation } from "@/context/LocationContext";

const GREEN = "#159447";

export default function AllRequests() {
  const { locationName, loadingLocation, showAllNigeria } = useLocation();
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(
    null,
  );

  const allRequests = listServiceRequests();

  const matchesLocationCity = (itemCity: string, itemArea?: string) => {
    if (loadingLocation || showAllNigeria || !locationName) {
      return true;
    }

    const city = locationName.split(",")[0].trim().toLowerCase();
    if (!city || city === "nigeria") return true;

    const c = itemCity.toLowerCase();
    const area = (itemArea || "").toLowerCase();
    return c.includes(city) || city.includes(c) || area.includes(city);
  };

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allRequests.filter((req) => {
      const matchesSearch =
        !query ||
        req.title.toLowerCase().includes(query) ||
        req.category.toLowerCase().includes(query) ||
        req.location.toLowerCase().includes(query) ||
        req.city.toLowerCase().includes(query);

      const matchesLocation = matchesLocationCity(req.city, req.location);

      return matchesSearch && matchesLocation;
    });
  }, [allRequests, search, locationName, loadingLocation, showAllNigeria]);

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestIconWrapper}>
          <View
            style={[
              styles.requestIcon,
              { backgroundColor: item.iconBackground },
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={28}
              color="#333"
            />
          </View>
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        <View style={styles.requestContent}>
          <Text style={styles.requestTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.requestDetails} numberOfLines={1}>
            {item.category} â€¢ {item.location}
          </Text>

          <Text style={styles.price}> {item.price}</Text>
        </View>

        <View style={styles.requestRight}>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          <TouchableOpacity
            style={styles.viewRequestButton}
            activeOpacity={0.8}
            onPress={() => setSelectedRequest(item)}
          >
            <Text style={styles.viewRequestText}>View Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Service requests</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {locationName}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={42} color="#aaa" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>
              No service requests in this area yet.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

      <RequestDetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  searchContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    gap: 12,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#fff",
  },
  requestIconWrapper: {
    position: "relative",
    marginRight: 12,
  },
  requestIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  newBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#F39C12",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  requestContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
  },
  requestDetails: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  price: { fontSize: 12, fontWeight: "800", color: "#159447" },
  requestRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 54,
  },
  timeAgo: {
    fontSize: 11,
    color: "#888",
  },
  viewRequestButton: {
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewRequestText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
    color: "#111",
  },
  emptyText: {
    color: "#888",
    marginTop: 5,
    fontSize: 13,
    textAlign: "center",
  },
});

