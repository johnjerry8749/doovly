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
      locationName.toLowerCase().includes("click here") ||
      locationName.toLowerCase().includes("getting")
    ) {
      return professionals;
    }

    const city = locationName.split(",")[0].trim().toLowerCase();

    if (!city || city === "nigeria" || city === "all nigeria") {
      return professionals;
    }

    // Strict location filter — only pros in the selected city
    return professionals.filter((professional) => {
      const professionalCity = professional.city.toLowerCase();
      return (
        professionalCity.includes(city) || city.includes(professionalCity)
      );
    });
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

        {/* ================= PROFESSIONALS HEADER ================= */

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
              <TouchableOpacity
                style={styles.heartButton}
                activeOpacity={0.7}
                onPress={(event) => event.stopPropagation()}
              >
                <Ionicons name="heart-outline" size={17} color="#111" />
              </TouchableOpacity>

              <View style={styles.profileImageContainer}>
                <Image source={person.image} style={styles.profileImage} />

                {person.verified && (
                  <View style={styles.verifiedBadge}>
                    <Image
                      source={require("@/assets/premium/checkmark.png")}
                      style={{ width: 40, height: 40, marginLeft: -1 }}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>

              <Text style={styles.professionalName} numberOfLines={1}>
                {person.name}
              </Text>

              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#F4C400" />

                <Text style={styles.rating}>
                  {starsFromReviewCount(person.reviews.length)}
                </Text>

                <Text style={styles.reviews}>({person.reviews.length})</Text>
              </View>

              <Text style={styles.profession} numberOfLines={1}>
                {person.profession}
              </Text>

              <Text style={styles.cityText} numberOfLines={1}>
                {person.city}
              </Text>

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
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#159447",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#111",
  },

  bannerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
  },

  banner: {
    width: "100%",
    height: 160,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  seeAll: {
    color: "#159447",
    fontWeight: "700",
    fontSize: 14,
  },

  servicesContainer: {
    paddingBottom: 8,
    gap: 16,
  },

  serviceItem: {
    alignItems: "center",
    width: 78,
  },

  serviceCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  serviceName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  professionalsContainer: {
    gap: 12,
    paddingBottom: 8,
  },

  professionalCard: {
    width: 150,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#fff",
  },

  heartButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 5,
  },

  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    marginBottom: 10,
    position: "relative",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },

  verifiedBadge: {
    position: "absolute",
    right: -6,
    bottom: -4,
  },

  professionalName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  rating: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 3,
    color: "#333",
  },

  reviews: {
    fontSize: 11,
    color: "#777",
    marginLeft: 2,
  },

  profession: {
    fontSize: 12,
    color: "#555",
    marginBottom: 3,
  },

  cityText: {
    fontSize: 11,
    color: "#777",
    marginBottom: 6,
  },

  price: {
    fontSize: 13,
    fontWeight: "800",
    color: "#159447",
  },

  verifiedContainer: {
    marginTop: 24,
    backgroundColor: "#F0F9F4",
    borderRadius: 16,
    padding: 18,
  },

  shieldContainer: {
    marginBottom: 10,
  },

  verifiedTextContainer: {
    marginBottom: 14,
  },

  verifiedTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },

  verifiedSubtitle: {
    fontSize: 13,
    color: "#555",
  },

  howButton: {
    backgroundColor: "#159447",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  howButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  bottomSpacing: {
    height: 30,
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
    paddingVertical: 30,
    fontSize: 15,
  },
});
