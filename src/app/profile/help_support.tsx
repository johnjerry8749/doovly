import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Linking,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const PRIMARY = "#159447";
const BANNER_GREEN = "#0F9D4D";
const LIGHT_GREEN = "#E8F5E9";
const SOFT_BG = "#F3F4F6";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 16;
const TOPIC_GAP = 10;
const TOPIC_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - TOPIC_GAP) / 2;
const CONTACT_GAP = 8;
const CONTACT_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - CONTACT_GAP * 2) / 3;

// =====================================================
// MOCK DATA
// =====================================================

const POPULAR_TOPICS = [
  {
    id: "1",
    title: "Bookings",
    subtitle: "Manage, reschedule or cancel bookings",
    icon: "calendar-outline" as const,
    guideKey: "bookings" as const,
  },
  {
    id: "2",
    title: "Payments",
    subtitle: "Payments, refunds and wallet issues",
    icon: "card-outline" as const,
    guideKey: "payments" as const,
  },
  {
    id: "3",
    title: "Accounts",
    subtitle: "Profile, verification and security",
    icon: "person-outline" as const,
    guideKey: "accounts" as const,
  },
  {
    id: "4",
    title: "Services",
    subtitle: "Listing services, leads and promotions",
    icon: "briefcase-outline" as const,
    guideKey: "services" as const,
  },
  {
    id: "5",
    title: "Safety",
    subtitle: "Staying safe on Doovly",
    icon: "shield-checkmark-outline" as const,
    guideKey: "safety" as const,
  },
  {
    id: "6",
    title: "Technical Issues",
    subtitle: "App issues, errors and bugs",
    icon: "settings-outline" as const,
    guideKey: "technical" as const,
  },
];

const GUIDE_CONTENT = {
  bookings: {
    title: "Booking Guidelines",
    body: `1. Find a professional from Home or Services.
2. Open their profile and review services & portfolio.
3. Tap Book Now and choose service, date, time and address.
4. Confirm details and proceed to payment.
5. You will receive a booking confirmation in My Bookings.

You can reschedule or cancel from My Bookings before the job starts (subject to the provider’s policy).`,
  },
  payments: {
    title: "Payment Instructions",
    body: `1. After booking details, you will see the payment screen.
2. Pay with card or Doovly wallet.
3. Wait for the success confirmation before leaving the screen.
4. A receipt is saved under the booking details.

Refunds: open the booking → Request refund if eligible. Refunds are reviewed within a few business days.`,
  },
  accounts: {
    title: "Account & Security",
    body: `1. Keep your phone number and email up to date in Edit Profile.
2. Complete Verification to unlock trust badges and more bookings.
3. Never share your password or OTP with anyone.
4. Log out on shared devices from Profile → Log Out.

If you notice strange activity, change your password and contact support immediately.`,
  },
  services: {
    title: "Services Guidelines",
    body: `1. Providers list services from Profile → Add Service.
2. Each service should have a clear name, description and price.
3. Customers book a specific service from your profile.
4. Keep availability updated so you only get jobs you can take.

Tips: clear photos in Portfolio and accurate pricing improve bookings.`,
  },
  safety: {
    title: "Staying Safe on Doovly",
    body: `1. Only communicate and pay through the Doovly app when possible.
2. Meet in safe, public or agreed locations for the service.
3. Check provider verification and reviews before booking.
4. Report suspicious behaviour from the booking or profile.

Doovly never asks for your bank PIN or OTP. If something feels wrong, cancel and contact support.`,
  },
  technical: {
    title: "Technical Issues",
    body: `1. Update the app from the Play Store / App Store.
2. Check your internet connection (Wi‑Fi or mobile data).
3. Force-close the app and open it again.
4. Clear app cache (Android) or reinstall if problems continue.

Still stuck? Use Live Chat, Email, or Call Us below and describe the error you see.`,
  },
};

type GuideKey = keyof typeof GUIDE_CONTENT;

const FAQS = [
  {
    id: "1",
    question: "How do I book a service?",
    answer:
      "Browse services or professionals, open a profile, choose a service and tap Book Now. Pick date, time and address, then confirm payment.",
  },
  {
    id: "2",
    question: "How do I make a payment?",
    answer:
      "You can pay with card or wallet at checkout. All payments are secured. You will get a confirmation after a successful payment.",
  },
  {
    id: "3",
    question: "How do I get a refund?",
    answer:
      "Go to My Bookings, open the booking and request a refund if eligible. Refunds are reviewed within a few business days.",
  },
  {
    id: "4",
    question: "How do I become a service provider?",
    answer:
      "Sign up, complete your profile, add services and submit verification. Once approved you can start receiving bookings.",
  },
  {
    id: "5",
    question: "How do I verify my account?",
    answer:
      "Open Profile → Verification and upload the required documents. We usually review within 24–48 hours.",
  },
  {
    id: "6",
    question: "What if a provider doesn't show up?",
    answer:
      "Contact support from the booking details or use Live Chat. We can help reschedule, cancel or process a refund where needed.",
  },
];

// =====================================================
// FAQ ACCORDION
// =====================================================

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-forward"}
          size={18}
          color="#9CA3AF"
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

// =====================================================
// SCREEN
// =====================================================

