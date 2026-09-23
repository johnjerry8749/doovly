import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getVerificationStatus,
  uploadVerificationStep,
  submitVerification,
  type VerificationState,
  type VerificationStepStatus,
} from "@/services/profile";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const STATUS_LABEL: Record<VerificationStepStatus, string> = {
  pending: "Pending",
  uploaded: "Uploaded",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<VerificationStepStatus, string> = {
  pending: "#6B7280",
  uploaded: "#D97706",
  approved: PRIMARY,
  rejected: "#EF4444",
};

export default function Verification() {
  const [state, setState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    // TODO backend: async fetch
    setState(getVerificationStatus());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (step: "governmentId" | "selfie" | "certificate") => {
    setBusyStep(step);
    try {
      const next = await uploadVerificationStep(step);
      setState(next);
    } catch {
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setBusyStep(null);
    }
  };

  const onSubmit = async () => {
    if (!state) return;
    if (state.governmentId === "pending" || state.selfie === "pending") {
      Alert.alert(
        "Incomplete",
        "Please upload Government ID and Selfie before submitting.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const next = await submitVerification();
      setState(next);
      Alert.alert(
        "Submitted",
        "Your documents are under review. We usually respond within 24–48 hours.",
      );
    } catch {
      Alert.alert("Error", "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !state) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const isVerified = state.overall === "verified";
  const underReview = state.overall === "under_review";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Status banner */}
        <View
          style={[
            styles.statusBanner,
            isVerified && styles.statusBannerSuccess,
            underReview && styles.statusBannerReview,
          ]}
        >
          <Ionicons
            name={
              isVerified
                ? "shield-checkmark"
                : underReview
                  ? "time-outline"
                  : "shield-outline"
            }
            size={22}
            color={isVerified ? PRIMARY : underReview ? "#D97706" : PRIMARY}
          />
          <View style={styles.statusTextCol}>
            <Text style={styles.statusTitle}>
              {isVerified
                ? "Verified"
                : underReview
                  ? "Under Review"
                  : "Not Verified"}
            </Text>
            <Text style={styles.statusSub}>
              {isVerified
                ? "Your account is verified. Clients can trust your profile."
                : underReview
                  ? "We are reviewing your documents. This usually takes 24–48 hours."
                  : "Please complete all steps and submit for review."}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          <StepDot label="Start" done />
          <View style={styles.progressLine} />
          <StepDot
            label="In Progress"
            done={underReview || isVerified}
            active={!isVerified && !underReview}
          />
          <View style={styles.progressLine} />
          <StepDot label="Submit" done={isVerified} />
        </View>

        {/* Steps */}
        <StepCard
          number={1}
          icon="card-outline"
          title="Government ID"
          description="Upload a valid government-issued ID card."
          status={state.governmentId}
          busy={busyStep === "governmentId"}
          onAction={() => onUpload("governmentId")}
          actionLabel="Upload ID Card"
          actionIcon="cloud-upload-outline"
          disabled={isVerified}
        />

        <StepCard
          number={2}
          icon="scan-outline"
          title="Selfie / Face Verification"
          description="Take a selfie for face verification."
          status={state.selfie}
          busy={busyStep === "selfie"}
          onAction={() => onUpload("selfie")}
          actionLabel="Take Selfie"
          actionIcon="camera-outline"
          disabled={isVerified}
        />

        <StepCard
          number={3}
          icon="ribbon-outline"
          title="Professional Certificate"
          description="Upload your professional certificate or qualification."
          status={state.certificate}
          busy={busyStep === "certificate"}
          onAction={() => onUpload("certificate")}
          actionLabel="Upload Certificate"
          actionIcon="cloud-upload-outline"
          optional
          disabled={isVerified}
        />

        {!isVerified && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={onSubmit}
            activeOpacity={0.85}
            disabled={submitting || underReview}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {underReview ? "Submitted for Review" : "Submit for Review"}
                </Text>
                {!underReview && (
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                )}
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StepDot({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <View style={styles.stepDotCol}>
      <View
        style={[
          styles.stepDot,
          done && styles.stepDotDone,
          active && styles.stepDotActive,
        ]}
      >
        {done ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : (
          <View style={styles.stepDotInner} />
        )}
      </View>
      <Text style={styles.stepDotLabel}>{label}</Text>
    </View>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
  status,
  busy,
  onAction,
  actionLabel,
  actionIcon,
  optional,
  disabled,
}: {
  number: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  status: VerificationStepStatus;
  busy: boolean;
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ComponentProps<typeof Ionicons>["name"];
  optional?: boolean;
  disabled?: boolean;
}) {
  const done = status === "uploaded" || status === "approved";

  return (
    <View style={styles.stepCard}>
      <View style={styles.stepCardHeader}>
        <View style={styles.stepIcon}>
          <Ionicons name={icon} size={20} color={PRIMARY} />
        </View>
        <View style={styles.stepCardText}>
          <Text style={styles.stepTitle}>
            {number}. {title}
            {optional ? (
              <Text style={styles.optional}> (Optional)</Text>
            ) : null}
          </Text>
          <Text style={styles.stepDesc}>{description}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLOR[status] + "18" },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[status] }]}>
            {STATUS_LABEL[status]}
          </Text>
        </View>
      </View>

      {!disabled && !done && (
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={onAction}
          activeOpacity={0.8}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <>
              <Ionicons name={actionIcon} size={18} color={PRIMARY} />
              <Text style={styles.uploadBtnText}>{actionLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {done && (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />
          <Text style={styles.doneText}>
            {status === "approved" ? "Approved" : "Uploaded successfully"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  statusBannerSuccess: {
    backgroundColor: "#DCFCE7",
  },
  statusBannerReview: {
    backgroundColor: "#FEF3C7",
  },
  statusTextCol: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  statusSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 3,
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 22,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 6,
  },
  stepDotCol: {
    alignItems: "center",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    backgroundColor: PRIMARY,
  },
  stepDotActive: {
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: "#FFFFFF",
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
  },
  stepDotLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  stepCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCardText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  optional: {
    fontWeight: "400",
    color: TEXT_MUTED,
    fontSize: 13,
  },
  stepDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 3,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  uploadBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 11,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },
  doneRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  doneText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
