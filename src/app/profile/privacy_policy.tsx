import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const PRIVACY_SECTIONS = [
  {
    id: 1,
    title: "Who We Are",
    icon: "information-outline" as const,
    body: "Doovly is a platform that helps customers discover service professionals and helps professionals present their services, receive booking requests and communicate with customers. This Privacy Policy explains how information is handled when you use the Doovly app and related services.",
  },
  {
    id: 2,
    title: "Information We Collect",
    icon: "database-outline" as const,
    body: "Depending on how you use Doovly, information may include your name, phone number, email address, profile photo, city, account role and authentication details; professional profile, service listings, prices, portfolio photos and verification information you submit; bookings, offers, reviews, ratings and support requests; and messages or attachments exchanged through chat. We may also receive technical information such as app version, device and diagnostic data needed to operate, protect and troubleshoot the service. We do not ask you to send passwords, bank PINs or one-time passcodes to support.",
  },
  {
    id: 3,
    title: "Location Information",
    icon: "location-outline" as const,
    body: "If you grant device permission, Doovly may use your location to help show relevant professionals or services nearby. You can manage or revoke location permission in your device settings. You may also be able to choose a city manually. Location sharing in booking or chat features may depend on the feature and booking status; the app should indicate when such sharing is available. We do not describe location as always-on unless you have enabled a feature that requires it.",
  },
  {
    id: 4,
    title: "How We Use Information",
    icon: "construct-outline" as const,
    body: "We use information to create and maintain accounts; display profiles and services; facilitate bookings, offers, reviews and conversations; provide verification and promotion features; operate subscriptions and notifications; respond to support requests; prevent fraud, abuse and security incidents; troubleshoot and improve the app; and comply with applicable legal obligations. We should only use information for purposes that are relevant to operating and improving Doovly or otherwise permitted by law.",
  },
  {
    id: 5,
    title: "What Other Users Can See",
    icon: "people-outline" as const,
    body: "Information you choose to add to a public professional profile or service listing—such as your display name, profile photo, city, service details, prices, portfolio and reviews—may be visible to other users. Booking participants may see information needed to arrange the service. Chat content is available to the participants and may need to be accessed by authorised support or security personnel when necessary to investigate a reported problem, abuse or safety issue. Avoid sharing sensitive personal or financial information in public profiles or chat.",
  },
  {
    id: 6,
    title: "Service Providers and Sharing",
    icon: "share-social-outline" as const,
    body: "Doovly may use trusted technology providers to operate the service, for example Supabase for database and authentication functions, Cloudinary for uploaded media, RevenueCat for subscription management, and notification services for push notifications where enabled. These providers process information as needed for their services and under their applicable terms and safeguards. We may also disclose information when necessary to respond to lawful requests, protect users or Doovly, investigate misuse, or support a business transfer. We do not sell personal information as a product.",
  },
  {
    id: 7,
    title: "Payments and Subscriptions",
    icon: "card-outline" as const,
    body: "Doovly may display subscription or promotion options and related status information. Subscription processing may involve RevenueCat and the relevant app-store billing system. The payment provider or app store handles payment details under its own privacy terms; Doovly may receive transaction identifiers, subscription status, product details or related records needed to manage access and support. For service bookings, customers and professionals should confirm the agreed price and payment method directly. Do not send card details, bank PINs or OTPs in chat.",
  },
  {
    id: 8,
    title: "Photos, Messages and User Content",
    icon: "images-outline" as const,
    body: "When you upload profile images, portfolio items or chat attachments, you authorise Doovly to host and display that content as needed to provide the feature you use. Only upload content you have the right to share. Keep in mind that content shared with another user may be saved or captured by that user. Doovly cannot guarantee that another participant will delete copies they have made.",
  },
  {
    id: 9,
    title: "Notifications and Preferences",
    icon: "notifications-outline" as const,
    body: "If push notifications are enabled, Doovly may use notification services and device tokens to deliver relevant alerts, such as booking or account updates. You can turn notifications off in Doovly Settings when the control is available or through your device settings. Disabling notifications may prevent you from receiving timely alerts but does not necessarily close your account.",
  },
  {
    id: 10,
    title: "Retention and Security",
    icon: "shield-checkmark-outline" as const,
    body: "We keep information for as long as reasonably needed to provide the service, maintain account and booking records, resolve disputes, enforce our terms, meet legal obligations and protect the platform. Retention periods can vary by data type and circumstance. We use appropriate safeguards intended to protect information, but no online service or storage method can be guaranteed completely secure.",
  },
  {
    id: 11,
    title: "Your Choices and Privacy Rights",
    icon: "person-circle-outline" as const,
    body: "You can review and update some profile information in the app, manage device permissions, and change notification preferences. Depending on applicable law, you may have rights to request access to, correction of, deletion of, or restriction of processing of your personal information, or to object to certain processing. We may need to verify your identity before responding and may retain some records where the law permits or requires it.",
  },
  {
    id: 12,
    title: "Account Deletion",
    icon: "person-remove-outline" as const,
    body: "If you want to delete your Doovly account or make a privacy request, contact support using the details below and clearly state your request. We may ask you to verify account ownership. Deletion may not immediately remove information that must be retained for legal, security, accounting or dispute-resolution reasons, and content already shared with other users may remain in their possession. We will handle valid requests in accordance with applicable law and our retention requirements.",
  },
  {
    id: 13,
    title: "Children's Privacy",
    icon: "people-circle-outline" as const,
    body: "Doovly is not intended for children who are not legally permitted to use the service. If you believe a child has provided personal information inappropriately, contact us so we can review the situation and take appropriate action.",
  },
  {
    id: 14,
    title: "Changes to This Policy",
    icon: "refresh-outline" as const,
    body: "We may update this Privacy Policy as Doovly changes or when legal requirements change. We will update the date shown on this page and, where appropriate, provide notice in the app or through another suitable channel. Please review this page periodically.",
  },
  {
    id: 15,
    title: "Contact and Complaints",
    icon: "mail-outline" as const,
    body: "For privacy questions, access or deletion requests, or complaints about how your information is handled, email support@doovly.com. Please do not include passwords, bank PINs or OTPs in your message. If you are in Nigeria, you may also have the right to raise a complaint with the relevant data protection authority under applicable law.",
  },
];

