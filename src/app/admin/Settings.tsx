import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getSubscriptionPlans,
  saveSubscriptionPlans,
  type SubscriptionPlanConfig,
  type SubscriptionPlansState,
} from "@/services/admin/subscriptionPlans";

const GREEN = "#159447";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [plansState, setPlansState] = useState<SubscriptionPlansState>(() =>
    getSubscriptionPlans(),
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const pro = useMemo(
    () => plansState.plans.find((p) => p.id === "pro")!,
    [plansState.plans],
  );
  const basic = useMemo(
    () => plansState.plans.find((p) => p.id === "basic")!,
    [plansState.plans],
  );

  const [monthlyStr, setMonthlyStr] = useState(String(pro.monthlyPrice));
  const [yearlyStr, setYearlyStr] = useState(String(pro.yearlyPrice));
  const [yearlySaveStr, setYearlySaveStr] = useState(
    String(plansState.yearlySavePercent),
  );

  const scrollToInput = (y: number) => {
    // Extra offset so focused field sits above the keyboard
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 80),
        animated: true,
      });
    });
  };

  const updatePlan = (
    planId: "basic" | "pro",
    patch: Partial<SubscriptionPlanConfig>,
  ) => {
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === planId ? { ...p, ...patch } : p,
      ),
    }));
  };

  const updateFeature = (
    planId: "basic" | "pro",
    featureId: string,
    label: string,
  ) => {
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id !== planId
          ? p
          : {
              ...p,
              features: p.features.map((f) =>
                f.id === featureId ? { ...f, label } : f,
              ),
            },
      ),
    }));
  };

  const addFeature = (planId: "basic" | "pro") => {
    const id = `${planId}-f-${Date.now()}`;
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id !== planId
          ? p
          : {
              ...p,
              features: [...p.features, { id, label: "New feature" }],
            },
      ),
    }));
  };

  const removeFeature = (planId: "basic" | "pro", featureId: string) => {
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id !== planId
          ? p
          : {
              ...p,
              features: p.features.filter((f) => f.id !== featureId),
            },
      ),
    }));
  };

  const handleSave = () => {
    Keyboard.dismiss();
    const monthly = Math.max(0, Math.round(Number(monthlyStr) || 0));
    const yearly = Math.max(0, Math.round(Number(yearlyStr) || 0));
    const yearlySave = Math.min(
      100,
      Math.max(0, Math.round(Number(yearlySaveStr) || 0)),
    );

    if (Number.isNaN(monthly) || Number.isNaN(yearly)) {
      Alert.alert("Invalid price", "Enter valid numbers for monthly and yearly.");
      return;
    }

    const next: SubscriptionPlansState = {
      ...plansState,
      yearlySavePercent: yearlySave,
      plans: plansState.plans.map((p) =>
        p.id === "pro"
          ? { ...p, monthlyPrice: monthly, yearlyPrice: yearly }
          : p,
      ),
    };

    const saved = saveSubscriptionPlans(next);
    setPlansState(saved);
    setMonthlyStr(String(saved.plans.find((p) => p.id === "pro")!.monthlyPrice));
    setYearlyStr(String(saved.plans.find((p) => p.id === "pro")!.yearlyPrice));
    setYearlySaveStr(String(saved.yearlySavePercent));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const topPad = Math.max(insets.top, 12) + 56;
  const bottomPad = 120 + Math.max(insets.bottom, 16);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? topPad : 24}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Configure profile subscription plans and pricing
          </Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="pricetag" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Pro subscription pricing</Text>
                <Text style={styles.cardHint}>
                  Amounts shown on the user Subscription screen
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={styles.fieldLabel}>Monthly (NGN)</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.currency}>₦</Text>
                  <TextInput
                    style={styles.input}
                    value={monthlyStr}
                    onChangeText={setMonthlyStr}
                    keyboardType="number-pad"
                    placeholder="2500"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
                <Text style={styles.preview}>
                  {formatNaira(Number(monthlyStr) || 0)} / month
                </Text>
              </View>
              <View style={styles.priceField}>
                <Text style={styles.fieldLabel}>Yearly (NGN)</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.currency}>₦</Text>
                  <TextInput
                    style={styles.input}
                    value={yearlyStr}
                    onChangeText={setYearlyStr}
                    keyboardType="number-pad"
                    placeholder="25000"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
                <Text style={styles.preview}>
                  {formatNaira(Number(yearlyStr) || 0)} / year
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Yearly save badge (%)</Text>
              <View style={[styles.inputWrap, { maxWidth: 120 }]}>
                <TextInput
                  style={styles.input}
                  value={yearlySaveStr}
                  onChangeText={setYearlySaveStr}
                  keyboardType="number-pad"
                  placeholder="17"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
                <Text style={styles.currency}>%</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Promo banner</Text>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={plansState.promoTitle}
              onChangeText={(t) =>
                setPlansState((prev) => ({ ...prev, promoTitle: t }))
              }
              returnKeyType="next"
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Subtitle</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={plansState.promoSubtitle}
              onChangeText={(t) =>
                setPlansState((prev) => ({ ...prev, promoSubtitle: t }))
              }
              multiline
              textAlignVertical="top"
            />
          </View>

          <View
            style={styles.card}
            onLayout={(e) => {
              (styles as any)._basicY = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#F3F4F6" }]}>
                <Ionicons name="person-outline" size={18} color={GRAY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Basic plan</Text>
                <Text style={styles.cardHint}>Free · features list</Text>
              </View>
            </View>
            <Text style={styles.fieldLabel}>Tagline</Text>
            <TextInput
              style={styles.textInput}
              value={basic.tagline}
              onChangeText={(t) => updatePlan("basic", { tagline: t })}
              onFocus={() => scrollToInput((styles as any)._basicY ?? 0)}
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Features</Text>
            {basic.features.map((f, index) => (
              <View key={f.id} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                <TextInput
                  style={styles.featureInput}
                  value={f.label}
                  onChangeText={(t) => updateFeature("basic", f.id, t)}
                  onFocus={() =>
                    scrollToInput(((styles as any)._basicY ?? 0) + 120 + index * 48)
                  }
                  returnKeyType="done"
                  blurOnSubmit
                />
                <TouchableOpacity
                  onPress={() => removeFeature("basic", f.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addFeature("basic")}
            >
              <Ionicons name="add" size={18} color={GREEN} />
              <Text style={styles.addBtnText}>Add feature</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[styles.card, styles.proCard]}
            onLayout={(e) => {
              (styles as any)._proY = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="ribbon" size={18} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Pro plan</Text>
                <Text style={styles.cardHint}>
                  {formatNaira(Number(monthlyStr) || 0)}/mo ·{" "}
                  {formatNaira(Number(yearlyStr) || 0)}/yr
                </Text>
              </View>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            </View>
            <Text style={styles.fieldLabel}>Tagline</Text>
            <TextInput
              style={styles.textInput}
              value={pro.tagline}
              onChangeText={(t) => updatePlan("pro", { tagline: t })}
              onFocus={() => scrollToInput((styles as any)._proY ?? 400)}
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Features</Text>
            {pro.features.map((f, index) => (
              <View key={f.id} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                <TextInput
                  style={styles.featureInput}
                  value={f.label}
                  onChangeText={(t) => updateFeature("pro", f.id, t)}
                  onFocus={() =>
                    scrollToInput(((styles as any)._proY ?? 400) + 120 + index * 48)
                  }
                  returnKeyType="done"
                  blurOnSubmit
                />
                <TouchableOpacity
                  onPress={() => removeFeature("pro", f.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addFeature("pro")}
            >
              <Ionicons name="add" size={18} color={GREEN} />
              <Text style={styles.addBtnText}>Add feature</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savedFlash && styles.saveBtnDone]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons
              name={savedFlash ? "checkmark-circle" : "save-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.saveBtnText}>
              {savedFlash ? "Saved" : "Save subscription settings"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Changes apply to the user Subscription screen and dashboard Pro
            revenue.
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, marginBottom: 18 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  proCard: { borderColor: "#A7F3D0", backgroundColor: "#F0FDF4" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardHint: { fontSize: 12, color: GRAY, marginTop: 2 },
  popularBadge: {
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  priceRow: { flexDirection: "row", gap: 12 },
  priceField: { flex: 1 },
  fieldBlock: { marginTop: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GRAY,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  currency: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 10,
  },
  preview: { fontSize: 11, color: GRAY, marginTop: 4 },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  textArea: { minHeight: 72, textAlignVertical: "top" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  featureInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: GREEN },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveBtnDone: { backgroundColor: "#059669" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  footerNote: {
    fontSize: 12,
    color: GRAY,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 18,
  },
});
