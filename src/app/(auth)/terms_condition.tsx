import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const PRIMARY = "#087F45";
const LIGHT_GREEN = "#EAF8F0";
const BORDER = "#E5E7EB";
const TEXT = "#17212B";
const SECONDARY = "#5F6368";

type Section = {
  id: number;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  content: string;
};

const TERMS_SECTIONS: Section[] = [
  {
    id: 1,
    title: "About Doovly",
    icon: "information-outline",
    content:
      "Doovly is a platform that connects customers with service providers. We provide tools that allow users to discover services, communicate with providers, make bookings and manage their service requests.",
  },
  {
    id: 2,
    title: "User Accounts",
    icon: "account-outline",
    content:
      "You are responsible for providing accurate information when creating your Doovly account. You must keep your login details secure and must not share your account credentials with another person. You are responsible for activities carried out through your account.",
  },
  {
    id: 3,
    title: "Customers & Service Providers",
    icon: "account-group-outline",
    content:
      "Customers may browse and request services from providers listed on Doovly. Service providers are responsible for accurately describing their services, prices, availability and qualifications. Doovly facilitates connections between users but does not provide the services itself.",
  },
  {
    id: 4,
    title: "Services & Bookings",
    icon: "calendar-month-outline",
    content:
      "Bookings are subject to the availability of the selected service provider. Customers should review the service details, price, location and booking information before confirming a request. A booking may be subject to additional terms agreed between the customer and provider.",
  },
  {
    id: 5,
    title: "Payments & Fees",
    icon: "cash-multiple",
    content:
      "Payments and applicable fees must be made through the payment methods supported by Doovly. Prices displayed on the platform may be set by service providers. Doovly may charge applicable platform, subscription or transaction fees where clearly stated.",
  },
  {
    id: 6,
    title: "Cancellations & Refunds",
    icon: "close-circle-outline",
    content:
      "Cancellation and refund eligibility may depend on the service, booking status and applicable cancellation policy. Where a refund is approved, processing times may depend on the payment provider or financial institution.",
  },
  {
    id: 7,
    title: "Provider Verification",
    icon: "shield-check-outline",
    content:
      "Doovly may verify information submitted by service providers. Verification may include identity, contact or other relevant information. A verification badge indicates that Doovly has completed the applicable verification process and does not guarantee the quality, safety or outcome of a service.",
  },
  {
    id: 8,
    title: "Reviews & Ratings",
    icon: "star-outline",
    content:
      "Users may leave honest and relevant reviews and ratings based on their actual experience. Reviews must not contain false information, threats, harassment, personal information or prohibited content. Doovly may remove content that violates these Terms.",
  },
  {
    id: 9,
    title: "Chat & Communication",
    icon: "chat-outline",
    content:
      "Doovly may provide communication tools that allow customers and service providers to discuss bookings and services. Users must communicate respectfully and must not use Doovly communication features for fraud, harassment, spam or other prohibited activities.",
  },
  {
    id: 10,
    title: "User Responsibilities",
    icon: "clipboard-check-outline",
    content:
      "You agree to use Doovly lawfully and responsibly. You must provide accurate information, respect other users, honour confirmed bookings and comply with applicable laws and these Terms & Conditions.",
  },
  {
    id: 11,
    title: "Pro / Subscription Features",
    icon: "crown-outline",
    content:
      "Doovly may offer paid subscription or Pro features to eligible users. Subscription benefits, pricing, billing periods and renewal terms will be displayed before purchase. Subscription features may change from time to time.",
  },
  {
    id: 12,
    title: "Prohibited Activities",
    icon: "cancel",
    content:
      "Users must not use Doovly for fraudulent, unlawful, abusive or harmful activities. This includes impersonation, scams, harassment, misuse of payment systems, uploading malicious content, attempting to gain unauthorized access or using the platform to facilitate illegal activities.",
  },
  {
    id: 13,
    title: "Disputes & Complaints",
    icon: "gavel",
    content:
      "If you have a complaint about a service, booking or another user, you should first contact the relevant party where appropriate. Doovly may assist with platform-related disputes and may request information necessary to review a complaint.",
  },
  {
    id: 14,
    title: "Limitation of Liability",
    icon: "shield-outline",
    content:
      "Doovly provides a platform for connecting customers and service providers. To the extent permitted by applicable law, Doovly is not responsible for the acts, omissions, quality, safety, availability or outcome of services provided by independent service providers.",
  },
  {
    id: 15,
    title: "Suspension & Termination",
    icon: "account-cancel-outline",
    content:
      "Doovly may suspend or terminate an account where we reasonably believe that a user has violated these Terms, engaged in fraudulent or harmful activity, or created a risk to other users or the platform.",
  },
  {
    id: 16,
    title: "Privacy",
    icon: "lock-outline",
    content:
      "Your use of Doovly is also subject to our Privacy Policy. We collect and process information as described in that policy and applicable data protection laws.",
  },
  {
    id: 17,
    title: "Changes to These Terms",
    icon: "refresh",
    content:
      "Doovly may update these Terms & Conditions from time to time. When material changes are made, we may provide appropriate notice. Your continued use of Doovly after an updated version becomes effective means that you acknowledge the updated Terms.",
  },
  {
    id: 18,
    title: "Contact Doovly",
    icon: "email-outline",
    content:
      "If you have questions, complaints or requests regarding these Terms & Conditions, you can contact Doovly through the support or contact channels provided within the app.",
  },
];

