import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import {
  listProfessionals,
  listServiceCategories,
  starsFromReviewCount,
} from "@/services/professionals";

import { NIGERIA_CITIES } from "@/data/cities";

export default function Home() {
  // =========================
  // STATE
  // =========================

  const [locationName, setLocationName] = useState("Lagos, Nigeria");
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showAllNigeria, setShowAllNigeria] = useState(false);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const [citySearch, setCitySearch] = useState("");

  // =========================
  // DATA
  // =========================

  const services = listServiceCategories();
  const professionals = listProfessionals();

  // =========================
  // LOCATION
  // =========================

  const getUserLocation = async () => {
    try {
      setLoadingLocation(true);
      setShowAllNigeria(false);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationName("Click here to select location");
        setUserCoords(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      setUserCoords({
        latitude,
        longitude,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address.length > 0) {
        const place = address[0];

        const city =
          place.city || place.subregion || place.district || "Unknown location";

        const country = place.country || "Nigeria";

        setLocationName(`${city}, ${country}`);
      } else {
        setLocationName("Location unavailable");
      }
    } catch (error) {
      console.log("Location error:", error);

      setLocationName("Location unavailable");
      setUserCoords(null);
    } finally {
      setLoadingLocation(false);
      setShowLocationModal(false);
    }
  };

  const selectCity = (city: string) => {
    setShowAllNigeria(false);
    setLocationName(`${city}, Nigeria`);
    setUserCoords(null);

    setShowCityPicker(false);
    setShowLocationModal(false);
    setCitySearch("");
  };

  const viewAllInNigeria = () => {
    setShowAllNigeria(true);
    setLocationName("All Nigeria");
    setUserCoords(null);

    setShowLocationModal(false);
  };

  // =========================
  // INITIAL LOCATION
  // =========================

  useEffect(() => {
    getUserLocation();
  }, []);

  // =========================
  // CITY SEARCH
  // =========================

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();

    if (!query) {
      return [...NIGERIA_CITIES];
    }

    return NIGERIA_CITIES.filter((city) => city.toLowerCase().includes(query));
  }, [citySearch]);

  // =========================
  // PROFESSIONAL FILTER
  // =========================

  const nearbyProfessionals = useMemo(() => {
    if (showAllNigeria || locationName === "All Nigeria") {
      return professionals;
    }

    if (
      !locationName ||
      locationName === "Location unavailable" ||
      locationName.toLowerCase().includes("getting")
    ) {
      return professionals;
    }

    const city = locationName.split(",")[0].trim().toLowerCase();

    if (!city || city === "nigeria" || city === "all nigeria") {
      return professionals;
    }

    const filtered = professionals.filter((professional) => {
      const professionalCity = professional.city.toLowerCase();

      return professionalCity.includes(city) || city.includes(professionalCity);
    });

    return filtered.length > 0 ? filtered : professionals;
  }, [locationName, showAllNigeria, professionals]);

  // =========================
  // CLOSE CITY PICKER
  // =========================

  const closeCityPicker = () => {
    setShowCityPicker(false);
    setCitySearch("");
  };

  // =========================
  // RENDER
  // =========================

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* ================= HEADER ================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={28} color="#159447" />

            {loadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator size="small" color="#159447" />

                <Text style={styles.locationLoadingText}>
                  Getting location...
                </Text>
              </View>
            ) : (
              <Text style={styles.locationText} numberOfLines={1}>
                {locationName}
              </Text>
            )}

            <Ionicons name="chevron-down" size={18} color="#111" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={28} color="#111" />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* ================= SEARCH ================= */}

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={27} color="#555" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search for a service..."
            placeholderTextColor="#888"
          />

          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="options-outline" size={28} color="#159447" />
          </TouchableOpacity>
        </View>

        {/* ================= BANNER ================= */}

        <View style={styles.bannerContainer}>
          <Image
            source={require("@/assets/images/home_banner.png")}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>

        {/* ================= SERVICES HEADER ================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What do you need help with?</Text>

          <TouchableOpacity
            onPress={() => router.push("/(tab)/services")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* ================= SERVICES ================= */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesContainer}
        >
          {services.map((service, index) => (
            <TouchableOpacity
              key={`${service.name}-${index}`}
              style={styles.serviceItem}
              activeOpacity={0.7}
            >
              <View style={styles.serviceCircle}>
                <MaterialCommunityIcons
                  name={service.icon as any}
                  size={31}
                  color="#087A38"
                />
              </View>

              <Text style={styles.serviceName}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ================= PROFESSIONALS HEADER ================= */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showAllNigeria || locationName === "All Nigeria"
              ? "Popular in Nigeria"
              : "Popular near you"}
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(tab)/services")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* ================= PROFESSIONALS ================= */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.professionalsContainer}
        >
          {nearbyProfessionals.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.professionalCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/professional/${person.id}`)}
            >
              {/* HEART */}

              <TouchableOpacity
                style={styles.heartButton}
                activeOpacity={0.7}
                onPress={(event) => event.stopPropagation()}
              >
                <Ionicons name="heart-outline" size={17} color="#111" />
              </TouchableOpacity>

              {/* PROFILE IMAGE */}

              <View style={styles.profileImageContainer}>
                <Image source={person.image} style={styles.profileImage} />

                {person.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* NAME */}

              <Text style={styles.professionalName} numberOfLines={1}>
                {person.name}
              </Text>

              {/* RATING */}

              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#F4C400" />

                <Text style={styles.rating}>
                  {starsFromReviewCount(person.reviews.length)}
                </Text>

                <Text style={styles.reviews}>({person.reviews.length})</Text>
              </View>

              {/* PROFESSION */}

              <Text style={styles.profession} numberOfLines={1}>
                {person.profession}
              </Text>

              {/* CITY */}

              <Text style={styles.cityText} numberOfLines={1}>
                {person.city}
              </Text>

              {/* PRICE */}

              <Text style={styles.price}>From {person.priceFrom}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ================= VERIFIED BANNER ================= */}

        <View style={styles.verifiedContainer}>
          <View style={styles.shieldContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={42}
              color="#159447"
            />
          </View>

          <View style={styles.verifiedTextContainer}>
            <Text style={styles.verifiedTitle}>
              Verified pros. Trusted service.
            </Text>

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

      {/* ================= LOCATION MODAL ================= */}

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

            {/* CURRENT LOCATION */}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={getUserLocation}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={24} color="#159447" />

              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>
                  Use current location
                </Text>

                <Text style={styles.modalOptionSub}>
                  Allow access to detect your position
                </Text>
              </View>
            </TouchableOpacity>

            {/* CITY */}

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

                <Text style={styles.modalOptionSub}>
                  Pick from popular cities in Nigeria
                </Text>
              </View>
            </TouchableOpacity>

            {/* ALL NIGERIA */}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={viewAllInNigeria}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={24} color="#159447" />

              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>View all in Nigeria</Text>

                <Text style={styles.modalOptionSub}>
                  See professionals from every city
                </Text>
              </View>
            </TouchableOpacity>

            {/* CANCEL */}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ================= CITY PICKER ================= */}

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

            {/* SEARCH */}

            <View style={styles.citySearchBox}>
              <Ionicons name="search-outline" size={20} color="#888" />

              <TextInput
                style={styles.citySearchInput}
                placeholder="Filter cities..."
                placeholderTextColor="#888"
                value={citySearch}
                onChangeText={setCitySearch}
                autoCorrect={false}
              />

              {citySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearch("")}>
                  <Ionicons name="close-circle" size={20} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>

            {/* CITY LIST */}

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.cityList}
              ListEmptyComponent={
                <Text style={styles.emptyCitiesText}>
                  No city found. Try another spelling.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cityItem}
                  onPress={() => selectCity(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={20} color="#159447" />

                  <Text style={styles.cityItemText}>{item}</Text>

                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
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

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 18,
  },

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 15,
  },

  locationText: {
    flex: 1,
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    marginLeft: 8,
    marginRight: 5,
  },

  locationLoading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  locationLoadingText: {
    fontSize: 15,
    color: "#555",
    marginLeft: 7,
  },

  notificationButton: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#159447",
    right: 1,
    top: 0,
  },

  // SEARCH
  searchContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: "#111",
  },

  // BANNER
  bannerContainer: {
    width: "100%",
    height: 130,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 26,
  },

  banner: {
    width: "100%",
    height: "100%",
  },

  // SECTION
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  seeAll: {
    fontSize: 16,
    fontWeight: "700",
    color: "#158A40",
  },

  // SERVICES
  servicesContainer: {
    gap: 2,
    paddingBottom: 27,
  },

  serviceItem: {
    width: 78,
    alignItems: "center",
  },

  serviceCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF8EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  serviceName: {
    fontSize: 13,
    color: "#222",
    textAlign: "center",
  },

  // PROFESSIONALS
  professionalsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 25,
  },

  professionalCard: {
    width: 115,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
  },

  heartButton: {
    position: "absolute",
    right: 5,
    top: 5,
    zIndex: 2,
    backgroundColor: "#fff",
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 7,
    position: "relative",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },

  // Blue verified badge on profile image
  verifiedBadge: {
    position: "absolute",
    right: -3,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0A66C2",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  professionalName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111",
    marginBottom: 3,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  rating: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },

  reviews: {
    fontSize: 9,
    color: "#666",
    marginLeft: 2,
  },

  profession: {
    fontSize: 10,
    color: "#555",
    marginBottom: 3,
  },

  cityText: {
    fontSize: 9,
    color: "#777",
    marginBottom: 4,
  },

  price: {
    fontSize: 10,
    color: "#159447",
    fontWeight: "700",
  },

  // VERIFIED BANNER
  verifiedContainer: {
    minHeight: 80,
    borderRadius: 17,
    backgroundColor: "#F0FAF0",
    borderWidth: 1,
    borderColor: "#DDEDDD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  shieldContainer: {
    width: 45,
    height: 65,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  verifiedTextContainer: {
    flex: 1,
  },

  verifiedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  verifiedSubtitle: {
    fontSize: 11,
    color: "#555",
  },

  howButton: {
    backgroundColor: "#159447",
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  howButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  bottomSpacing: {
    height: 30,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
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
    fontWeight: "700",
    color: "#111",
    marginBottom: 18,
  },

  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  modalOptionText: {
    flex: 1,
    marginLeft: 14,
  },

  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  modalOptionSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },

  modalCancel: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 16,
  },

  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },

  // CITY SEARCH
  citySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },

  citySearchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: "#111",
    paddingVertical: 0,
  },

  cityList: {
    marginTop: 8,
  },

  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  cityItemText: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    marginLeft: 12,
  },

  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    paddingVertical: 30,
    fontSize: 15,
  },
});
