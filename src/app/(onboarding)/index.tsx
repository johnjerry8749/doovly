import {
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Find Trusted Local Professionals",
    description:
      "Connect with verified experts in your area — plumbers, electricians, cleaners, barbers, nail techs and more.",
    image: require("@/assets/onboarding/onboarding_1.jpg"),
  },
  {
    id: "2",
    title: "Book & Pay Securely",
    description:
      "Book in seconds and pay safely with Paystack. No cash, no stress.",
    image: require("@/assets/onboarding/onboarding_2.jpg"),
  },
  {
    id: "3",
    title: "Offer Your Own Services and Earn",
    description:
      "Add your service, set your price and start receiving bookings from people near you.",
    image: require("@/assets/onboarding/onboarding_3.jpg"),
  },
];

type Slide = (typeof slides)[number];

export default function Index() {
  const router = useRouter();

  const flatListRef = useRef<FlatList<Slide>>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  // =========================
  // NEXT BUTTON
  // =========================
  const handleNext = () => {
    const isLastSlide = currentIndex === slides.length - 1;

    if (isLastSlide) {
      router.replace("/(auth)/login");
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  // =========================
  // SKIP BUTTON
  // =========================
  const handleSkip = () => {
    router.replace("/(auth)/login");
  };

  // =========================
  // SLIDE
  // =========================
  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={styles.slide}>
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  // =========================
  // SCREEN
  // =========================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );

          setCurrentIndex(index);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((slide) => (
          <View
            key={slide.id}
            style={[
              styles.dot,
              slide.id === slides[currentIndex].id &&
                styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Next / Get Started */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {currentIndex === slides.length - 1
            ? "Get Started"
            : "Next"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // =========================
  // CONTAINER
  // =========================
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // =========================
  // SKIP
  // =========================
  skipButton: {
    position: "absolute",
    top: 50,
    right: 24,
    zIndex: 10,
    padding: 8,
  },

  skipText: {
    color: "#16A34A",
    fontSize: 16,
    fontWeight: "600",
  },

  // =========================
  // SLIDE
  // =========================
  slide: {
    width,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },

  image: {
    width: width * 0.75,
    height: width * 0.75,
    marginBottom: 40,
  },

  // =========================
  // TEXT
  // =========================
  title: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  description: {
    color: "#6B7280",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },

  // =========================
  // DOTS
  // =========================
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },

  activeDot: {
    width: 24,
    backgroundColor: "#16A34A",
  },

  // =========================
  // BUTTON
  // =========================
  button: {
    backgroundColor: "#16A34A",
    marginHorizontal: 24,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});

