import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listServiceRequests,
  type ServiceRequest,
} from "@/services/serviceRequests";
import { listProfessionals } from "@/services/professionals";
import { useLocation } from "@/context/LocationContext";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";

const GREEN = "#159447";

export default function RequestsScreen() {
  const {
    locationName,
    loadingLocation,
    showAllNigeria,
    setShowLocationModal,
  } = useLocation();

  const [search, setSearch] = useState("");
  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [reqs] = await Promise.all([
          listServiceRequests(),
          listProfessionals().catch(() => []),
        ]);
        if (!cancelled) setAllRequests(reqs);
      } catch (e) {
        console.error("Requests load error:", e);
        if (!cancelled) setAllRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRequests.filter((req) => {
      if (!q) return true;
      return [req.title, req.category, req.city, req.description, req.posterName]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [allRequests, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Service requests</Text>
          <TouchableOpacity
            style={styles.headerLocationRow}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={14} color={GREEN} />
            {loadingLocation ? (
              <ActivityIndicator
                size="small"
                color={GREEN}
                style={{ marginLeft: 5 }}
              />
            ) : (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {showAllNigeria
                  ? "All Nigeria"
                  : locationName || "All Nigeria"}
              </Text>
            )}
            <Ionicons
              name="chevron-down"
              size={14}
              color="#6B7280"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreateVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No service requests found</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.posterRow}>
                <Image
                  source={
                    typeof item.posterAvatar === "object" &&
                    item.posterAvatar &&
                    "uri" in item.posterAvatar
                      ? { uri: String((item.posterAvatar as any).uri) }
                      : (item.posterAvatar as any)
                  }
                  style={styles.posterAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.posterName} numberOfLines={1}>
                    {item.posterName}
                  </Text>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}, {item.city}
                  </Text>
                </View>
                <Text style={styles.timeAgo}>{item.timeAgo}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.images?.length ? (
                <RequestImageSlider
                  images={item.images}
                  height={180}
                  borderRadius={0}
                />
              ) : null}
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{item.category}</Text>
              </View>
              <Text style={styles.description} numberOfLines={3}>
                {item.description}
              </Text>
            </View>
          )}
        />
      )}

      <CreateJobModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSaved={async () => {
          setCreateVisible(false);
          try {
            const reqs = await listServiceRequests();
            setAllRequests(reqs);
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  headerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
    maxWidth: 180,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  posterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 10,
  },
  posterName: { fontSize: 14, fontWeight: "700", color: "#111" },
  locationText: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  timeAgo: { fontSize: 11, color: "#9CA3AF" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 6,
  },
  categoryChipText: { fontSize: 12, color: GREEN, fontWeight: "600" },
  description: { fontSize: 13, color: "#4B5563", lineHeight: 20 },
});
