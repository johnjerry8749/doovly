import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
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

  const getUserLocation = async () => {
    try {
      setLoadingLocation(true);
      setShowAllNigeria(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationName("click here to select Location");
        setUserCoords(null);
        setLoadingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setUserCoords({ latitude, longitude });
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address.length > 0) {
        const place = address[0];
        const city =
          place.city || place.subregion || place.district || "Unknown location";
        const country = place.country || "";
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

  useEffect(() => {
    getUserLocation();
  }, []);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return [...NIGERIA_CITIES];
    return NIGERIA_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [citySearch]);

  // Data from services layer (mock now → API later)
  const services = listServiceCategories();
  const professionals = listProfessionals();

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
    const cityKey = locationName.split(",")[0].trim().toLowerCase();
    if (cityKey === "nigeria" || cityKey === "all nigeria") {
      return professionals;
    }
    const filtered = professionals.filter(
      (p) =>
        p.city.toLowerCase().includes(cityKey) ||
        cityKey.includes(p.city.toLowerCase()),
    );
    return filtered.length > 0 ? filtered : professionals;
  }, [locationName, showAllNigeria, professionals]);

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
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={28} color="#111" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={27} color="#555" />
          <TextInput
            placeholder="Search for a service..."
            placeholderTextColor="#888"
            style={styles.searchInput}
          />
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="options-outline" size={28} color="#159447" />
          </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => router.push("/(tab)/services")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesContainer}
        >
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showAllNigeria || locationName === "All Nigeria"
              ? "Popular in Nigeria"
              : "Popular near you"}
          </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text
              style={styles.seeAll}
              onPress={() => router.push("/(tab)/services")}
            >
              See all
            </Text>
          </TouchableOpacity>
        </View>

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
              <TouchableOpacity style={styles.heartButton} activeOpacity={0.7}>
                <Ionicons name="heart-outline" size={17} color="#111" />
              </TouchableOpacity>
              <View style={styles.profileImageContainer}>
                <Image source={person.image} style={styles.profileImage} />
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              </View>
              <Text style={styles.professionalName} numberOfLines={1}>
                {person.name}
              </Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#F4C400" />
                <Text style={styles.rating}>
                  {starsFromReviewCount(person.reviews.length)}
                </Text>
                <Text style={styles.reviews}>
                  ({person.reviews.length})
                </Text>
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
              All professionals are background-checked.
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

        <View style={{ height: 30 }} />
      </ScrollView>

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

      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCityPicker(false);
          setCitySearch("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
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
              style={{ marginTop: 8 }}
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
              onPress={() => {
                setShowCityPicker(false);
                setCitySearch("");
              }}
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
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingBottom: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    maxWidth: 200,
  },
  locationLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationLoadingText: { fontSize: 14, color: "#159447" },
  notificationButton: { position: "relative", padding: 4 },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: "#111" },
  bannerContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  banner: { width: "100%", height: 140 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  seeAll: { fontSize: 14, fontWeight: "600", color: "#159447" },
  servicesContainer: { paddingHorizontal: 16, gap: 16, marginBottom: 22 },
  serviceItem: { alignItems: "center", width: 72 },
  serviceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F8EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  serviceName: { fontSize: 12, color: "#333", textAlign: "center" },
  professionalsContainer: { paddingHorizontal: 16, gap: 14, marginBottom: 20 },
  professionalCard: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    position: "relative",
  },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
  },
  profileImageContainer: { alignItems: "center", marginBottom: 8 },
  profileImage: { width: 70, height: 70, borderRadius: 35 },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: "28%",
    backgroundColor: "#159447",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  professionalName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginBottom: 4,
  },
  rating: { fontSize: 12, fontWeight: "600", color: "#111" },
  reviews: { fontSize: 11, color: "#888" },
  profession: {
    fontSize: 12,
    color: "#159447",
    textAlign: "center",
    marginBottom: 2,
  },
  cityText: { fontSize: 11, color: "#888", textAlign: "center", marginBottom: 4 },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  verifiedContainer: {
    marginHorizontal: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  shieldContainer: { marginRight: 4 },
  verifiedTextContainer: { flex: 1, minWidth: 140 },
  verifiedTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  verifiedSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  howButton: {
    backgroundColor: "#159447",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  howButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
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
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 14,
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionText: { flex: 1 },
  modalOptionTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  modalOptionSub: { fontSize: 12, color: "#888", marginTop: 2 },
  modalCancel: { paddingVertical: 16, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
  citySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  citySearchInput: { flex: 1, fontSize: 15, color: "#111" },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cityItemText: { flex: 1, fontSize: 15, color: "#111" },
  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    paddingVertical: 30,
    fontSize: 15,
  },
});
