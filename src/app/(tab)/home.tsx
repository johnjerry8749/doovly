import React, { useMemo, useState, useCallback, useEffect } from "react";
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

  const [services, setServices] = useState<
    { name: string; icon: string }[]
  >([{ name: "All", icon: "apps" }]);
  const [professionals, setProfessionals] = useState<
    Awaited<ReturnType<typeof listProfessionals>>
  >([]);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [favTick, setFavTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [cats, pros] = await Promise.all([
          listServiceCategories(),
          listProfessionals(),
        ]);
        if (cancelled) return;
        setServices(cats);
        setProfessionals(pros);
      } catch (e) {
        console.error("Home load error:", e);
        if (!cancelled) {
          setServices([{ name: "All", icon: "apps" }]);
          setProfessionals([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
            onPress: () =>
              router.push("/profile/subscription/subscription"),
          },
        ],
      );
      return;
    }

    if (result.ok) {
      setFavTick((t) => t + 1);
    }
  }, []);

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return [...NIGERIA_CITIES];
    return NIGERIA_CITIES.filter((city) =>
      city.toLowerCase().includes(query),
    );
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
          const professionalCity = (professional.city || "").toLowerCase();
          return (
            professionalCity.includes(city) ||
            city.includes(professionalCity)
          );
        });
      }
    }

    if (selectedCategory && selectedCategory !== "All") {
      const cat = selectedCategory.toLowerCase();
      list = list.filter((p) => {
        const prof = (p.profession || "").toLowerCase();
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
                params: { id: String(getCurrentUserId()) },
              })
            }
          >
            <Ionicons name="notifications-outline" size={28} color="#111" />
            <View style={styles.notificationDot} />
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
                    size={26}
                    color={active ? "#159447" : "#087A38"}
                  />
                </View>
                <Text
                  style={[
                    styles.serviceName,
                    active && { color: "#159447" },
                  ]}
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
                    size={14}
                    color={isSaved(person.id) ? "#EF4444" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <View style={styles.profileImageContainer}>
                  <Image
                    source={
                      typeof person.image === "string"
                        ? { uri: person.image }
                        : (person.image as any)
                    }
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.nameContainer}>
                  <Text style={styles.professionalName} numberOfLines={1}>
                    {person.name}
                  </Text>
                </View>

                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.rating}>
                    {starsFromReviewCount(
                      person.reviews?.length ?? person.reviewCount ?? 0,
                    )}
                  </Text>
                  <Text style={styles.reviews}>
                    ({person.reviews?.length ?? person.reviewCount ?? 0})
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
                <Text style={styles.modalOptionTitle}>
                  View all in Nigeria
                </Text>
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
                  No cities match your search
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cityRow}
                  onPress={() => selectCity(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#159447"
                  />
                  <Text style={styles.cityRowText}>{item}</Text>
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
  safeArea: {
    flex: 1,
    marginBottom: 35,
    backgroundColor: "#fff",
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginHorizontal: 6,
    flexShrink: 1,
  },
  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6,
  },
  locationLoadingText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
  },
  notificationButton: {
    position: "relative",
    padding: 4,
  },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  bannerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
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
    fontSize: 17,
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
    marginRight: 16,
    width: 72,
  },
  serviceCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  professionalsContainer: {
    paddingBottom: 8,
    marginBottom: 20,
  },
  professionalCard: {
    width: 110,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  heartButton: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 6,
    marginTop: 10,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
  },
  nameContainer: {
    alignItems: "center",
    marginBottom: 2,
  },
  professionalName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  rating: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111",
    marginLeft: 2,
  },
  reviews: {
    fontSize: 10,
    color: "#777",
    marginLeft: 2,
  },
  profession: {
    fontSize: 11,
    color: "#555",
    textAlign: "center",
    marginBottom: 2,
  },
  cityText: {
    fontSize: 10,
    color: "#777",
    textAlign: "center",
    marginBottom: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: "800",
    color: "#159447",
    textAlign: "center",
  },
  emptyProsContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyProsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyProsButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  verifiedContainer: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  shieldContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  verifiedTextContainer: {
    alignItems: "center",
    marginBottom: 14,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  verifiedSubtitle: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
    textAlign: "center",
  },
  howButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#159447",
    borderRadius: 12,
    paddingVertical: 12,
  },
  howButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginRight: 6,
  },
  bottomSpacing: {
    height: 24,
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
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
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
    marginBottom: 16,
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionText: {
    marginLeft: 14,
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  modalOptionSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  modalCancel: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
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
    maxHeight: 320,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cityRowText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#111",
  },
  emptyCitiesText: {
    textAlign: "center",
    color: "#888",
    marginTop: 30,
    fontSize: 14,
  },
});
