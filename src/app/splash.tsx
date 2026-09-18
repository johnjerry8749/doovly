import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// Keep the native splash visible while this screen prepares
SplashScreen.preventAutoHideAsync();

export default function Splash() {
  const router = useRouter();

  // =========================
  // LOGO ANIMATION
  // =========================

  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // =========================
  // GLOW ANIMATION
  // =========================

  const glowScale = useRef(new Animated.Value(0.7)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // =========================
  // TEXT ANIMATION
  // =========================

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;

  // =========================
  // LOADING ANIMATION
  // =========================

  const loadingWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // =========================
    // LOGO + GLOW
    // =========================

    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 45,
        useNativeDriver: true,
      }),

      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(glowScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // =========================
    // BRAND TEXT
    // =========================

    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // =========================
    // LOADING BAR
    // =========================

    Animated.timing(loadingWidth, {
      toValue: 1,
      duration: 4000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    // =========================
    // NAVIGATION
    // =========================

    const navigationTimer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      router.replace("/(onboarding)");
    }, 4000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(navigationTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#16A34A"
      />

      {/* =========================
          LOGO
          ========================= */}

      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoFrame,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require("@/assets/images/splash_screen.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* =========================
          BRAND
          ========================= */}

      <Animated.View
        style={[
          styles.brandContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        <Text style={styles.brandName}>DOOVLY</Text>

        <Text style={styles.tagline}>
          Quality service. Right at your door.
        </Text>
      </Animated.View>

      {/* =========================
          LOADING
          ========================= */}

      <View style={styles.bottomContainer}>
        <View style={styles.loadingBackground}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                width: loadingWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        <Text style={styles.loadingText}>
          Connecting you to trusted professionals...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // =========================
  // CONTAINER
  // =========================

  container: {
    flex: 1,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },

  // =========================
  // LOGO
  // =========================

  logoContainer: {
    width: 190,
    height: 190,
    justifyContent: "center",
    alignItems: "center",
  },

  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#4ADE80",
    opacity: 0.5,
  },

  logoFrame: {
    width: 135,
    height: 135,
    borderRadius: 67.5,

    backgroundColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    overflow: "hidden",

    borderWidth: 4,
    borderColor: "#FFFFFF",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,

    elevation: 10,
  },

  logo: {
    width: 110,
    height: 110,
  },

  // =========================
  // BRAND
  // =========================

  brandContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 10,
  },

  brandName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 5,
    color: "#FFFFFF",
    textAlign: "center",
  },

  tagline: {
    marginTop: 7,
    fontSize: 15,
    fontWeight: "500",
    color: "#DCFCE7",
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 20,
    includeFontPadding: false,
  },

  // =========================
  // LOADING
  // =========================

  bottomContainer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  loadingBackground: {
    width: 150,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#15803D",
    overflow: "hidden",
  },

  loadingProgress: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 11,
    fontSize: 11,
    color: "#DCFCE7",
    textAlign: "center",
  },
});
