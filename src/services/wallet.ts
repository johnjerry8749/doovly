/**
 * Wallet & payment methods service
 * --------------------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock in-memory data
 * LATER → swap bodies to apiRequest("/wallet", "/payment-methods", etc.)
 */

export type PaymentMethod = {
  id: string;
  type: "card" | "bank";
  label: string;
  last4: string;
  brand?: string;
  bankName?: string;
  accountType?: string;
};

export type WalletTransaction = {
  id: string;
  type: "credit" | "debit" | "withdrawal";
  title: string;
  amount: number;
  status: "successful" | "pending" | "failed";
  date: string;
};

export type WalletSummary = {
  balance: number;
  currency: string;
};

// =====================================================
// MOCK DATA
// =====================================================

let mockBalance = 12450;

let mockPaymentMethods: PaymentMethod[] = [
  {
    id: "pm1",
    type: "card",
    label: "Visa",
    last4: "4242",
    brand: "visa",
  },
  {
    id: "pm2",
    type: "card",
    label: "Mastercard",
    last4: "8888",
    brand: "mastercard",
  },
  {
    id: "pm3",
    type: "bank",
    label: "GTBank",
    last4: "1234",
    bankName: "GTBank",
    accountType: "Savings Account",
  },
];

const mockTransactions: WalletTransaction[] = [
  {
    id: "t1",
    type: "credit",
    title: "Added Money",
    amount: 5000,
    status: "successful",
    date: "May 24, 2025 · 10:24 AM",
  },
  {
    id: "t2",
    type: "debit",
    title: "Payment to Shoprite",
    amount: 3250,
    status: "successful",
    date: "May 23, 2025 · 03:15 PM",
  },
  {
    id: "t3",
    type: "withdrawal",
    title: "Withdrawal to GTBank",
    amount: 2000,
    status: "successful",
    date: "May 22, 2025 · 11:08 AM",
  },
  {
    id: "t4",
    type: "credit",
    title: "Added Money",
    amount: 10000,
    status: "successful",
    date: "May 21, 2025 · 09:45 AM",
  },
];

// =====================================================
// API-SHAPED FUNCTIONS
// =====================================================

/** NOW → mock | LATER → GET /wallet */
export function getWalletSummary(): WalletSummary {
  // TODO backend: return apiRequest<WalletSummary>("/wallet")
  return { balance: mockBalance, currency: "NGN" };
}

/** NOW → mock | LATER → GET /payment-methods */
export function listPaymentMethods(): PaymentMethod[] {
  // TODO backend: return apiRequest<PaymentMethod[]>("/payment-methods")
  return [...mockPaymentMethods];
}

/** NOW → mock | LATER → GET /wallet/transactions */
export function listTransactions(limit = 20): WalletTransaction[] {
  // TODO backend: return apiRequest(`/wallet/transactions?limit=${limit}`)
  return mockTransactions.slice(0, limit);
}

/** NOW → mock | LATER → DELETE /payment-methods/:id */
export async function removePaymentMethod(id: string): Promise<boolean> {
  // TODO backend: await apiRequest(`/payment-methods/${id}`, { method: "DELETE" })
  await new Promise((r) => setTimeout(r, 300));
  const before = mockPaymentMethods.length;
  mockPaymentMethods = mockPaymentMethods.filter((m) => m.id !== id);
  return mockPaymentMethods.length < before;
}

/** NOW → mock | LATER → POST /wallet/add-money */
export async function addMoney(amount: number): Promise<WalletSummary> {
  // TODO backend: return apiRequest("/wallet/add-money", { method: "POST", body: ... })
  await new Promise((r) => setTimeout(r, 500));
  mockBalance += amount;
  return getWalletSummary();
}
