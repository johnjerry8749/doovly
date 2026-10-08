/**
 * RevenueCat helpers for Doovly subscriptions and service promotion.
 *
 * Development:
 * - RevenueCat Test Store API key is used for both iOS and Android.
 *
 * Production:
 * - Set platform-specific EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY /
 *   EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY.
 *
 * Test Store is development-only. Never ship the test key in a release build.
 */
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOffering,
} from "react-native-purchases";

const TEST_STORE_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ??
  "test_EoROVstxqPGDHoriXKHBqOoyWQQ";

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? "";
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? "";

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = "pro";

/** RevenueCat product identifiers supplied for the current Test Store setup. */
export const REVENUECAT_PRODUCTS = {
  proYearly: "prod393e52028e",
  proMonthly: "prod86278c9fdf",
  promotion: "prod406f177b8e",
} as const;

let configured = false;
let configurePromise: Promise<void> | null = null;
let configuredAppUserId: string | null = null;

function getApiKey(): string {
  if (__DEV__) {
    // Test Store is intentionally used for local/development testing.
    return TEST_STORE_KEY;
  }

  return Platform.OS === "ios" ? APPLE_KEY : GOOGLE_KEY;
}

async function configureRevenueCat(appUserId?: string | null): Promise<void> {
  if (configured) {
    if (appUserId && appUserId !== configuredAppUserId) {
      try {
        await Purchases.logIn(appUserId);
        configuredAppUserId = appUserId;
      } catch (e) {
        console.warn("[RevenueCat] logIn failed:", e);
      }
    }
    return;
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "RevenueCat is not configured. Add the Test Store API key for development or the platform API key for production.",
    );
  }

  if (!configurePromise) {
    configurePromise = (async () => {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);

      await Purchases.configure({
        apiKey,
        appUserID: appUserId ?? undefined,
      });

      configured = true;
      configuredAppUserId = appUserId ?? null;
    })().catch((error) => {
      configured = false;
      configuredAppUserId = null;
      throw error;
    }).finally(() => {
      configurePromise = null;
    });
  }

  await configurePromise;
}

export async function initRevenueCat(appUserId?: string | null): Promise<void> {
  try {
    await configureRevenueCat(appUserId);
  } catch (e) {
    console.warn("[RevenueCat] configure failed:", e);
  }
}

async function ensureRevenueCatConfigured(): Promise<void> {
  if (configured) return;
  await configureRevenueCat();
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    await ensureRevenueCatConfigured();
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.warn("[RevenueCat] getOfferings failed:", e);
    return null;
  }
}

export async function setPurchaseContext(
  attributes: Record<string, string>,
): Promise<void> {
  await ensureRevenueCatConfigured();
  await Purchases.setAttributes(attributes);
  await Purchases.syncAttributesAndOfferingsIfNeeded();
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  await ensureRevenueCatConfigured();
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  await ensureRevenueCatConfigured();
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    await ensureRevenueCatConfigured();
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo failed:", e);
    return null;
  }
}

export function hasProEntitlement(
  info: CustomerInfo | null | undefined,
): boolean {
  if (!info) return false;
  return !!info.entitlements.active[PRO_ENTITLEMENT];
}

export async function isProFromRevenueCat(): Promise<boolean> {
  const info = await getCustomerInfo();
  return hasProEntitlement(info);
}
