import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Dimensions,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listProfessionals,
  listProfessionalsAsync,
  invalidateProfessionalsCache,
  listActivePromotedServicesAsync,
  listServiceCategories,
  listServiceCategoriesAsync,
  starsFromReviewCount,
  getDistanceKm,
  type PromotedService,
} from "@/services/professionals";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { isSaved, toggleSave } from "@/services/savedProviders";

import { listCitiesAsync } from "@/services/cities";
import { useLocation } from "@/context/LocationContext";
import { PromotedServiceCard } from "@/components/PromotedServiceCard";
import { trackPromotionEvent } from "@/services/promotionAnalytics";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  MovingServiceDescription,
  HomeHeader,
  SearchBar,
  CategoryScroller,
  EmptyProfessionals,
} from "@/components/home";

export default function Home() {
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

  const [services, setServices] = useState(listServiceCategories());
  const [professionals, setProfessionals] = useState(listProfessionals());
  const [promotedServices, setPromotedServices] = useState<PromotedService[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [distanceByProfessionalId, setDistanceByProfessionalId] = useState<Record<string, number>>({});
  const promotedCardRefs = useRef<Record<string, View | null>>({});
  const visibilityCheckAt = useRef(0);
  const checkVisiblePromotedCards = useCallback(() => {
    const now = Date.now();
    if (now - visibilityCheckAt.current < 250) return;
    visibilityCheckAt.current = now;
    const screenHeight = Dimensions.get("window").height;
    Object.entries(promotedCardRefs.current).forEach(([serviceId, node]) => {
      node?.measureInWindow((_x, y, _width, height) => {
        if (y < screenHeight && y + height > 0) {
          void trackPromotionEvent(serviceId, "impressions");
        }
      });
    });
  }, []);

  const refreshHome = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      invalidateProfessionalsCache();
      const [nextServices, nextProfessionals, nextCities, nextPromotedServices] =
        await Promise.all([
          listServiceCategoriesAsync(),
          listProfessionalsAsync(),
          listCitiesAsync(),
          listActivePromotedServicesAsync(),
        ]);
      setServices(nextServices);
      setProfessionals(nextProfessionals);
      setCities(nextCities);
      setPromotedServices(nextPromotedServices);
    } catch (error) {
      console.warn("Home pull-to-refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    let active = true;
    const loadHomeData = () => {
      Promise.all([
        listServiceCategoriesAsync(),
        listProfessionalsAsync(),
        listCitiesAsync(),
        listActivePromotedServicesAsync(),
      ])
        .then(([nextServices, nextProfessionals, nextCities, nextPromotedServices]) => {
          if (!active) return;
          setServices(nextServices);
          setProfessionals(nextProfessionals);
          setCities(nextCities);
          setPromotedServices(nextPromotedServices);
        })
        .catch((error) => console.warn("Home data load failed:", error));
    };

    loadHomeData();
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
  }, []);

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

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [favTick, setFavTick] = useState(0);

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
    if (!query) return cities;
    return cities.filter((city) => city.toLowerCase().includes(query));
  }, [citySearch, cities]);

  const nearbyProfessionals = useMemo(() => {
    let list = professionals;

    if (
      !(
        showAllNigeria ||
        locationName === "All Nigeria" ||
        !locationName ||
        locationName === "Location unavailable" ||
        locationName.toLowerCase().includes("click here") ||
        locationName.toLowerCase().includes("getting")
      )
    ) {
      const city = locationName.split(",")[0].trim().toLowerCase();
      if (city && city !== "nigeria" && city !== "all nigeria") {
        list = list.filter((professional) => {
          const professionalCity = professional.city.toLowerCase();
          return professionalCity.includes(city) || city.includes(professionalCity);
        });
      }
    }

    if (selectedCategory && selectedCategory !== "All") {
      const cat = selectedCategory.toLowerCase();
      list = list.filter((p) => {
        const prof = p.profession.toLowerCase();
        const promoted = promotedServices.find((item) => item.professionalId === p.id);
        return (
          prof === cat ||
          prof.includes(cat) ||
          Boolean(promoted?.serviceName.toLowerCase().includes(cat)) ||
          (cat === "spa" && prof.includes("massage"))
        );
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const promoted = promotedServices.find((item) => item.professionalId === p.id);
        return (
          p.name.toLowerCase().includes(q) ||
          p.profession.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          Boolean(promoted?.serviceName.toLowerCase().includes(q)) ||
          Boolean(promoted?.serviceDescription.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [locationName, showAllNigeria, professionals, promotedServices, selectedCategory, search]);

  const filteredPromotedServices = useMemo(() => {
    const city = locationName.split(",")[0].trim().toLowerCase();
    const q = search.trim().toLowerCase();
    return promotedServices.filter((item) => {
      const matchesCity =
        showAllNigeria ||
        !city ||
        city === "nigeria" ||
        locationName === "All Nigeria" ||
        locationName === "Location unavailable" ||
        locationName.toLowerCase().includes("click here") ||
        locationName.toLowerCase().includes("getting") ||
        item.city.toLowerCase().includes(city) ||
        city.includes(item.city.toLowerCase());
      const category = selectedCategory.toLowerCase();
      const profession = item.profession.toLowerCase();
      const matchesCategory =
        selectedCategory === "All" ||
        profession === category ||
        profession.includes(category) ||
        item.serviceName.toLowerCase().includes(category) ||
        (category === "spa" && profession.includes("massage"));
      const matchesSearch =
        !q ||
        item.serviceName.toLowerCase().includes(q) ||
        item.professionalName.toLowerCase().includes(q) ||
        item.profession.toLowerCase().includes(q) ||
        item.serviceDescription.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q);
      return matchesCity && matchesCategory && matchesSearch;
    });
  }, [promotedServices, locationName, showAllNigeria, selectedCategory, search]);

  const promotedProfessionalIds = new Set(filteredPromotedServices.map((item) => item.professionalId));
  const displayedProfessionals = nearbyProfessionals.filter((person) => !promotedProfessionalIds.has(person.id));
  // Home: single horizontal row, max 10 cards (promoted first)
  const homeRowPromoted = filteredPromotedServices.slice(0, 10);
  const homeRowProfessionals = displayedProfessionals.slice(
    0,
    Math.max(0, 10 - homeRowPromoted.length),
  );
  // Keep card width similar to previous 3-column look (~31% of content width)
  const homeCardWidth = Math.floor((Dimensions.get("window").width - 32 - 16) / 3);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={() => void refreshHome()} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        onScroll={checkVisiblePromotedCards}
        scrollEventThrottle={250}
      >
        <HomeHeader
          locationName={locationName}
          loadingLocation={loadingLocation}
          onLocationPress={() => setShowLocationModal(true)}
          onNotificationPress={() =>
            router.push({
              pathname: "/notification/[id]",
              params: { id: String(getCurrentUserId()) },
            })
          }
        />

        <SearchBar value={search} onChangeText={setSearch} />

        <View style={styles.bannerContainer}>
          <Image
            source={require("@/assets/images/home_banner.png")}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What do you need help with?</Text>
          <TouchableOpacity onPress={() => router.push("/(tab)/services")} activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <CategoryScroller
          services={services}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Professions</Text>
          <TouchableOpacity onPress={() => router.push("/(tab)/services")} activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {homeRowPromoted.length === 0 && homeRowProfessionals.length === 0 ? (
          <EmptyProfessionals onViewAllInNigeria={viewAllInNigeria} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.professionalsRow}
          >
            {homeRowPromoted.map((item) => (
              <PromotedServiceCard
                key={item.promotionId}
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
                cardStyle={[styles.professionalCard, { width: homeCardWidth }]}
                DescriptionComponent={MovingServiceDescription}
                cardRef={(node) => {
                  if (node) promotedCardRefs.current[item.serviceId] = node;
                  else delete promotedCardRefs.current[item.serviceId];
                }}
                onCardLayout={checkVisiblePromotedCards}
              />
            ))}
            {homeRowProfessionals.map((person) => (
              <TouchableOpacity
                key={String(person.id) + "-" + String(favTick)}
                style={[styles.professionalCard, { width: homeCardWidth }]}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/professional/[id]",
                    params: { id: person.id, from: "home" },
                  })
                }
              >
                <TouchableOpacity
                  style={styles.heartButton}
                  activeOpacity={0.7}
                  onPress={() => onToggleFavorite(person.id)}
                >
                  <Ionicons
                    name={isSaved(person.id) ? "heart" : "heart-outline"}
                    size={17}
                    color={isSaved(person.id) ? "#EF4444" : "#111"}
                  />
                </TouchableOpacity>
                <View style={styles.profileImageContainer}>
                  <Image source={person.image} style={styles.profileImage} resizeMode="cover" />
                </View>
                <View style={styles.nameContainer}>
                  <Text style={styles.professionalName} numberOfLines={1}>
                    {person.name}
                  </Text>
                </View>
                <View style={styles.ratingContainer}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Ionicons
                      key={"star-" + person.id + "-" + index}
                      name={index < starsFromReviewCount(person.reviews.length) ? "star" : "star-outline"}
                      size={12}
                      color="#F4C400"
                    />
                  ))}
                  <Text style={styles.reviews}>({person.reviews.length})</Text>
                </View>
                <Text style={styles.profession} numberOfLines={2}>
                  {person.profession}
                </Text>
                {!!person.bio?.trim() && (
                  <Text style={styles.professionalBio} numberOfLines={2}>
                    {person.bio.trim()}
                  </Text>
                )}
                <Text style={styles.cityText} numberOfLines={1}>
                  <Ionicons name="location" size={10} color="#159447" />{" "}
                  {person.city}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.verifiedContainer}>
          <View style={styles.shieldContainer}>
            <Ionicons name="shield-checkmark-outline" size={42} color="#159447" />
          </View>
          <View style={styles.verifiedTextContainer}>
            <Text style={styles.verifiedTitle}>Verified pros. Trusted service.</Text>
            <Text style={styles.verifiedSubtitle}>
              All professionals are background checked.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.howButton}
            activeOpacity={0.8}
            onPress={() => router.push("/(tab)/how-it-works")}
          >
            <Text style={styles.howButtonText}>How it works</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

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
              <Ionicons name="navigate" size={24} color="#159447" />
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
              <Ionicons name="list-outline" size={24} color="#159447" />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Select a city</Text>
                <Text style={styles.modalOptionSub}>Pick from popular cities in Nigeria</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={viewAllInNigeria} activeOpacity={0.7}>
              <Ionicons name="globe-outline" size={24} color="#159447" />
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
                  <Ionicons name="location-outline" size={20} color="#159447" />
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
  safeArea: { flex: 1, marginBottom: 35, backgroundColor: "#fff" },
  container: { paddingHorizontal: 16, paddingBottom: 0 },
  bannerContainer: {
    width: "100%",
    height: 135,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
  },
  banner: { width: "100%", height: "100%" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  seeAll: { fontSize: 14, fontWeight: "600", color: "#159447" },
  professionalsRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 25,
    paddingRight: 8,
  },
  professionalCard: {
    width: "31%",
    height: 205,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    padding: 10,
    position: "relative",
  },
  heartButton: { position: "absolute", right: 8, top: 8, zIndex: 5 },
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
  profileImage: { width: "100%", height: "100%", borderRadius: 35 },
  nameContainer: { marginBottom: 2 },
  professionalName: { fontSize: 12, fontWeight: "700", color: "#111" },
  ratingContainer: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  rating: { fontSize: 11, fontWeight: "600", marginLeft: 3, color: "#333" },
  reviews: { fontSize: 10, color: "#777", marginLeft: 2 },
  profession: { fontSize: 11, color: "#555", marginBottom: 2 },
  professionalBio: {
    fontSize: 10,
    lineHeight: 13,
    color: "#666",
    marginTop: 2,
    marginBottom: 4,
  },
  cityText: { fontSize: 10, color: "#777", marginBottom: 4 },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    gap: 10,
  },
  shieldContainer: { marginRight: 4 },
  verifiedTextContainer: { flex: 2, minWidth: 0, marginRight: 8 },
  verifiedTitle: { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 3 },
  verifiedSubtitle: { fontSize: 11, color: "#555", lineHeight: 16 },
  howButton: {
    backgroundColor: "#159447",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 105,
  },
  howButtonText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  bottomSpacing: { height: 30 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
  cityPickerSheet: { maxHeight: "80%" },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 18 },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalOptionText: { marginLeft: 14, flex: 1 },
  modalOptionTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  modalOptionSub: { fontSize: 12, color: "#777", marginTop: 2 },
  modalCancel: { marginTop: 16, alignItems: "center", paddingVertical: 12 },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#888" },
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
  citySearchInput: { flex: 1, fontSize: 15, color: "#111", marginLeft: 8 },
  cityList: { maxHeight: 320 },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  cityItemText: { flex: 1, fontSize: 15, color: "#111", marginLeft: 12 },
  emptyCitiesText: { textAlign: "center", color: "#888", marginTop: 30, fontSize: 14 },
});
