import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
const GREEN = "#16A34A";

const SLIDES = [
  {
    id: "1",
    title: "Find Trusted Pros",
    description:
      "Discover verified professionals near you for any service you need.",
    image: require("@/assets/onboarding/onboarding_1.jpg"),
  },
  {
    id: "2",
    title: "Book in Seconds",
    description:
      "Choose a service, pick a time, and book instantly. Simple and stress-free.",
    image: require("@/assets/onboarding/onboarding_2.jpg"),
  },
  {
    id: "3",
    title: "Chat & Get It Done",
    description:
      "Message your pro, share location, and manage the job until it’s complete.",
    image: require("@/assets/onboarding/onboarding_3.jpg"),
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      router.replace("/(auth)/login");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {index === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>

        {index < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  slide: {
    width,
    paddingHorizontal: 24,
    alignItems: "center",
    paddingTop: 24,
  },
  image: {
    width: width - 48,
    height: 280,
    borderRadius: 20,
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  dotActive: {
    backgroundColor: GREEN,
    width: 20,
  },
  btn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  skip: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});
