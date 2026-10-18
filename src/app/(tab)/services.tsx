import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
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
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listProfessionals,
  listProfessionalsAsync,
  invalidateProfessionalsCache,
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
import { trackPromotionEvent } from "@/services/promotionAnalytics";
import {
  MovingServiceDescription,
  HomeSearchBar,
  ServiceCategoryScroller,
} from "@/components/home";

const GREEN = "#159447";

export default function Services() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [favTick, setFavTick] = useState(0);
  const [categories, setCategories] = useState(listServiceCategories());
  const [professionals, setProfessionals] = useState(listProfessionals());
  const [promotedServices, setPromotedServices] = useState<PromotedService[]>([]);
  const [cities, setCities] = useState<string[]>(listCities());
  const [distanceByProfessionalId, setDistanceByProfessionalId] = useState<Record<string, number>>({});
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    viewableItems.forEach(({ item }) => {
      const card = item as { cardType?: string; serviceId?: string };
      if (card.cardType === "promoted" && card.serviceId) {
        void trackPromotionEvent(card.serviceId, "impressions");
      }
    });
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      invalidateProfessionalsCache();
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

      const promotionRefresh = setInterval(() => {
        listActivePromotedServicesAsync()
          .then((nextPromotedServices) => {
            if (active) setPromotedServices(nextPromotedServices);
          })
          .catch((error) => console.warn("Promotion refresh failed:", error));
      }, 15000);

      return () => {
        active = false;
        clearInterval(promotionRefresh);
      };
    }, []),
  );

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
    if (professional === category || professional.includes(category)) return true;
    if (category === "spa" && (professional.includes("massage") || professional.includes("spa"))) {
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
        (matchesCategory(person.profession, selectedFilter) ||
          selectedFilter === "All" ||
          Boolean(promoted?.serviceName.toLowerCase().includes(selectedFilter.toLowerCase()))) &&
        matchesLocationCity(person.city)
      );
    });
    return matches;
  }, [professionals, promotedServices, search, selectedFilter, matchesCategory, matchesLocationCity]);

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
        (matchesCategory(item.profession, selectedFilter) ||
          selectedFilter === "All" ||
          item.serviceName.toLowerCase().includes(selectedFilter.toLowerCase())) &&
        matchesLocationCity(item.city)
      );
    });
  }, [promotedServices, search, selectedFilter, matchesCategory, matchesLocationCity]);

  const promotedProfessionalIds = new Set(filteredPromotedServices.map((item) => item.professionalId));
  const displayedProfessionals = filteredProfessionals.filter((person) => !promotedProfessionalIds.has(person.id));

  const combinedCards = useMemo(
    () => [
      ...filteredPromotedServices.map((item) => ({ ...item, cardType: "promoted" as const })),
      ...displayedProfessionals.map((item) => ({ ...item, cardType: "professional" as const })),
    ],
    [filteredPromotedServices, displayedProfessionals],
  );

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
          <Image source={item.image} style={styles.profileImage} resizeMode="cover" />
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
            <Text style={styles.reviewCount}>({item.reviews?.length || 0})</Text>
          </View>

          <Text style={styles.profession} numberOfLines={2}>
            {item.profession}
          </Text>

          {!!item.bio?.trim() && (
            <Text style={styles.professionalBio} numberOfLines={2}>
              {item.bio.trim()}
            </Text>
          )}

          <Text style={styles.city} numberOfLines={1}>
            <Ionicons name="location" size={10} color={GREEN} /> {item.city}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridCard = ({ item }: { item: (typeof combinedCards)[number] }) => {
    if (item.cardType === "promoted") {
      return (
        <PromotedServiceCard
          professionalId={item.professionalId}
          serviceId={item.serviceId}
          promotionId={item.promotionId}
          serviceName={item.serviceName}
          serviceDescription={item.serviceDescription}
          city={item.city}
          price={item.price}
          priceValue={item.priceValue}
          avatarUrl={item.avatarUrl}
          category={item.profession}
          rating={item.rating}
          reviewCount={item.reviewCount}
          cardStyle={styles.professionalCard}
          DescriptionComponent={MovingServiceDescription}
        />
      );
    }
    return renderProfessional({ item });
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
                <Text style={styles.locationLoadingText}>Getting location...</Text>
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
                params: { id: String(getCurrentUserId()) },
              })
            }
          >
            <Ionicons name="notifications-outline" size={28} color="#111" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <HomeSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search professionals..."
          containerStyle={styles.searchContainer}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={styles.fixedCategorySection}>
        <ServiceCategoryScroller
          services={categories}
          selectedCategory={selectedFilter}
          onSelect={setSelectedFilter}
          variant="services"
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Professionals</Text>
        <Text style={styles.resultCount}>{displayedProfessionals.length} found</Text>
      </View>

      <FlatList
        data={combinedCards}
        extraData={`${favTick}-${selectedFilter}-${filteredPromotedServices.map((service) => `${service.serviceId}:${service.serviceName}:${service.serviceDescription}:${service.price}:${service.priceValue}`).join("|")}`}
        keyExtractor={(item) =>
          item.cardType === "promoted"
            ? `promotion-${item.promotionId}`
            : `professional-${item.id}`
        }
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.professionalList}
        renderItem={renderGridCard}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocationModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose location</Text>
            <TouchableOpacity style={styles.modalOption} onPress={getUserLocation} activeOpacity={0.7}>
              <Ionicons name="navigate" size={24} color={GREEN} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Use current location</Text>
                <Text style={styles.modalOptionSub}>Allow access to detect your position</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowLocationModal(false);
                setShowCityPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={24} color={GREEN} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Select a city</Text>
                <Text style={styles.modalOptionSub}>Pick from popular cities in Nigeria</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={viewAllInNigeria} activeOpacity={0.7}>
              <Ionicons name="globe-outline" size={24} color={GREEN} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>View all in Nigeria</Text>
                <Text style={styles.modalOptionSub}>See professionals from every city</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLocationModal(false)}>
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
              <Ionicons name="search-outline" size={20} color="#888" />
              <TextInput
                style={styles.citySearchInput}
                placeholder="Filter cities..."
                placeholderTextColor="#999"
                value={citySearch}
                onChangeText={setCitySearch}
              />
            </View>
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              style={styles.cityList}
              renderItem={({ item: city }) => (
                <TouchableOpacity style={styles.cityItem} onPress={() => selectCity(city)}>
                  <Ionicons name="location-outline" size={20} color={GREEN} />
                  <Text style={styles.cityItemText}>{city}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyCitiesText}>No cities found</Text>
              }
            />
            <TouchableOpacity style={styles.modalCancel} onPress={closeCityPicker}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  stickyHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
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
  professionalCard: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    padding: 10,
    position: "relative",
    minHeight: 200,
  },
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
    marginTop: 6,
    marginBottom: 8,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    marginBottom: 2,
  },
  professionalName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
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
  professionalBio: {
    fontSize: 10,
    lineHeight: 13,
    color: "#666",
    marginTop: 2,
    marginBottom: 4,
  },
  city: {
    fontSize: 10,
    color: "#777",
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
    marginTop: 6,
    textAlign: "center",
  },
  listBottomSpace: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
  cityPickerSheet: {
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 18,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalOptionText: {
    marginLeft: 14,
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  modalOptionSub: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  modalCancel: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888",
  },
  citySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  citySearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginLeft: 8,
  },
  cityList: {
    maxHeight: 320,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  cityItemText: {
    flex: 1,
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
