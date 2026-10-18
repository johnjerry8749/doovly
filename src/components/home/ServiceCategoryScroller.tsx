import React from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const GREEN = "#159447";

type ServiceCategory = {
  name: string;
  icon: string;
};

type Props = {
  services: ServiceCategory[];
  selectedCategory: string;
  onSelect: (name: string) => void;
  /**
   * home  — original Home look (icon tint changes on active)
   * services — Services look (filled green circle + white icon on active)
   */
  variant?: "home" | "services";
};

/**
 * Horizontal category chips with icons.
 * Used by Home and Services (variant controls active styles).
 */
export function ServiceCategoryScroller({
  services,
  selectedCategory,
  onSelect,
  variant = "home",
}: Props) {
  const isServices = variant === "services";

  const renderItem = (service: ServiceCategory, index: number) => {
    const active = selectedCategory === service.name;

    if (isServices) {
      return (
        <TouchableOpacity
          key={`${service.name}-${index}`}
          style={styles.servicesItem}
          onPress={() => onSelect(service.name)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.servicesCircle,
              active && styles.servicesCircleActive,
            ]}
          >
            <MaterialCommunityIcons
              name={service.icon as any}
              size={22}
              color={active ? "#fff" : GREEN}
            />
          </View>
          <Text
            style={[styles.servicesName, active && styles.servicesNameActive]}
            numberOfLines={1}
          >
            {service.name}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={`${service.name}-${index}`}
        style={styles.homeItem}
        activeOpacity={0.7}
        onPress={() => onSelect(service.name)}
      >
        <View style={styles.homeCircle}>
          <MaterialCommunityIcons
            name={service.icon as any}
            size={26}
            color={active ? "#159447" : "#087A38"}
          />
        </View>
        <Text style={[styles.homeName, active && { color: "#159447" }]}>
          {service.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isServices) {
    return (
      <FlatList
        horizontal
        data={services}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.servicesContainer}
        renderItem={({ item, index }) => renderItem(item, index)}
      />
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.homeContainer}
    >
      {services.map((service, index) => renderItem(service, index))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Home variant (exact original)
  homeContainer: {
    flexDirection: "row",
    gap: 14,
    paddingBottom: 22,
  },
  homeItem: {
    alignItems: "center",
    width: 72,
  },
  homeCircle: {
    width: 50,
    height: 50,
    borderRadius: 31,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },
  homeName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  // Services variant (exact original services.tsx)
  servicesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  servicesItem: {
    alignItems: "center",
    marginRight: 14,
    width: 72,
  },
  servicesCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  servicesCircleActive: {
    backgroundColor: GREEN,
  },
  servicesName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  servicesNameActive: {
    color: GREEN,
  },
});
