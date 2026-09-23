import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getWalletSummary,
  listPaymentMethods,
  listTransactions,
  removePaymentMethod,
  type PaymentMethod,
  type WalletTransaction,
} from "@/services/wallet";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

export default function WalletPaymentMethods() {
  const [summary, setSummary] = useState(getWalletSummary);
  const [methods, setMethods] = useState(listPaymentMethods);
  const [transactions] = useState(listTransactions);
  const [hideBalance, setHideBalance] = useState(false);

  const refresh = useCallback(() => {
    setSummary(getWalletSummary());
    setMethods(listPaymentMethods());
  }, []);

  const onRemove = (pm: PaymentMethod) => {
    Alert.alert(
      "Remove method",
      `Remove ${pm.label} •••• ${pm.last4}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removePaymentMethod(pm.id);
            refresh();
          },
        },
      ],
    );
  };

  const formatNaira = (n: number) =>
    `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

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
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Ionicons name="shield-checkmark-outline" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View style={styles.balanceLeft}>
              <Ionicons name="wallet-outline" size={18} color="#D1FAE5" />
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
            </View>
            <TouchableOpacity
              onPress={() => setHideBalance((v) => !v)}
              hitSlop={10}
            >
              <Ionicons
                name={hideBalance ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#D1FAE5"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceAmount}>
            {hideBalance ? "••••••" : formatNaira(summary.balance)}
          </Text>
          <Text style={styles.balanceSub}>Available Balance</Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceActionBtn}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert("Withdraw", "Withdrawal flow will connect to backend later.")
              }
            >
              <Ionicons name="arrow-up-outline" size={16} color={PRIMARY} />
              <Text style={styles.balanceActionText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.balanceActionBtn, styles.balanceActionPrimary]}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert("Add Money", "Add money flow will connect to payment gateway later.")
              }
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={[styles.balanceActionText, { color: "#FFFFFF" }]}>
                Add Money
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={styles.sectionTitle}>Payment Methods</Text>

        <View style={styles.card}>
          <Text style={styles.groupLabel}>CARDS</Text>
          {methods
            .filter((m) => m.type === "card")
            .map((pm) => (
              <MethodRow key={pm.id} pm={pm} onRemove={() => onRemove(pm)} />
            ))}

          <Text style={[styles.groupLabel, { marginTop: 12 }]}>BANK ACCOUNTS</Text>
          {methods
            .filter((m) => m.type === "bank")
            .map((pm) => (
              <MethodRow key={pm.id} pm={pm} onRemove={() => onRemove(pm)} />
            ))}

          <TouchableOpacity
            style={styles.addMethodBtn}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                "Add payment method",
                "Card / bank linking will be wired to payment provider later.",
              )
            }
          >
            <Ionicons name="add" size={18} color={PRIMARY} />
            <Text style={styles.addMethodText}>Add new payment method</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {transactions.map((tx, i) => (
            <TxRow
              key={tx.id}
              tx={tx}
              last={i === transactions.length - 1}
              formatNaira={formatNaira}
            />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MethodRow({
  pm,
  onRemove,
}: {
  pm: PaymentMethod;
  onRemove: () => void;
}) {
  return (
    <View style={styles.methodRow}>
      <View style={styles.methodIcon}>
        {pm.type === "card" ? (
          <Ionicons name="card-outline" size={18} color={PRIMARY} />
        ) : (
          <MaterialCommunityIcons name="bank-outline" size={18} color={PRIMARY} />
        )}
      </View>
      <View style={styles.methodText}>
        <Text style={styles.methodLabel}>
          {pm.label} •••• {pm.last4}
        </Text>
        {pm.accountType ? (
          <Text style={styles.methodSub}>{pm.accountType}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={10}>
        <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

function TxRow({
  tx,
  last,
  formatNaira,
}: {
  tx: WalletTransaction;
  last: boolean;
  formatNaira: (n: number) => string;
}) {
  const isCredit = tx.type === "credit";
  const isWithdraw = tx.type === "withdrawal";

  return (
    <View style={[styles.txRow, last && { borderBottomWidth: 0 }]}>
      <View
        style={[
          styles.txIcon,
          {
            backgroundColor: isCredit
              ? LIGHT_GREEN
              : isWithdraw
                ? "#FEE2E2"
                : "#EEF2FF",
          },
        ]}
      >
        <Ionicons
          name={
            isCredit
              ? "arrow-down"
              : isWithdraw
                ? "arrow-up"
                : "arrow-up"
          }
          size={16}
          color={isCredit ? PRIMARY : isWithdraw ? "#EF4444" : "#4F46E5"}
        />
      </View>
      <View style={styles.txText}>
        <Text style={styles.txTitle}>{tx.title}</Text>
        <Text style={styles.txDate}>{tx.date}</Text>
      </View>
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmount,
            {
              color: isCredit
                ? PRIMARY
                : isWithdraw
                  ? "#EF4444"
                  : TEXT_DARK,
            },
          ]}
        >
          {isCredit ? "" : "-"}
          {formatNaira(tx.amount)}
        </Text>
        <Text style={styles.txStatus}>{tx.status === "successful" ? "Successful" : tx.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
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
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  balanceCard: {
    marginTop: 12,
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: 18,
  },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: "#D1FAE5",
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 10,
  },
  balanceSub: {
    fontSize: 12,
    color: "#A7F3D0",
    marginTop: 2,
  },
  balanceActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  balanceActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 11,
  },
  balanceActionPrimary: {
    backgroundColor: "#0F7A3A",
  },
  balanceActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  methodText: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  methodSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  addMethodBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
  },
  addMethodText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txText: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  txDate: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  txStatus: {
    fontSize: 11,
    color: PRIMARY,
    marginTop: 2,
  },
});
