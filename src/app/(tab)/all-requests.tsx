import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listServiceRequests,
  type ServiceRequest,
} from "@/services/serviceRequests";
import { useLocation } from "@/context/LocationContext";

const GREEN = "#159447";

const { width } = Dimensions.get("window");

const fallbackGallery = [
  require("@/assets/images/home_banner.png"),
  require("@/assets/images/home_banner.png"),
  require("@/assets/images/home_banner.png"),
];

export default function AllRequests() {
  const { locationName } = useLocation();
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(
    null,
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const allRequests = listServiceRequests();

  const matchesLocationCity = (itemCity: string, itemArea?: string) => {
    if (
      !locationName ||
      locationName === "All Nigeria" ||
      locationName.toLowerCase().includes("unavailable") ||
      locationName.toLowerCase().includes("click here") ||
      locationName.toLowerCase().includes("getting")
    ) {
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
  }, [allRequests, search, locationName]);

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
              name={item.icon as any}
              size={28}
              color="#333"
            />
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        </View>

        <View style={styles.requestContent}>
          <Text style={styles.requestTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.requestDetails} numberOfLines={1}>
            {item.category} • {item.location}
          </Text>

          <Text style={styles.price}> {item.price}</Text>
        </View>

        <View style={styles.requestRight}>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          <TouchableOpacity
            style={styles.viewRequestButton}
            activeOpacity={0.8}
            onPress={() => {
              setSelectedRequest(item);
              setActiveImageIndex(0);
            }}
          >
            <Text style={styles.viewRequestText}>View Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const requestGallery = selectedRequest?.images?.length
    ? selectedRequest.images
    : fallbackGallery;

  const requestDescription =
    selectedRequest?.description ??
    "Looking for a reliable cleaner to help with a 2-bedroom apartment. Must be experienced, trustworthy and able to bring cleaning supplies. Flexible with time.";

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

      {/* =========================================================
          VIEW REQUEST MODAL — matches design image
      ========================================================= */}
      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            {selectedRequest && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={modalStyles.scrollContent}
              >
                {/* Hero image */}
                <View style={modalStyles.imageContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const currentIndex = Math.round(
                        event.nativeEvent.contentOffset.x / width,
                      );
                      setActiveImageIndex(currentIndex);
                    }}
                  >
                    {requestGallery.map((imageSource, index) => (
                      <Image
                        key={`${selectedRequest.id}-image-${index}`}
                        source={
                          typeof imageSource === "string"
                            ? { uri: imageSource }
                            : imageSource
                        }
                        style={modalStyles.image}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>

                  {/* Close button on image */}
                  <TouchableOpacity
                    style={modalStyles.closeButton}
                    onPress={() => setSelectedRequest(null)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={22} color="#111827" />
                  </TouchableOpacity>

                  {/* Dots */}
                  <View style={modalStyles.dotsContainer}>
                    {requestGallery.map((_, index) => (
                      <View
                        key={`dot-${index}`}
                        style={[
                          modalStyles.dot,
                          index === activeImageIndex && modalStyles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>

                {/* White content card with rounded top */}
                <View style={modalStyles.contentWrap}>
                  {/* Icon + Title + NEW */}
                  <View style={modalStyles.headerRow}>
                    <View
                      style={[
                        modalStyles.headerIcon,
                        { backgroundColor: selectedRequest.iconBackground },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={selectedRequest.icon as any}
                        size={26}
                        color={GREEN}
                      />
                    </View>

                    <View style={modalStyles.titleBlock}>
                      <View style={modalStyles.titleRow}>
                        <Text style={modalStyles.title} numberOfLines={2}>
                          {selectedRequest.title}
                        </Text>
                        <View style={modalStyles.badge}>
                          <Text style={modalStyles.badgeText}>NEW</Text>
                        </View>
                      </View>

                      <View style={modalStyles.locationRow}>
                        <Ionicons
                          name="location-outline"
                          size={15}
                          color="#6B7280"
                        />
                        <Text style={modalStyles.locationText}>
                          {selectedRequest.location}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Price */}
                  <Text style={modalStyles.price}>
                    {selectedRequest.price}
                  </Text>

                  {/* Meta row: Posted | Preferred date | Service type */}
                  <View style={modalStyles.metaGrid}>
                    <View style={modalStyles.metaItem}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color="#6B7280"
                      />
                      <View style={modalStyles.metaTextWrap}>
                        <Text style={modalStyles.metaLabel}>Posted</Text>
                        <Text style={modalStyles.metaValue}>
                          {selectedRequest.timeAgo}
                        </Text>
                      </View>
                    </View>

                    <View style={modalStyles.metaItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#6B7280"
                      />
                      <View style={modalStyles.metaTextWrap}>
                        <Text style={modalStyles.metaLabel}>
                          Preferred date
                        </Text>
                        <Text style={modalStyles.metaValue}>ASAP</Text>
                      </View>
                    </View>

                    <View style={modalStyles.metaItem}>
                      <Ionicons
                        name="radio-button-on-outline"
                        size={18}
                        color="#6B7280"
                      />
                      <View style={modalStyles.metaTextWrap}>
                        <Text style={modalStyles.metaLabel}>Service type</Text>
                        <Text style={modalStyles.metaValue} numberOfLines={1}>
                          {selectedRequest.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={modalStyles.sectionTitle}>Description</Text>
                  <Text style={modalStyles.description}>
                    {requestDescription}
                  </Text>

                  {/* Photos */}
                  <Text style={modalStyles.sectionTitle}>
                    Photos ({requestGallery.length})
                  </Text>
                  <View style={modalStyles.thumbRow}>
                    <Image
                      source={
                        typeof requestGallery[0] === "string"
                          ? { uri: requestGallery[0] }
                          : requestGallery[0]
                      }
                      style={modalStyles.thumb}
                      resizeMode="cover"
                    />
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    style={modalStyles.ctaButton}
                    activeOpacity={0.85}
                    onPress={() => setSelectedRequest(null)}
                  >
                    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                    <Text style={modalStyles.ctaText}>Send Offer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  requestDate: {
    marginLeft: 4,
    fontSize: 11,
    color: "#555",
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000",
  },

  sheet: {
    flex: 1,
    backgroundColor: "#fff",
  },

  scrollContent: {
    paddingBottom: 32,
  },

  imageContainer: {
    width: "100%",
    height: 280,
    backgroundColor: "#E5E7EB",
  },

  image: {
    width,
    height: 280,
  },

  closeButton: {
    position: "absolute",
    top: 54,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  dotsContainer: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  dotActive: {
    backgroundColor: "#FFFFFF",
  },

  contentWrap: {
    marginTop: -20,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },

  titleBlock: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 22,
  },

  badge: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  locationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  price: {
    fontSize: 26,
    fontWeight: "800",
    color: GREEN,
    marginBottom: 18,
  },

  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingBottom: 4,
  },

  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  metaTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  metaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 2,
  },

  metaValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 20,
  },

  thumbRow: {
    flexDirection: "row",
    marginBottom: 24,
  },

  thumb: {
    width: 88,
    height: 72,
    borderRadius: 12,
  },

  ctaButton: {
    backgroundColor: GREEN,
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});