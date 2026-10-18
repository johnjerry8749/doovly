import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ServiceCategory = {
  name: string;
  icon: string;
};

type Props = {
  services: ServiceCategory[];
  selectedCategory: string;
  onSelect: (name: string) => void;
};

/**
 * Horizontal category chips.
 * Same sizes, colors, and gap as original home.tsx.
 */
export function ServiceCategoryScroller({
  services,
  selectedCategory,
  onSelect,
}: Props) {
  return (
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
            onPress={() => onSelect(service.name)}
          >
            <View style={styles.serviceCircle}>
              <MaterialCommunityIcons
                name={service.icon as any}
                size={26}
                color={active ? "#159447" : "#087A38"}
              />
            </View>
            <Text style={[styles.serviceName, active && { color: "#159447" }]}>
              {service.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  servicesContainer: {
    flexDirection: "row",
    gap: 14,
    paddingBottom: 22,
  },
  serviceItem: {
    alignItems: "center",
    width: 72,
  },
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
});
