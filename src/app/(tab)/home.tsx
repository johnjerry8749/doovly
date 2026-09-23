import React, { useMemo, useState, useCallback } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listProfessionals,
  listServiceCategories,
  starsFromReviewCount,
} from "@/services/professionals";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { isSaved, toggleSave } from "@/services/savedProviders";

import { NIGERIA_CITIES } from "@/data/cities";
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

  // Single source — already includes All
  const services = listServiceCategories();
  const professionals = listProfessionals();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [favTick, setFavTick] = useState(0);

  const onToggleFavorite = useCallback((proId: string) => {
    const result = toggleSave(proId);
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
    if (result.ok) setFavTick((t) => t + 1);
  }, []);

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return [...NIGERIA_CITIES];
    return NIGERIA_CITIES.filter((city) => city.toLowerCase().includes(query));
  }, [citySearch]);

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
          return (
            professionalCity.includes(city) || city.includes(professionalCity)
          );
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

    return list;
  }, [locationName, showAllNigeria, professionals, selectedCategory]);

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
                    size={31}
                    color={active ? "#159447" : "#087A38"}
                  />
                </View>
                <Text
                  style={[styles.serviceName, active && { color: "#159447" }]}
                >
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
          <TouchableOpacity
            onPress={() => router.push("/(tab)/services")}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {nearbyProfessionals.length === 0 ? (
          <View style={styles.emptyProsContainer}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyProsTitle}>
              No Avaliable professionals near you
            </Text>
            <Text style={styles.emptyProsSubtitle}>
              Try another location or view all in Nigeria.
            </Text>
            <TouchableOpacity
              style={styles.emptyProsButton}
              onPress={viewAllInNigeria}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyProsButtonText}>
                View all in Nigeria
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.professionalsContainer}
          >
            {nearbyProfessionals.map((person) => (
              <TouchableOpacity
                key={`${person.id}-${favTick}`}
                style={styles.professionalCard}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/professional/[id]",
                    params: {
                      id: person.id,
                      from: "home",
                    },
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
        )}

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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 16, paddingBottom: 0 },
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
  locationLoadingText: { fontSize: 15, color: "#555", marginLeft: 7 },
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
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 18,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: "#111" },
  bannerContainer: {
    width: "100%",
    height: 150,
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
  servicesContainer: { paddingBottom: 8, gap: 16, paddingRight: 8 },
  serviceItem: { alignItems: "center", width: 78 },
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
  professionalsContainer: { gap: 12, paddingRight: 8, paddingBottom: 8 },
  professionalCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginRight: 4,
  },
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    position: "relative",
    overflow: "visible",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -6,
    right: -4,
  },
  professionalName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rating: { fontSize: 11, fontWeight: "600", marginLeft: 3, color: "#333" },
  reviews: { fontSize: 10, color: "#777", marginLeft: 2 },
  profession: { fontSize: 11, color: "#555", marginBottom: 3 },
  cityText: { fontSize: 11, color: "#777", marginBottom: 6 },
  price: { fontSize: 12, fontWeight: "700", color: "#159447" },
  emptyProsContainer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyProsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
    textAlign: "center",
  },
  emptyProsSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 6,
    textAlign: "center",
  },
  emptyProsButton: {
    marginTop: 16,
    backgroundColor: "#159447",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyProsButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  verifiedContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  shieldContainer: { marginBottom: 10 },
  verifiedTextContainer: { marginBottom: 12 },
  verifiedTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  verifiedSubtitle: { fontSize: 13, color: "#555", marginTop: 4 },
  howButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#159447",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  howButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  bottomSpacing: { height: 24 },
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
  cityPickerSheet: { maxHeight: "80%" },
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
  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    marginTop: 30,
    fontSize: 14,
  },
});
