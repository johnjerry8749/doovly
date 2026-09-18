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

  // Logo entrance
  const logoScale = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Soft outer glow / pulse ring
  const glowScale = useRef(new Animated.Value(0.55)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Continuous subtle pulse after entrance
  const pulse = useRef(new Animated.Value(1)).current;

  // Brand text
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(24)).current;

  // Loading bar
  const loadingWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Logo + glow spring in (Lottie-style entrance)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 1.15,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.55,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After entrance → continuous soft pulse on the glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 2. Brand text slides up + fades in
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 420);

    // 3. Progress bar fills smoothly
    Animated.timing(loadingWidth, {
      toValue: 1,
      duration: 2800,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // 4. Navigate after animation finishes
    const navigationTimer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      router.replace("/(onboarding)");
    }, 3200);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(navigationTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />

      {/* ========== LOGO ========== */}
      <View style={styles.logoContainer}>
        {/* Soft expanding glow / pulse ring */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              transform: [{ scale: Animated.multiply(glowScale, pulse) }],
            },
          ]}
        />

        {/* White circular frame + logo */}
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
            source={require("@/assets/images/splash_screen1.jpg")}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

      {/* ========== BRAND ========== */}
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

      {/* ========== LOADING ========== */}
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

  // LOGO
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },

  glow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#4ADE80",
  },

  logoFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: "#BBF7D0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },

  logo: {
    width: 118,
    height: 118,
    borderRadius: 59,
  },

  // BRAND
  brandContainer: {
    alignItems: "center",
    marginTop: 28,
  },

  brandName: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 6,
    color: "#FFFFFF",
  },

  tagline: {
    marginTop: 10,
    fontSize: 16,
    color: "#DCFCE7",
    letterSpacing: 0.3,
    textAlign: "center",
  },

  // LOADING
  bottomContainer: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 40,
  },

  loadingBackground: {
    width: 160,
    height: 6,
    borderRadius: 12,
    backgroundColor: "#15803D",
    overflow: "hidden",
  },

  loadingProgress: {
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 12,
    color: "#DCFCE7",
    letterSpacing: 0.2,
  },
});
