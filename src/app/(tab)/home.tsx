import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
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
  starsFromReviewCount,
  getDistanceKm,
  type PromotedService,
} from "@/services/professionals";
import PromotedServiceCard from "@/components/PromotedServiceCard";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { isSaved, toggleSave } from "@/services/savedProviders";

import { listCitiesAsync } from "@/services/cities";
import { useLocation } from "@/context/LocationContext";

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
  const [distanceByProfessionalId, setDistanceByProfessionalId] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
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
    return () => {
      active = false;
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
        return (
          prof === cat ||
          prof.includes(cat) ||
          (cat === "spa" && prof.includes("massage"))
        );
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.profession.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      );
    }

    return list;
  }, [locationName, showAllNigeria, professionals, selectedCategory, search]);

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
        item.city.toLowerCase().includes(q);
      return matchesCity && matchesCategory && matchesSearch;
    });
  }, [promotedServices, locationName, showAllNigeria, selectedCategory, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={16} color="#159447" />
            {loadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color="#159447" />
                <Text style={styles.locationLoadingText}>Getting location...</Text>
              </View>
            ) : (
              <Text style={styles.locationText} numberOfLines={1}>
                {locationName}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesContainer}
        >
          {services.map((service, index) => {
            const active = selectedCategory === service.name;
            return (
              <TouchableOpacity
                key={`${service.name}-${index}`}
                style={styles.serviceItem}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(service.name)}
              >
                <View style={styles.serviceCircle}>
                  <MaterialCommunityIcons
                    name={service.icon as any}
                    size={26}
                    color={active ? "#159447" : "#087A38"}
                  />
                </View>
                <Text style={[styles.serviceName, active && { color: "#159447" }]}>
                  {service.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showAllNigeria || locationName === "All Nigeria"
              ? "Popular in Nigeria"
              : "Popular near you"}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tab)/services")} activeOpacity={0.7}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {filteredPromotedServices.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Promoted services</Text>
            </View>
            <View style={styles.professionalsGrid}>
              {filteredPromotedServices.map((item) => (
                <PromotedServiceCard key={item.promotionId} item={item} />
              ))}
            </View>
          </>
        )}

        {nearbyProfessionals.length === 0 ? (
          <View style={styles.emptyProsContainer}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyProsTitle}>No Avaliable professionals near you</Text>
            <Text style={styles.emptyProsSubtitle}>
              Try another location or view all in Nigeria.
            </Text>
            <TouchableOpacity
              style={styles.emptyProsButton}
              onPress={viewAllInNigeria}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyProsButtonText}>View all in Nigeria</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.professionalsGrid}>
            {nearbyProfessionals.map((person) => (
              <TouchableOpacity
                key={`${person.id}-${favTick}`}
                style={styles.professionalCard}
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
                <Text style={styles.profession} numberOfLines={1}>
                  {person.profession}
                </Text>
                <Text style={styles.cityText} numberOfLines={1}>
                  <Ionicons name="location" size={10} color="#159447" />{" "}
                  {person.city}
                </Text>
                <Text style={styles.price}>
                  {distanceByProfessionalId[person.id] !== undefined
                    ? `${distanceByProfessionalId[person.id] < 10 ? distanceByProfessionalId[person.id].toFixed(1) : Math.round(distanceByProfessionalId[person.id])} km away`
                    : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 18,
  },
  locationContainer: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12, gap: 6 },
  locationText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    flexShrink: 1,
    marginLeft: 6,
  },
  locationLoading: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 6 },
  locationLoadingText: { fontSize: 13, color: "#6B7280" },
  notificationButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
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
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 45,
    marginBottom: 18,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#111" },
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
  servicesContainer: { flexDirection: "row", gap: 14, paddingBottom: 22 },
  serviceItem: { alignItems: "center", width: 72 },
  serviceCircle: {
    width: 50,
    height: 50,
    borderRadius: 31,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },
  serviceName: { fontSize: 12, fontWeight: "600", color: "#333", textAlign: "center" },
  professionalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 25,
  },
  professionalsContainer: { flexDirection: "row", gap: 12, paddingBottom: 8 },
  professionalCard: {
    width: "31.5%",
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
  cityText: { fontSize: 10, color: "#777", marginBottom: 4 },
  price: { fontSize: 12, fontWeight: "700", color: "#159447" },
  emptyProsContainer: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 20 },
  emptyProsTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 12, textAlign: "center" },
  emptyProsSubtitle: { fontSize: 13, color: "#888", marginTop: 6, textAlign: "center" },
  emptyProsButton: {
    marginTop: 14,
    backgroundColor: "#159447",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyProsButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
