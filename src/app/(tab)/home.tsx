import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function Home() {
  const services = [
    {
      name: "Plumber",
      icon: "water-pump",
    },
    {
      name: "Electrician",
      icon: "flash",
    },
    {
      name: "Barber",
      icon: "content-cut",
    },
    {
      name: "Nail Tech",
      icon: "nail",
    },
    {
      name: "Mechanic",
      icon: "car-wrench",
    },
    {
      name: "Spa",
      icon: "spa",
    },
  ];

  const professionals = [
    {
      name: "John Chukwuemeka",
      profession: "Plumber",
      rating: "4.8",
      reviews: "126",
      price: "₦8,000",
      image: require("@/assets/profile_1.jpg"),
    },
    {
      name: "Chioma Eze",
      profession: "Nail Tech",
      rating: "4.8",
      reviews: "98",
      price: "₦6,000",
      image: require("@/assets/profile_2.jpg"),
    },
    {
      name: "Ikechukwu Obi",
      profession: "Mechanic",
      rating: "4.8",
      reviews: "74",
      price: "₦10,000",
      image: require("@/assets/profile_3.jpg"),
    },
     {
      name: "Blessing Joy",
      profession: "Body Massage Therpist",
      rating: "4.8",
      reviews: "126",
      price: "₦18,000",
      image: require("@/assets/profile_4.jpg"),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={28} color="#159447" />

            <Text style={styles.locationText}>
              Lagos, Nigeria
            </Text>

            <Ionicons
              name="chevron-down"
              size={18}
              color="#111"
            />
          </View>

          <TouchableOpacity>
            <Ionicons
              name="notifications-outline"
              size={28}
              color="#111"
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={27}
            color="#555"
          />

          <TextInput
            placeholder="Search for a service..."
            placeholderTextColor="#888"
            style={styles.searchInput}
          />

          <TouchableOpacity>
            <Ionicons
              name="options-outline"
              size={28}
              color="#159447"
            />
          </TouchableOpacity>
        </View>

        {/* HERO BANNER */}
        <View style={styles.bannerContainer}>
          <Image
            source={require("@/assets/images/home_banner.png")}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>

        {/* SERVICES TITLE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            What do you need help with?
          </Text>

          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* SERVICES */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesContainer}
        >
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.serviceItem}
            >
              <View style={styles.serviceCircle}>
                <MaterialCommunityIcons
                  name={service.icon as any}
                  size={31}
                  color="#087A38"
                />
              </View>

              <Text style={styles.serviceName}>
                {service.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* POPULAR */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Popular near you
          </Text>

          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* PROFESSIONALS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.professionalsContainer}
        >
          {professionals.map((person, index) => (
            <TouchableOpacity
              key={index}
              style={styles.professionalCard}
              activeOpacity={0.8}
            >
              {/* HEART */}
              <TouchableOpacity style={styles.heartButton}>
                <Ionicons
                  name="heart-outline"
                  size={25}
                  color="#111"
                />
              </TouchableOpacity>

              {/* IMAGE */}
              <View style={styles.profileImageContainer}>
                <Image
                  source={person.image}
                  style={styles.profileImage}
                />

                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color="#fff"
                  />
                </View>
              </View>

              <Text
                style={styles.professionalName}
                numberOfLines={1}
              >
                {person.name}
              </Text>

              {/* RATING */}
              <View style={styles.ratingContainer}>
                <Ionicons
                  name="star"
                  size={16}
                  color="#F4C400"
                />

                <Text style={styles.rating}>
                  {person.rating}
                </Text>

                <Text style={styles.reviews}>
                  ({person.reviews})
                </Text>
              </View>

              <Text style={styles.profession}>
                {person.profession}
              </Text>

              <Text style={styles.price}>
                From {person.price}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* VERIFIED BANNER */}
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

          <TouchableOpacity style={styles.howButton}>
            <Text style={styles.howButtonText}>
              How it works
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* BOTTOM SPACE */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  },

  locationText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    marginLeft: 8,
    marginRight: 5,
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
    height: 175,
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
    gap: 17,
    paddingBottom: 27,
  },

  serviceItem: {
    width: 78,
    alignItems: "center",
  },

  serviceCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    gap: 12,
    paddingBottom: 25,
  },

  professionalCard: {
    width: 183,
    minHeight: 255,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 17,
    padding: 10,
    backgroundColor: "#fff",
  },

  heartButton: {
    position: "absolute",
    right: 9,
    top: 9,
    zIndex: 2,
    backgroundColor: "#fff",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  profileImageContainer: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: "#eee",
    alignSelf: "center",
    marginTop: 5,
    marginBottom: 9,
    position: "relative",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 58,
  },

  verifiedBadge: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#159447",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  professionalName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  rating: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },

  reviews: {
    fontSize: 13,
    color: "#666",
    marginLeft: 3,
  },

  profession: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },

  price: {
    fontSize: 15,
    color: "#159447",
    fontWeight: "700",
  },

  // VERIFIED BANNER
  verifiedContainer: {
    minHeight: 78,
    borderRadius: 17,
    backgroundColor: "#F0FAF0",
    borderWidth: 1,
    borderColor: "#DDEDDD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  shieldContainer: {
    marginRight: 8,
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
});