export default function PrivacyPolicy() {
  const [expanded, setExpanded] = useState<number | null>(1);

  const contactSupport = async () => {
    const url = "mailto:support@doovly.com?subject=Doovly%20Privacy%20Request";
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Contact Support", "Please email support@doovly.com about your privacy request.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={23} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="shield-lock-outline" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>Doovly</Text>
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: 16 October 2026</Text>
          <Text style={styles.intro}>
            Your privacy matters. This page explains what information Doovly may handle, how it is used, when it is shared, and the choices available to you.
          </Text>
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={21} color={PRIMARY} />
          <Text style={styles.noticeText}>
            The details below are intended to describe Doovly's app features and service providers. The published policy should be checked against the live app, backend configuration and applicable legal requirements before release.
          </Text>
        </View>

        <View style={styles.sectionList}>
          {PRIVACY_SECTIONS.map((section) => {
            const isExpanded = expanded === section.id;
            return (
              <View key={section.id} style={[styles.section, isExpanded && styles.sectionOpen]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setExpanded((current) => current === section.id ? null : section.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={styles.number}>
                    <Text style={styles.numberText}>{section.id}</Text>
                  </View>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name={section.icon} size={20} color={PRIMARY} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={PRIMARY} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.sectionBody}>
                    <Text style={styles.bodyText}>{section.body}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Ionicons name="mail" size={23} color="#FFFFFF" />
          </View>
          <View style={styles.contactCopy}>
            <Text style={styles.contactTitle}>Questions about your privacy?</Text>
            <Text style={styles.contactText}>Contact Doovly Support for privacy questions or account-data requests.</Text>
            <Text style={styles.email}>support@doovly.com</Text>
          </View>
          <TouchableOpacity style={styles.contactButton} onPress={contactSupport} activeOpacity={0.8}>
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          This policy is a product-facing draft and is not a substitute for legal review. It should be updated if Doovly's actual data practices or providers change.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F1",
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: TEXT_DARK },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30 },
  hero: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EEE8",
    padding: 20,
    marginBottom: 12,
  },
  heroIcon: {
    width: 66, height: 66, borderRadius: 21, backgroundColor: PRIMARY,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  brand: { color: PRIMARY, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: { color: TEXT_DARK, fontSize: 24, fontWeight: "800", marginTop: 3, textAlign: "center" },
  updated: { color: TEXT_MUTED, fontSize: 12, marginTop: 7 },
  intro: { color: "#374151", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 13 },
  notice: {
    flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: "#CDEBD7", backgroundColor: "#F0FDF4", marginBottom: 13,
  },
  noticeText: { flex: 1, color: "#365344", fontSize: 11.5, lineHeight: 17 },
  sectionList: { gap: 8 },
  section: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 13, overflow: "hidden" },
  sectionOpen: { borderColor: "#B9DFC6", backgroundColor: "#FCFFFD" },
  sectionHeader: { minHeight: 57, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, paddingVertical: 8 },
  number: { width: 29, height: 29, borderRadius: 9, backgroundColor: LIGHT_GREEN, alignItems: "center", justifyContent: "center", marginRight: 9 },
  numberText: { color: PRIMARY, fontSize: 12, fontWeight: "800" },
  sectionIcon: { width: 27, alignItems: "center", marginRight: 7 },
  sectionTitle: { flex: 1, color: TEXT_DARK, fontSize: 13, fontWeight: "700", paddingRight: 6 },
  sectionBody: { paddingLeft: 83, paddingRight: 15, paddingBottom: 15 },
  bodyText: { color: TEXT_MUTED, fontSize: 12.5, lineHeight: 20 },
  contactCard: {
    flexDirection: "row", alignItems: "center", marginTop: 15, padding: 14,
    backgroundColor: "#FFFFFF", borderRadius: 15, borderWidth: 1, borderColor: "#DCE9E1",
  },
  contactIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginRight: 11 },
  contactCopy: { flex: 1 },
  contactTitle: { color: TEXT_DARK, fontSize: 13, fontWeight: "700" },
  contactText: { color: TEXT_MUTED, fontSize: 11, lineHeight: 16, marginTop: 3 },
  email: { color: PRIMARY, fontSize: 11.5, fontWeight: "700", marginTop: 4 },
  contactButton: { backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, marginLeft: 8 },
  contactButtonText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "700" },
  footer: { color: "#9CA3AF", fontSize: 10.5, lineHeight: 16, textAlign: "center", marginTop: 16, paddingHorizontal: 8 },
});
