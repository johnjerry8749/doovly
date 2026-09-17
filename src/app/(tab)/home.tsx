import React, { useMemo } from "react";
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

import {
  listProfessionals,
  listServiceCategories,
  starsFromReviewCount,
} from "@/services/professionals";

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

  const services = listServiceCategories();
  const professionals = listProfessionals();

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return [...NIGERIA_CITIES];
    return NIGERIA_CITIES.filter((city) => city.toLowerCase().includes(query));
  }, [citySearch]);

  const nearbyProfessionals = useMemo(() => {
    if (showAllNigeria || locationName === "All Nigeria") return professionals;
    if (
      !locationName ||
      locationName === "Location unavailable" ||
      locationName.toLowerCase().includes("click here") ||
      locationName.toLowerCase().includes("getting")
    ) {
      return professionals;
    }
    const city = locationName.split(",")[0].trim().toLowerCase();
    if (!city || city === "nigeria" || city === "all nigeria")
      return professionals;
    return professionals.filter((professional) => {
      const professionalCity = professional.city.toLowerCase();
      return professionalCity.includes(city) || city.includes(professionalCity);
    });
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

          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
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
  bannerContainer: { borderRadius: 16, overflow: "hidden", marginBottom: 22 },
  banner: { width: "100%", height: 130 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  seeAll: { color: "#159447", fontWeight: "700", fontSize: 13 },
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
  serviceName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  professionalsContainer: { flexDirection: "row", gap: 8, paddingBottom: 25 },
  professionalCard: {
    width: 115,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
  },
  heartButton: { position: "absolute", right: 8, top: 8, zIndex: 5 },
  profileImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    marginBottom: 8,
    position: "relative",
  },
  profileImage: { width: "100%", height: "100%", borderRadius: 35 },
  verifiedBadge: {
    position: "absolute",
    right: -3,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  professionalName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  rating: { fontSize: 11, fontWeight: "600", marginLeft: 3, color: "#333" },
  reviews: { fontSize: 10, color: "#777", marginLeft: 2 },
  profession: { fontSize: 11, color: "#555", marginBottom: 2 },
  cityText: { fontSize: 10, color: "#777", marginBottom: 5 },
  price: { fontSize: 12, fontWeight: "800", color: "#159447" },
  emptyProsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  emptyProsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyProsSubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyProsButton: {
    backgroundColor: "#159447",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyProsButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
    backgroundColor: "#F0F9F4",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  shieldContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },

  verifiedTextContainer: {
    flex: 2,
    minWidth: 0,
    marginRight: 8,
  },

  verifiedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
  },

  verifiedSubtitle: {
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },

  howButton: {
    backgroundColor: "#159447",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // flexShrink: 1,
    maxWidth: 105,
  },

  howButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    // flexShrink: 1,
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
    borderBottomColor: "#f0f0f0",
  },
  cityItemText: { flex: 1, fontSize: 16, color: "#111", marginLeft: 12 },
  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    paddingVertical: 30,
    fontSize: 15,
  },
});