export default function HelpSupport() {
  const [search, setSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeGuide, setActiveGuide] = useState<GuideKey>("bookings");
  const [guideContent] = useState(GUIDE_CONTENT);

  const openGuide = (key: GuideKey) => {
    setActiveGuide(key);
    setModalVisible(true);
  };

  const closeGuide = () => setModalVisible(false);

  const filteredFaqs = FAQS.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q)
    );
  });

  const current = guideContent[activeGuide];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.banner}>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>How can we help you?</Text>
            <Text style={styles.bannerSubtitle}>
              Find answers, get support or contact our team.
            </Text>
          </View>

          <Image
            source={require("@/assets/help&support/help.png")}
            style={styles.agentImage}
            resizeMode="contain"
          />

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={TEXT_MUTED} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help (e.g. bookings, payments...)"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Popular Topics</Text>

        <View style={styles.topicsGrid}>
          {POPULAR_TOPICS.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              activeOpacity={0.8}
              onPress={() => openGuide(topic.guideKey)}
            >
              <View style={styles.topicIcon}>
                <Ionicons name={topic.icon} size={18} color={PRIMARY} />
              </View>
              <View style={styles.topicText}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicSubtitle} numberOfLines={2}>
                  {topic.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>FAQs</Text>

        <View style={styles.faqCard}>
          {filteredFaqs.map((item, index) => (
            <View key={item.id}>
              <FaqItem
                question={item.question}
                answer={item.answer}
                open={openFaqId === item.id}
                onToggle={() =>
                  setOpenFaqId((prev) => (prev === item.id ? null : item.id))
                }
              />
              {index < filteredFaqs.length - 1 && (
                <View style={styles.faqDivider} />
              )}
            </View>
          ))}
          {filteredFaqs.length === 0 && (
            <Text style={styles.emptyFaq}>No results for “{search}”</Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
          Still need help?
        </Text>
        <Text style={styles.stillSubtitle}>
          Our support team is always ready to assist you.
        </Text>

        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} activeOpacity={0.8}>
            <View style={styles.contactIcon}>
              <Ionicons name="chatbubble-outline" size={16} color={PRIMARY} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactTitle} numberOfLines={1}>
                Live Chat
              </Text>
              <Text style={styles.contactSub} numberOfLines={1}>
                Chat with our team
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.8}
            onPress={() => Linking.openURL("mailto:support@doovly.com")}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail-outline" size={16} color={PRIMARY} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactTitle} numberOfLines={1}>
                Email Support
              </Text>
              <Text style={styles.contactSub} numberOfLines={1}>
                support@doovly.com
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.8}
            onPress={() => Linking.openURL("tel:+2348001234567")}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call-outline" size={16} color={PRIMARY} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactTitle} numberOfLines={1}>
                Call Us
              </Text>
              <Text style={styles.contactSub} numberOfLines={1}>
                +234 800 123 4567
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footerBanner}>
          <View style={styles.footerIcon}>
            <Ionicons name="headset-outline" size={20} color={PRIMARY} />
          </View>
          <View style={styles.footerTextCol}>
            <Text style={styles.footerTitle}>We're here for you!</Text>
            <Text style={styles.footerSub}>
              Our support team typically responds within a few minutes.
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeGuide}
      >
        <Pressable style={modalStyles.overlay} onPress={closeGuide}>
          <Pressable
            style={modalStyles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.handle} />

            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>{current.title}</Text>
              <TouchableOpacity
                onPress={closeGuide}
                hitSlop={12}
                style={modalStyles.closeBtn}
              >
                <Ionicons name="close" size={22} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={modalStyles.bodyScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={modalStyles.body}>{current.body}</Text>
            </ScrollView>

            <TouchableOpacity
              style={modalStyles.doneBtn}
              activeOpacity={0.85}
              onPress={closeGuide}
            >
              <Text style={modalStyles.doneText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingBottom: 16,
  },
  banner: {
    marginHorizontal: H_PAD,
    marginTop: 8,
    backgroundColor: BANNER_GREEN,
    borderRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 14,
    overflow: "hidden",
    minHeight: 158,
  },
  bannerTextCol: {
    maxWidth: "55%",
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: "#D1FAE5",
    lineHeight: 17,
    marginBottom: 14,
  },
  agentImage: {
    position: "absolute",
    right: -19,
    top: 8,
    width: 180,
    height: 180,
  },
  searchBox: {
    width: "79%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 40,
    gap: 8,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginHorizontal: H_PAD,
    marginTop: 20,
    marginBottom: 12,
  },
  stillSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginHorizontal: H_PAD,
    marginTop: -6,
    marginBottom: 12,
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: H_PAD,
    gap: TOPIC_GAP,
  },
  topicCard: {
    width: TOPIC_WIDTH,
    backgroundColor: SOFT_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  topicIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  topicText: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  topicSubtitle: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 13,
  },
  faqCard: {
    marginHorizontal: H_PAD,
    backgroundColor: "#FFFFFF",
  },
  faqItem: {},
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    color: TEXT_DARK,
  },
  faqBody: {
    paddingBottom: 12,
  },
  faqAnswer: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
  },
  faqDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  emptyFaq: {
    paddingVertical: 16,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
  },
  contactRow: {
    flexDirection: "row",
    paddingHorizontal: H_PAD,
    gap: CONTACT_GAP,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: "row",
    width: CONTACT_WIDTH,
    backgroundColor: SOFT_BG,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  contactIcon: {
    width: 22,
    height: 22,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  contactTextCol: {
    width: "100%",
  },
  contactTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: TEXT_DARK,
    padding: 5,
  },
  contactSub: {
    marginLeft: -16,
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  footerBanner: {
    marginHorizontal: H_PAD,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  footerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  footerTextCol: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },
  footerSub: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
    lineHeight: 16,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  doneBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});