export default function TermsCondition() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggleSection = (id: number) => {
    setExpanded((current) => (current === id ? null : id));
  };

  /**
   * When the user agrees:
   *
   * 1. Go back to the signup screen.
   * 2. Send termsAccepted=true.
   * 3. Signup screen reads this parameter.
   * 4. Signup automatically ticks the checkbox.
   */
  const handleAgree = () => {
    router.replace({
      pathname: "/signup",
      params: {
        termsAccepted: "true",
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* ================= HEADER ================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color="#111827"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Terms & Conditions
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* ================= CONTENT ================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HERO ================= */}

        <View style={styles.hero}>
          <Image
            source={require("@/assets/terms/terms.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />

          <View style={styles.heroText}>
            <Text style={styles.logoText}>
              Doovly
            </Text>

            <Text style={styles.heroTitle}>
              Terms &{"\n"}Conditions
            </Text>
          </View>
        </View>

        {/* ================= INTRO ================= */}

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons
              name="shield-check"
              size={30}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.introText}>
            Welcome to Doovly. By using our app, website
            or services, you agree to these Terms &
            Conditions. Please read them carefully.
          </Text>
        </View>

        {/* ================= SECTIONS ================= */}

        <View style={styles.sectionsContainer}>
          {TERMS_SECTIONS.map((section) => {
            const isExpanded =
              expanded === section.id;

            return (
              <View
                key={section.id}
                style={[
                  styles.sectionWrapper,
                  isExpanded &&
                    styles.sectionExpanded,
                ]}
              >
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() =>
                    toggleSection(section.id)
                  }
                  activeOpacity={0.7}
                >
                  {/* Number */}

                  <View style={styles.numberBox}>
                    <Text style={styles.numberText}>
                      {section.id}
                    </Text>
                  </View>

                  {/* Icon */}

                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons
                      name={section.icon}
                      size={20}
                      color={PRIMARY}
                    />
                  </View>

                  {/* Title */}

                  <Text
                    style={styles.sectionTitle}
                    numberOfLines={1}
                  >
                    {section.title}
                  </Text>

                  {/* Arrow */}

                  <Ionicons
                    name={
                      isExpanded
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={19}
                    color={PRIMARY}
                  />
                </TouchableOpacity>

                {/* Expanded content */}

                {isExpanded && (
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>
                      {section.content}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ================= AGREEMENT ================= */}

        <View style={styles.agreementCard}>
          <View style={styles.agreementTop}>
            <View style={styles.agreementIcon}>
              <MaterialCommunityIcons
                name="shield-check"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.agreementText}>
              By continuing to use Doovly, you acknowledge
              that you have read, understood and agree to
              these Terms & Conditions.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.agreeButton}
            onPress={handleAgree}
            activeOpacity={0.8}
          >
            <Text style={styles.agreeButtonText}>
              I Agree
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 30,
    paddingBottom: 25,
  },

  // =========================
  // HEADER
  // =========================

  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 35,
    height: 35,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
  },

  headerSpacer: {
    width: 35,
  },

  // =========================
  // HERO
  // =========================

  hero: {
    minHeight: 215,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  heroImage: {
    width: "46%",
    height: 200,
  },

  heroText: {
    flex: 1,
    paddingLeft: 5,
  },

  logoText: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -1.5,
  },

  heroTitle: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "800",
    color: TEXT,
    marginTop: 3,
  },

  updatedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  updatedText: {
    fontSize: 11.5,
    color: "#42484D",
    marginLeft: 7,
    fontWeight: "500",
  },

  // =========================
  // INTRO
  // =========================

  introCard: {
    minHeight: 85,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },

  introIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  introText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#30363B",
    fontWeight: "500",
  },

  // =========================
  // SECTIONS
  // =========================

  sectionsContainer: {
    width: "100%",
  },

  sectionWrapper: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    marginBottom: 3,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  sectionExpanded: {
    backgroundColor: "#FBFFFC",
  },

  sectionHeader: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  numberBox: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  numberText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },

  sectionIcon: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 13.5,
    color: TEXT,
    fontWeight: "700",
  },

  sectionContent: {
    paddingLeft: 81,
    paddingRight: 15,
    paddingBottom: 15,
  },

  sectionText: {
    fontSize: 13,
    lineHeight: 20,
    color: SECONDARY,
  },

  // =========================
  // AGREEMENT
  // =========================

  agreementCard: {
    backgroundColor: "#F3FAF6",
    borderWidth: 1,
    borderColor: "#DDEDE4",
    borderRadius: 15,
    padding: 12,
    marginTop: 7,
  },

  agreementTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  agreementIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  agreementText: {
    flex: 1,
    color: "#3F4742",
    fontSize: 12.5,
    lineHeight: 18,
    paddingTop: 2,
  },

  agreeButton: {
    height: 51,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  agreeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
