
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
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
  type Professional,
} from "@/services/professionals";

const GREEN = "#159447";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* =========================================================
   RECENT SERVICE REQUESTS
========================================================= */

const RECENT_REQUESTS = [
  {
    id: "1",
    title: "Leaking pipe in bathroom",
    category: "Plumbing",
    location: "Victoria Island",
    date: "Today, 10:00 AM",
    timeAgo: "2 min ago",
    icon: "pipe",
    iconBackground: "#FFF1D5",
  },
  {
    id: "2",
    title: "Need electrician to fix power",
    category: "Electrical",
    location: "Lekki Phase 1",
    date: "Tomorrow, 2:00 PM",
    timeAgo: "5 min ago",
    icon: "flash",
    iconBackground: "#DDF2FF",
  },
  {
    id: "3",
    title: "Car needs urgent repair",
    category: "Mechanic",
    location: "Ikoyi",
    date: "Today, 4:30 PM",
    timeAgo: "8 min ago",
    icon: "car-wrench",
    iconBackground: "#E9E1FF",
  },
];

/* =========================================================
   SERVICE FILTERS
========================================================= */

const SERVICE_FILTERS = [
  "All",
  "Plumber",
  "Electrician",
  "Barber",
  "Nail Tech",
  "Mechanic",
  "Spa",
];

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function Services() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const professionals = listProfessionals();

  /* =======================================================
     FILTER PROFESSIONALS
  ======================================================= */

  const filteredProfessionals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return professionals.filter((person) => {
      const matchesSearch =
        !query ||
        person.name.toLowerCase().includes(query) ||
        person.profession.toLowerCase().includes(query) ||
        person.city.toLowerCase().includes(query);

      const matchesFilter =
        selectedFilter === "All" ||
        person.profession.toLowerCase() === selectedFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [professionals, search, selectedFilter]);

  /* =======================================================
     PROFESSIONAL CARD
  ======================================================= */

  const renderProfessional = ({
    item,
  }: {
    item: Professional;
  }) => {
    return (
      <TouchableOpacity
        style={styles.professionalCard}
        activeOpacity={0.85}
        onPress={() => router.push(`/professional/${item.id}`)}
      >
        {/* HEART */}
        <TouchableOpacity
          style={styles.heartButton}
          activeOpacity={0.7}
          onPress={(event) => event.stopPropagation()}
        >
          <Ionicons
            name="heart-outline"
            size={18}
            color="#111"
          />
        </TouchableOpacity>

        {/* PROFILE IMAGE */}
        <View style={styles.profileImageWrapper}>
          <Image
            source={item.image}
            style={styles.profileImage}
          />

          {/* VERIFIED BADGE */}
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Image
                source={require("@/assets/premium/checkmark.png")}
                style={styles.checkmark}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        {/* NAME */}
        <Text
          style={styles.professionalName}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {/* RATING */}
        <View style={styles.ratingRow}>
          <Ionicons
            name="star"
            size={12}
            color="#F4C400"
          />

          <Text style={styles.ratingText}>
            {item.reviews.length >= 10
              ? Math.min(
                  5,
                  Math.floor(item.reviews.length / 10)
                ).toFixed(1)
              : "4.8"}
          </Text>

          <Text style={styles.reviewCount}>
            ({item.reviews.length})
          </Text>
        </View>

        {/* PROFESSION */}
        <Text
          style={styles.profession}
          numberOfLines={1}
        >
          {item.profession}
        </Text>

        {/* CITY */}
        <Text
          style={styles.city}
          numberOfLines={1}
        >
          {item.city}
        </Text>

        {/* PRICE */}
        <Text
          style={styles.price}
          numberOfLines={1}
        >
          From {item.priceFrom}
        </Text>
      </TouchableOpacity>
    );
  };

  /* =======================================================
     ANIMATED / MOVABLE REQUEST CARD
  ======================================================= */

  const renderRequest = ({
    item,
  }: {
    item: (typeof RECENT_REQUESTS)[number];
  }) => {
    return (
      <TouchableOpacity
        style={styles.requestCard}
        activeOpacity={0.9}
      >
        {/* REQUEST ICON */}
        <View
          style={[
            styles.requestIcon,
            {
              backgroundColor: item.iconBackground,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={30}
            color="#333"
          />
        </View>

        {/* REQUEST CONTENT */}
        <View style={styles.requestContent}>
          {/* TOP */}
          <View style={styles.requestTopRow}>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>
                NEW
              </Text>
            </View>

            <Text style={styles.timeAgo}>
              {item.timeAgo}
            </Text>
          </View>

          {/* TITLE */}
          <Text
            style={styles.requestTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {/* DETAILS */}
          <Text
            style={styles.requestDetails}
            numberOfLines={1}
          >
            {item.category} • {item.location}
          </Text>

          {/* DATE */}
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color="#666"
            />

            <Text style={styles.requestDate}>
              {item.date}
            </Text>
          </View>
        </View>

        {/* VIEW REQUEST */}
        <TouchableOpacity
          style={styles.viewRequestButton}
          activeOpacity={0.8}
        >
          <Text style={styles.viewRequestText}>
            View
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredProfessionals}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderProfessional}
        ListHeaderComponent={
          <>
            {/* =================================================
                HEADER
            ================================================= */}

            <View style={styles.header}>
              <View>
                <Text style={styles.pageTitle}>
                  Services
                </Text>

                <Text style={styles.pageSubtitle}>
                  Find a trusted professional near you
                </Text>
              </View>

              <TouchableOpacity
                style={styles.notificationButton}
              >
                <Ionicons
                  name="notifications-outline"
                  size={25}
                  color="#111"
                />

                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>

            {/* =================================================
                SEARCH
            ================================================= */}

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={21}
                color="#777"
              />

              <TextInput
                style={styles.searchInput}
                placeholder="Search for a service..."
                placeholderTextColor="#888"
                value={search}
                onChangeText={setSearch}
              />

              <TouchableOpacity>
                <Ionicons
                  name="options-outline"
                  size={23}
                  color={GREEN}
                />
              </TouchableOpacity>
            </View>

            {/* =================================================
                FILTERS
            ================================================= */}

            <FlatList
              horizontal
              data={SERVICE_FILTERS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.filterContainer
              }
              renderItem={({ item: filter }) => {
                const active =
                  selectedFilter === filter;

                return (
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      active && styles.activeFilter,
                    ]}
                    onPress={() =>
                      setSelectedFilter(filter)
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active &&
                          styles.activeFilterText,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* =================================================
                RECENT REQUESTS
            ================================================= */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Recent service requests
              </Text>

              <TouchableOpacity>
                <Text style={styles.seeAll}>
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {/* MOVABLE / SWIPEABLE REQUEST CAROUSEL */}

            <FlatList
              horizontal
              data={RECENT_REQUESTS}
              keyExtractor={(item) => item.id}
              renderItem={renderRequest}
              showsHorizontalScrollIndicator={false}
              snapToInterval={SCREEN_WIDTH * 0.78}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={
                styles.requestList
              }
            />

            {/* =================================================
                PROFESSIONAL HEADER
            ================================================= */}

            <View
              style={[
                styles.sectionHeader,
                styles.professionalHeader,
              ]}
            >
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
              Try another service or search term.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ height: 30 }} />
        }
      />
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 16,
  },

  pageTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111",
  },

  pageSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#777",
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    right: 7,
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  /* =======================================================
     SEARCH
  ======================================================= */

  searchContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 13,
    backgroundColor: "#fff",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginHorizontal: 9,
  },

  /* =======================================================
     FILTERS
  ======================================================= */

  filterContainer: {
    paddingBottom: 16,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
  },

  activeFilter: {
    backgroundColor: GREEN,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },

  activeFilterText: {
    color: "#fff",
  },

  /* =======================================================
     SECTION HEADERS
  ======================================================= */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },

  professionalHeader: {
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  seeAll: {
    color: GREEN,
    fontWeight: "700",
    fontSize: 13,
  },

  resultCount: {
    color: "#888",
    fontSize: 12,
  },

  /* =======================================================
     REQUEST CAROUSEL
  ======================================================= */

  requestList: {
    paddingRight: 10,
  },

  requestCard: {
    width: SCREEN_WIDTH * 0.78,
    minHeight: 105,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    padding: 11,
    marginRight: 11,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  requestIcon: {
    width: 58,
    height: 58,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  requestContent: {
    flex: 1,
    minWidth: 0,
  },

  requestTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  newBadge: {
    backgroundColor: "#F39C12",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  timeAgo: {
    fontSize: 10,
    color: "#888",
  },

  requestTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginTop: 4,
  },

  requestDetails: {
    fontSize: 11,
    color: "#666",
    marginTop: 3,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  requestDate: {
    marginLeft: 4,
    fontSize: 10,
    color: "#555",
  },

  viewRequestButton: {
    borderWidth: 1.3,
    borderColor: GREEN,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginLeft: 7,
  },

  viewRequestText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "700",
  },

  /* =======================================================
     PROFESSIONAL GRID - 3 PER ROW
  ======================================================= */

  columnWrapper: {
    justifyContent: "space-between",
  },

  professionalCard: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 15,
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  heartButton: {
    position: "absolute",
    right: 7,
    top: 7,
    zIndex: 5,
    width: 25,
    height: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  profileImageWrapper: {
    width: 75,
    height: 75,
    borderRadius: 38,
    alignSelf: "center",
    marginTop: 7,
    marginBottom: 8,
    position: "relative",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 38,
  },

  verifiedBadge: {
    position: "absolute",
    right: -5,
    bottom: -2,
    width: 27,
    height: 27,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  checkmark: {
    width: 29,
    height: 29,
  },

  professionalName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
    marginBottom: 3,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
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
    marginBottom: 3,
  },

  city: {
    fontSize: 10,
    color: "#777",
    marginBottom: 5,
  },

  price: {
    fontSize: 11,
    fontWeight: "800",
    color: GREEN,
  },

  /* =======================================================
     EMPTY STATE
  ======================================================= */

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
  },
});

