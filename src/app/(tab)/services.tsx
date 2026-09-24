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
  type Professional,
} from "@/services/professionals";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { isSaved, toggleSave } from "@/services/savedProviders";
import { NIGERIA_CITIES } from "@/data/cities";
import { useLocation } from "@/context/LocationContext";

const GREEN = "#159447";

export default function Services() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [favTick, setFavTick] = useState(0);

  const categories = useMemo(() => listServiceCategories(), []);

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

  const professionals = listProfessionals();

  const onToggleFavorite = useCallback((proId: string) => {
    const result = toggleSave(proId);

    if (!result.ok && result.reason === "limit") {
      Alert.alert(
        "Save limit reached",
        "Free users can save up to 5 providers. Upgrade to Pro for unlimited saves.",
        [
          {
            text: "Not now",
            style: "cancel",
          },
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

    if (!query) {
      return [...NIGERIA_CITIES];
    }

    return NIGERIA_CITIES.filter((city) =>
      city.toLowerCase().includes(query),
    );
  }, [citySearch]);

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

      if (!city || city === "nigeria") {
        return true;
      }

      const professionalCity = itemCity.toLowerCase();

      return (
        professionalCity.includes(city) ||
        city.includes(professionalCity)
      );
    },
    [locationName, showAllNigeria],
  );

  const matchesCategory = useCallback(
    (profession: string, filter: string) => {
      if (filter === "All") {
        return true;
      }

      const category = filter.toLowerCase();
      const professional = profession.toLowerCase();

      if (
        professional === category ||
        professional.includes(category)
      ) {
        return true;
      }

      if (
        category === "spa" &&
        (professional.includes("massage") ||
          professional.includes("spa"))
      ) {
        return true;
      }

      if (
        category === "nail tech" &&
        professional.includes("nail")
      ) {
        return true;
      }

      return false;
    },
    [],
  );

  const filteredProfessionals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return professionals.filter((person) => {
      const matchesSearch =
        !query ||
        person.name.toLowerCase().includes(query) ||
        person.profession.toLowerCase().includes(query) ||
        person.city.toLowerCase().includes(query);

      const matchesFilter = matchesCategory(
        person.profession,
        selectedFilter,
      );

      const matchesLocation = matchesLocationCity(person.city);

      return (
        matchesSearch &&
        matchesFilter &&
        matchesLocation
      );
    });
  }, [
    professionals,
    search,
    selectedFilter,
    matchesCategory,
    matchesLocationCity,
  ]);

  const renderProfessional = ({
    item,
  }: {
    item: Professional;
  }) => {
    const saved = isSaved(item.id);

    const rating =
      item.reviews.length >= 10
        ? Math.min(
            5,
            Math.floor(item.reviews.length / 10),
          ).toFixed(1)
        : "4.8";

    return (
      <TouchableOpacity
        style={styles.professionalCard}
        activeOpacity={0.85}
        onPress={() =>
          router.push(`/professional/${item.id}`)
        }
      >
        {/* Favorite */}
        <TouchableOpacity
          style={styles.heartButton}
          activeOpacity={0.7}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite(item.id);
          }}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={17}
            color={saved ? "#EF4444" : "#111"}
          />
        </TouchableOpacity>

        {/* Profile image + verification */}
        <View style={styles.profileImageContainer}>
          <Image
            source={item.image}
            style={styles.profileImage}
            resizeMode="cover"
          />

          {item.verified ? (
            <View style={styles.verifiedBadge}>
              <Image
                source={require("@/assets/premium/checkmark.png")}
                style={styles.verifiedBadgeImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>

        {/* Name */}
        <Text
          style={styles.professionalName}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Ionicons
            name="star"
            size={12}
            color="#F4C400"
          />

          <Text style={styles.ratingText}>
            {rating}
          </Text>

          <Text style={styles.reviewCount}>
            ({item.reviews.length})
          </Text>
        </View>

        {/* Profession */}
        <Text
          style={styles.profession}
          numberOfLines={1}
        >
          {item.profession}
        </Text>

        {/* City */}
        <Text
          style={styles.city}
          numberOfLines={1}
        >
          {item.city}
        </Text>

        {/* Price */}
        <Text
          style={styles.price}
          numberOfLines={1}
        >
          From {item.priceFrom}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      {/* HEADER */}
      <View style={styles.stickyHeader}>
        {/* Location + notification */}
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() =>
              setShowLocationModal(true)
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="location"
              size={22}
              color={GREEN}
            />

            {loadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator
                  size="small"
                  color={GREEN}
                />

                <Text
                  style={styles.locationLoadingText}
                >
                  Getting location...
                </Text>
              </View>
            ) : (
              <Text
                style={styles.locationText}
                numberOfLines={1}
              >
                {locationName}
              </Text>
            )}

            <Ionicons
              name="chevron-down"
              size={16}
              color="#111"
            />
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
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#111"
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#777"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search for a service..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />

          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons
              name="options-outline"
              size={22}
              color={GREEN}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* PROFESSIONALS */}
      <FlatList
        data={filteredProfessionals}
        extraData={`${favTick}-${selectedFilter}`}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderProfessional}
        ListHeaderComponent={
          <>
            {/* CATEGORY FILTERS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.filterContainer
              }
            >
              {categories.map((filter, index) => {
                const active =
                  selectedFilter === filter.name;

                return (
                  <TouchableOpacity
                    key={`${filter.name}-${index}`}
                    style={styles.filterItem}
                    onPress={() =>
                      setSelectedFilter(filter.name)
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.filterCircle,
                        active &&
                          styles.activeFilterCircle,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={filter.icon as any}
                        size={26}
                        color={
                          active
                            ? "#fff"
                            : "#087A38"
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.filterName,
                        active &&
                          styles.activeFilterName,
                      ]}
                      numberOfLines={1}
                    >
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* SECTION HEADER */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                All professionals
              </Text>

              <Text style={styles.resultCount}>
                {filteredProfessionals.length} found
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={42}
              color="#aaa"
            />

            <Text style={styles.emptyTitle}>
              No professionals found
            </Text>

            <Text style={styles.emptyText}>
              Try another service, location or
              search term.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ height: 30 }} />
        }
      />

      {/* LOCATION MODAL */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowLocationModal(false)
        }
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() =>
            setShowLocationModal(false)
          }
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              Choose location
            </Text>

            {/* Current location */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={getUserLocation}
              activeOpacity={0.7}
            >
              <Ionicons
                name="navigate"
                size={24}
                color={GREEN}
              />

              <View style={styles.modalOptionText}>
                <Text
                  style={styles.modalOptionTitle}
                >
                  Use current location
                </Text>

                <Text
                  style={styles.modalOptionSub}
                >
                  Allow access to detect your
                  position
                </Text>
              </View>
            </TouchableOpacity>

            {/* Select city */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowLocationModal(false);
                setShowCityPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="list-outline"
                size={24}
                color={GREEN}
              />

              <View style={styles.modalOptionText}>
                <Text
                  style={styles.modalOptionTitle}
                >
                  Select a city
                </Text>

                <Text
                  style={styles.modalOptionSub}
                >
                  Pick from popular cities in Nigeria
                </Text>
              </View>
            </TouchableOpacity>

            {/* All Nigeria */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={viewAllInNigeria}
              activeOpacity={0.7}
            >
              <Ionicons
                name="globe-outline"
                size={24}
                color={GREEN}
              />

              <View style={styles.modalOptionText}>
                <Text
                  style={styles.modalOptionTitle}
                >
                  View all in Nigeria
                </Text>

                <Text
                  style={styles.modalOptionSub}
                >
                  See professionals from every city
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() =>
                setShowLocationModal(false)
              }
            >
              <Text style={styles.modalCancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* CITY PICKER */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={closeCityPicker}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              styles.cityPickerSheet,
            ]}
          >
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              Select a city
            </Text>

            {/* City search */}
            <View style={styles.citySearchBox}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#888"
              />

              <TextInput
                style={styles.citySearchInput}
                placeholder="Filter cities..."
                placeholderTextColor="#888"
                value={citySearch}
                onChangeText={setCitySearch}
                autoCorrect={false}
              />

              {citySearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setCitySearch("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Cities */}
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.cityList}
              ListEmptyComponent={
                <Text
                  style={styles.emptyCitiesText}
                >
                  No city found. Try another spelling.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cityItem}
                  onPress={() => selectCity(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={GREEN}
                  />

                  <Text
                    style={styles.cityItemText}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Cancel */}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={closeCityPicker}
            >
              <Text style={styles.modalCancelText}>
                Cancel
              </Text>
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
    backgroundColor: "#fff",
  },

  /* HEADER */
  stickyHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    zIndex: 10,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    marginBottom: 12,
  },

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  locationText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginLeft: 6,
    marginRight: 4,
  },

  locationLoading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },

  locationLoadingText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 6,
  },

  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  searchContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginHorizontal: 8,
  },

  /* LIST */
  container: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    paddingTop: 12,
  },

  columnWrapper: {
    gap: 8,
    marginBottom: 12,
  },

  /* CATEGORY FILTERS */
  filterContainer: {
    flexDirection: "row",
    paddingBottom: 22,
    paddingRight: 8,
    alignItems: "center",
    gap: 14,
  },

  filterItem: {
    alignItems: "center",
    width: 72,
  },

  filterCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
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
    fontWeight: "700",
  },

  /* SECTION */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },

  resultCount: {
    color: "#888",
    fontSize: 12,
  },

  /* PROFESSIONAL CARD */
  professionalCard: {
    flex: 1,
    maxWidth: "32%",
    minHeight: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    position: "relative",
  },

  heartButton: {
    position: "absolute",
    right: 6,
    top: 6,
    zIndex: 20,
  },

  profileImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    marginBottom: 8,
    position: "relative",
    overflow: "visible",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    backgroundColor: "#E5E7EB",
  },

  /* VERIFIED BADGE */
  verifiedBadge: {
    position: "absolute",
    right: 3,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 4,
  },

  verifiedBadgeImage: {
    width: 30,
    height: 30,
  },

  professionalName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
    textAlign: "center",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },

  ratingText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
    color: "#333",
  },

  reviewCount: {
    fontSize: 9,
    color: "#777",
    marginLeft: 2,
  },

  profession: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
    textAlign: "center",
  },

  city: {
    fontSize: 10,
    color: "#777",
    marginBottom: 5,
    textAlign: "center",
  },

  price: {
    fontSize: 11,
    fontWeight: "800",
    color: GREEN,
    textAlign: "center",
  },

  /* EMPTY */
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
    color: "#111",
  },

  emptyText: {
    color: "#888",
    marginTop: 5,
    fontSize: 13,
    textAlign: "center",
  },

  /* MODALS */
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

  /* CITY SEARCH */
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
    marginTop: 30,
    fontSize: 14,
  },
});