import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listProfessionals,
  listProfessionalsAsync,
  listActivePromotedServicesAsync,
  listServiceCategories,
  listServiceCategoriesAsync,
  getDistanceKm,
  starsFromReviewCount,
  type Professional,
  type PromotedService,
} from "@/services/professionals";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { isSaved, toggleSave } from "@/services/savedProviders";
import { listCities, listCitiesAsync } from "@/services/cities";
import { useLocation } from "@/context/LocationContext";
import { PromotedServiceCard } from "@/components/PromotedServiceCard";

const GREEN = "#159447";

function MovingServiceDescription({ text, color = "#666" }: { text: string; color?: string }) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);
    if (!text || containerWidth <= 0 || textWidth <= containerWidth) return;

    const distance = textWidth - containerWidth;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(translateX, {
          toValue: -distance,
          duration: Math.max(2200, distance * 38),
          useNativeDriver: true,
        }),
        Animated.delay(650),
        Animated.timing(translateX, {
          toValue: 0,
          duration: Math.max(2200, distance * 38),
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [text, containerWidth, textWidth, translateX]);

  if (!text.trim()) return null;

  return (
    <View
      style={{ width: "100%", overflow: "hidden", marginTop: 2, marginBottom: 2 }}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.Text
        numberOfLines={1}
        onLayout={(event) => {
          const measuredWidth = event.nativeEvent.layout.width;
          if (measuredWidth !== textWidth) setTextWidth(measuredWidth);
        }}
        style={{
          alignSelf: "flex-start",
          color,
          fontSize: 10,
          transform: [{ translateX }],
        }}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export default function Services() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [favTick, setFavTick] = useState(0);
  const [categories, setCategories] = useState(listServiceCategories());
  const [professionals, setProfessionals] = useState(listProfessionals());
  const [promotedServices, setPromotedServices] = useState<PromotedService[]>([]);
  const [cities, setCities] = useState<string[]>(listCities());
  const [distanceByProfessionalId, setDistanceByProfessionalId] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    Promise.all([
      listServiceCategoriesAsync(),
      listProfessionalsAsync(),
      listCitiesAsync(),
      listActivePromotedServicesAsync(),
    ])
      .then(([nextCategories, nextProfessionals, nextCities, nextPromotedServices]) => {
        if (!active) return;
        setCategories(nextCategories);
        setProfessionals(nextProfessionals);
        setCities(nextCities);
        setPromotedServices(nextPromotedServices);
      })
      .catch((error) => {
        console.warn("Services data load failed:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const {
    locationName,
    loadingLocation,
    showAllNigeria,
    showLocationModal,
    setShowLocationModal,
    showCityPicker,
    setShowCityPicker,
    citySearch,
    setCitySearch,
    getUserLocation,
    selectCity,
    viewAllInNigeria,
    closeCityPicker,
  } = useLocation();


  useEffect(() => {
    let mounted = true;

    const loadDistances = async () => {
      if (!professionals.length) return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const entries = await Promise.all(
          professionals.map(async (professional) => {
            let latitude = Number(professional.latitude);
            let longitude = Number(professional.longitude);

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude) ||
              (latitude === 0 && longitude === 0)
            ) {
              const geocoded = await Location.geocodeAsync(
                `${professional.city}, Nigeria`,
              );
              if (geocoded.length > 0) {
                latitude = geocoded[0].latitude;
                longitude = geocoded[0].longitude;
              }
            }

            if (
              Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              !(latitude === 0 && longitude === 0)
            ) {
              return [
                professional.id,
                getDistanceKm(
                  current.coords.latitude,
                  current.coords.longitude,
                  latitude,
                  longitude,
                ),
              ] as const;
            }

            return null;
          }),
        );

        if (!mounted) return;

        const next: Record<string, number> = {};
        entries.forEach((entry) => {
          if (entry) next[entry[0]] = entry[1];
        });
        setDistanceByProfessionalId(next);
      } catch (error) {
        console.warn("Professional distance load failed:", error);
      }
    };

    void loadDistances();

    return () => {
      mounted = false;
    };
  }, [professionals]);

  const onToggleFavorite = useCallback(async (proId: string) => {
    const result = await toggleSave(proId);

    if (!result.ok && result.reason === "limit") {
      Alert.alert(
        "Save limit reached",
        "Free users can save up to 5 providers. Upgrade to Pro for unlimited saves.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => router.push("/profile/subscription/subscription"),
          },
        ],
      );
      return;
    }

    if (!result.ok && result.reason === "error") {
      Alert.alert("Could not update", result.message || "Please check your connection and try again.");
      return;
    }

    if (result.ok) {
      setFavTick((t) => t + 1);
    }
  }, []);

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return [...cities];
    return cities.filter((city) => city.toLowerCase().includes(query));
  }, [citySearch, cities]);

  const matchesLocationCity = useCallback(
    (itemCity: string) => {
      if (
        showAllNigeria ||
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
      const professionalCity = itemCity.toLowerCase();
      return professionalCity.includes(city) || city.includes(professionalCity);
    },
    [locationName, showAllNigeria],
  );

  const matchesCategory = useCallback((profession: string, filter: string) => {
    if (filter === "All") return true;
    const category = filter.toLowerCase();
    const professional = profession.toLowerCase();
    if (professional === category || professional.includes(category))
      return true;
    if (
      category === "spa" &&
      (professional.includes("massage") || professional.includes("spa"))
    ) {
      return true;
    }
    if (category === "nail tech" && professional.includes("nail")) return true;
    return false;
  }, []);

  const filteredProfessionals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = professionals.filter((person) => {
      const promoted = promotedServices.find((service) => service.professionalId === person.id);
      const matchesSearch =
        !q ||
        person.name.toLowerCase().includes(q) ||
        person.profession.toLowerCase().includes(q) ||
        person.city.toLowerCase().includes(q) ||
        Boolean(promoted?.serviceName.toLowerCase().includes(q)) ||
        Boolean(promoted?.serviceDescription.toLowerCase().includes(q));
      return (
        matchesSearch &&
        (
          matchesCategory(person.profession, selectedFilter) ||
          selectedFilter === "All" ||
          Boolean(promoted?.serviceName.toLowerCase().includes(selectedFilter.toLowerCase()))
        ) &&
        matchesLocationCity(person.city)
      );
    });
    return matches;
  }, [
    professionals,
    promotedServices,
    search,
    selectedFilter,
    matchesCategory,
    matchesLocationCity,
  ]);

  const filteredPromotedServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promotedServices.filter((item) => {
      const matchesSearch =
        !q ||
        item.serviceName.toLowerCase().includes(q) ||
        item.professionalName.toLowerCase().includes(q) ||
        item.profession.toLowerCase().includes(q) ||
        item.serviceDescription.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (
          matchesCategory(item.profession, selectedFilter) ||
          selectedFilter === "All" ||
          item.serviceName.toLowerCase().includes(selectedFilter.toLowerCase())
        ) &&
        matchesLocationCity(item.city)
      );
    });
  }, [promotedServices, search, selectedFilter, matchesCategory, matchesLocationCity]);

  const promotedProfessionalIds = new Set(filteredPromotedServices.map((item) => item.professionalId));
  const displayedProfessionals = filteredProfessionals.filter((person) => !promotedProfessionalIds.has(person.id));

  // Promoted service cards and regular professionals share one grid.
  // A promoted professional is represented by the promoted service card only.
  const combinedCards = useMemo(
    () => [
      ...filteredPromotedServices.map((item) => ({ ...item, cardType: "promoted" as const })),
      ...displayedProfessionals.map((item) => ({ ...item, cardType: "professional" as const })),
    ],
    [filteredPromotedServices, displayedProfessionals],
  );

  const renderGridCard = ({ item }: { item: (typeof combinedCards)[number] }) => {
    if (item.cardType === "promoted") {
      return (
        <PromotedServiceCard
          professionalId={item.professionalId}
          serviceId={item.serviceId}
          serviceName={item.serviceName}
          serviceDescription={item.serviceDescription}
          price={item.price}
          priceValue={item.priceValue}
          avatarUrl={item.avatarUrl}
          cardStyle={styles.professionalCard}
          DescriptionComponent={MovingServiceDescription}
        />
      );
    }
    return renderProfessional({ item });
  };

  const renderProfessional = ({ item }: { item: Professional }) => {
    const saved = isSaved(item.id);
    const stars = starsFromReviewCount(item.reviews?.length || 0);

    return (
      <TouchableOpacity
        style={styles.professionalCard}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/professional/[id]",
            params: { id: item.id },
          })
        }
      >
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite(item.id)}
          hitSlop={8}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={16}
            color={saved ? "#EF4444" : "#9CA3AF"}
          />
        </TouchableOpacity>

        <View style={styles.profileImageContainer}>
          <Image
            source={item.image}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={styles.professionalName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }, (_, index) => (
              <Ionicons
                key={"star-" + item.id + "-" + index}
                name={index < stars ? "star" : "star-outline"}
                size={12}
                color="#F4C400"
              />
            ))}
            <Text style={styles.reviewCount}>
              ({item.reviews?.length || 0})
            </Text>
          </View>

          <Text style={styles.profession} numberOfLines={1}>
            {item.profession}
          </Text>

          <Text style={styles.city} numberOfLines={1}>
            <Ionicons name="location" size={10} color={GREEN} />{" "}
            {item.city}
          </Text>

          <Text style={styles.price}>
            {distanceByProfessionalId[item.id] !== undefined
              ? `${distanceByProfessionalId[item.id] < 10 ? distanceByProfessionalId[item.id].toFixed(1) : Math.round(distanceByProfessionalId[item.id])} km away`
              : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.stickyHeader}>
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={16} color={GREEN} />
            {loadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={styles.locationLoadingText}>
                  Getting location...
                </Text>
              </View>
            ) : (
              <Text style={styles.locationText} numberOfLines={1}>
                {locationName || "All Nigeria"}
              </Text>
            )}
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>

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

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search professionals..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.fixedCategorySection}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          renderItem={({ item: filter }) => {
            const active = selectedFilter === filter.name;
            return (
              <TouchableOpacity
                style={styles.filterItem}
                onPress={() => setSelectedFilter(filter.name)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.filterCircle,
                    active && styles.activeFilterCircle,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={filter.icon as any}
                    size={22}
                    color={active ? "#fff" : GREEN}
                  />
                </View>
                <Text
                  style={[styles.filterName, active && styles.activeFilterName]}
                  numberOfLines={1}
                >
                  {filter.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Professionals</Text>
        <Text style={styles.resultCount}>
          {displayedProfessionals.length} found
        </Text>
      </View>

      <FlatList
        data={combinedCards}
        extraData={`${favTick}-${selectedFilter}-${filteredPromotedServices.length}`}
        keyExtractor={(item) => item.cardType === "promoted" ? `promotion-${item.promotionId}` : `professional-${item.id}`}
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.professionalList}
        renderItem={renderGridCard}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={42} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No professionals found</Text>
            <Text style={styles.emptyText}>Try another filter or search term.</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.listBottomSpace} />}

      />

      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLocationModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose location</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={getUserLocation}
            >
              <Ionicons name="navigate" size={22} color={GREEN} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>
                  Use current location
                </Text>
                <Text style={styles.modalOptionSub}>GPS based</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowLocationModal(false);
                setShowCityPicker(true);
              }}
            >
              <Ionicons name="list-outline" size={22} color={GREEN} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Select a city</Text>
                <Text style={styles.modalOptionSub}>Pick from list</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={viewAllInNigeria}
            >
              <Ionicons name="globe-outline" size={22} color={GREEN} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>View all in Nigeria</Text>
                <Text style={styles.modalOptionSub}>No location filter</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={closeCityPicker}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.cityPickerSheet]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select a city</Text>
            <View style={styles.citySearchBox}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.citySearchInput}
                placeholder="Filter cities..."
                placeholderTextColor="#9CA3AF"
                value={citySearch}
                onChangeText={setCitySearch}
              />
            </View>
            <FlatList
              data={filteredCities}
              keyExtractor={(c) => c}
              style={styles.cityList}
              renderItem={({ item: city }) => (
                <TouchableOpacity
                  style={styles.cityItem}
                  onPress={() => selectCity(city)}
                >
                  <Ionicons name="location-outline" size={20} color={GREEN} />
                  <Text style={styles.cityItemText}>{city}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyCitiesText}>No cities found</Text>
              }
            />
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={closeCityPicker}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  stickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationLoadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
  locationText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    flexShrink: 1,
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
    backgroundColor: "#159447",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  fixedCategorySection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterItem: {
    alignItems: "center",
    marginRight: 14,
    width: 72,
  },
  filterCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  activeFilterCircle: {
    backgroundColor: GREEN,
  },
  filterName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  activeFilterName: {
    color: GREEN,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  resultCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  professionalList: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 10,
  },
  promotionSection: { paddingBottom: 2 },
  promotedServiceGrid: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  promotedServiceCard: {
    width: 165,
    minHeight: 142,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    padding: 10,
  },
  promotedCardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 7 },
  promotedProfessionalImage: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E5E7EB" },
  promotedProfessionalImageFallback: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" },
  promotedBadge: {
    alignSelf: "flex-start",
    backgroundColor: GREEN,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 7,
  },
  promotedBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" },
  promotedServiceName: { fontSize: 12, fontWeight: "700", color: GREEN, marginBottom: 3 },
  promotedDescription: { fontSize: 10, lineHeight: 13, color: "#666", marginBottom: 5 },
  promotedPrice: { fontSize: 12, fontWeight: "800", color: GREEN },
  bookNowButton: { marginTop: 7, backgroundColor: GREEN, borderRadius: 7, paddingVertical: 6, alignItems: "center" },
  bookNowButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  professionalCard: {
    flex: 1,
    maxWidth: "31%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  promotedInlineGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  favoriteButton: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 5,
  },
  profileImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
  },
  cardContent: {
    padding: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  professionalName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 3,
    color: "#333",
  },
  reviewCount: {
    fontSize: 10,
    color: "#777",
    marginLeft: 2,
  },
  profession: {
    fontSize: 11,
    color: "#555",
    marginBottom: 2,
  },
  city: {
    fontSize: 10,
    color: "#777",
    marginBottom: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: "800",
    color: GREEN,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 10,
  },
  emptyText: {
    color: "#888",
    marginTop: 5,
    fontSize: 13,
    textAlign: "center",
  },
  listBottomSpace: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
  },
  cityPickerSheet: {
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  modalOptionSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  citySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  cityList: {
    maxHeight: 320,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  cityItemText: {
    fontSize: 15,
    color: "#111",
    marginLeft: 12,
  },
  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    paddingVertical: 24,
  },
});
