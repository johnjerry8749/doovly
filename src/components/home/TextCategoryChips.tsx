import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

const GREEN = "#159447";

type Props = {
  categories: string[];
  selected: string;
  onSelect: (name: string) => void;
};

/**
 * Text-only horizontal category chips (Requests screen).
 * Exact styles from original requests.tsx.
 */
export function TextCategoryChips({
  categories,
  selected,
  onSelect,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersScroll}
      contentContainerStyle={styles.filtersRow}
      keyboardShouldPersistTaps="handled"
    >
      {categories.map((category) => {
        const active = selected === category;
        return (
          <TouchableOpacity
            key={category}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onSelect(category)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filtersScroll: { maxHeight: 44, marginBottom: 6 },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: "center",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
});
