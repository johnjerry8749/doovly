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
import {
  isSaved,
  toggleSave,
  isOwnProfessionalProfile,
} from "@/services/savedProviders";

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

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [favTick, setFavTick] = useState(0);

  const onToggleFavorite = useCallback((proId: string) => {
    // Cannot favorite own profile
    if (isOwnProfessionalProfile(proId)) return;

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
          <TouchableOpacity
            style={styles.serviceItem}
            activeOpacity={0.7}
            onPress={() => setSelectedCategory("All")}
          >
            <View style={styles.serviceCircle}>
              <MaterialCommunityIcons
                name="apps"
                size={31}
                color={selectedCategory === "All" ? "#159447" : "#087A38"}
              />
            </View>
            <Text
              style={[
                styles.serviceName,
                selectedCategory === "All" && { color: "#159447" },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

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
            {nearbyProfessionals.map((person) => {
              const isOwn = isOwnProfessionalProfile(person.id);
              const liked = isOwn || isSaved(person.id);

              return (
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
                    activeOpacity={isOwn ? 1 : 0.7}
                    disabled={isOwn}
                    onPress={() => onToggleFavorite(person.id)}
                  >
                    <Ionicons
                      name={liked ? "heart" : "heart-outline"}
                      size={17}
                      color={liked ? "#EF4444" : "#111"}
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
              );
            })}
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
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: "#111",
  },
  bannerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
  },
  banner: {
    width: "100%",
    height: 140,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#159447",
  },
  servicesContainer: {
    paddingBottom: 8,
    marginBottom: 20,
  },
  serviceItem: {
    alignItems: "center",
    marginRight: 18,
  },
  serviceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  professionalsContainer: {
    paddingBottom: 10,
    marginBottom: 20,
  },
  professionalCard: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: 30,
  },
  professionalName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  rating: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 3,
    color: "#111",
  },
  reviews: {
    fontSize: 11,
    color: "#888",
    marginLeft: 2,
  },
  profession: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    marginTop: 2,
  },
  cityText: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
    marginTop: 1,
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#159447",
    textAlign: "center",
    marginTop: 6,
  },
  emptyProsContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyProsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginTop: 12,
  },
  emptyProsSubtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
  emptyProsButton: {
    marginTop: 16,
    backgroundColor: "#159447",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyProsButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  shieldContainer: {
    marginRight: 12,
  },
  verifiedTextContainer: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  verifiedSubtitle: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  howButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#159447",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  howButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginRight: 4,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  modalOptionText: {
    marginLeft: 14,
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  modalOptionSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  modalCancel: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  cityPickerSheet: {
    maxHeight: "80%",
  },
  citySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  citySearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#111",
  },
  cityList: {
    maxHeight: 300,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cityItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#111",
  },
  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
});
