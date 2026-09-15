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

  // Logo animation
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Glow animation
  const glowScale = useRef(new Animated.Value(0.7)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Text animation
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;

  // Loading animation
  const loadingWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo + glow animation
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

    // Brand text animation
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

    // Loading bar animation
    Animated.timing(loadingWidth, {
      toValue: 1,
      duration: 4000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Wait 4 seconds, hide native splash, then go to onboarding
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

      {/* Logo */}
      <View style={styles.logoContainer}>

        {/* Glow behind logo */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        {/* Round logo frame */}
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
            source={require("@/assets/images/splash_screen.jpg")}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

      {/* Brand */}
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
          Quaity service.
          Right at yout door
        </Text>
      </Animated.View>

      {/* Bottom loading section */}
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

    borderWidth: 5,
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
    width: 115,
    height: 115,
    borderRadius: 57.5,
  },

  // =========================
  // BRAND
  // =========================

  brandContainer: {
    alignItems: "center",
    marginTop: 25,
  },

  brandName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 5,
    color: "#FFFFFF",
  },

  tagline: {
    marginTop: 8,
    fontSize: 18,
    color: "#DCFCE7",
    letterSpacing: 0.5,
  },

  // =========================
  // LOADING
  // =========================

  bottomContainer: {
    position: "absolute",
    bottom: 55,
    width: "100%",
    alignItems: "center",
  },

  loadingBackground: {
    width: 140,
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
    marginTop: 12,
    fontSize: 11,
    color: "#DCFCE7",
  },
});

