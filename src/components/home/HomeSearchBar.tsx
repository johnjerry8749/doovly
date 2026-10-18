import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Search input bar.
 * Exact same dimensions, colors, and padding as original.
 */
export function HomeSearchBar({ value, onChangeText }: Props) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search-outline" size={18} color="#9CA3AF" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search professionals..."
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 45,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#111",
  },
});
