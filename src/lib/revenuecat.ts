/**
 * RevenueCat helpers for Doovly subscriptions.
 * Requires a development build (Expo Go is not supported).
 *
 * Set keys in .env:
 *   EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY
 *   EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY
 */
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
  type PurchasesOffering,
} from "react-native-purchases";

const APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? "";
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? "";

/** Entitlement identifier configured in the RevenueCat dashboard */
export const PRO_ENTITLEMENT = "pro";

let configured = false;

export async function initRevenueCat(appUserId?: string | null) {
  if (configured) {
    if (appUserId) {
      try {
        await Purchases.logIn(appUserId);
      } catch (e) {
        console.warn("[RevenueCat] logIn failed:", e);
      }
    }
    return;
  }

  const apiKey = Platform.OS === "ios" ? APPLE_KEY : GOOGLE_KEY;
  if (!apiKey) {
    if (__DEV__) {
      console.warn(
        "[RevenueCat] Missing API key. Set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY / EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY",
      );
    }
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);
    await Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    });
    configured = true;
  } catch (e) {
    console.warn("[RevenueCat] configure failed:", e);
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.warn("[RevenueCat] getOfferings failed:", e);
    return null;
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo failed:", e);
    return null;
  }
}

export function hasProEntitlement(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return !!info.entitlements.active[PRO_ENTITLEMENT];
}

export async function isProFromRevenueCat(): Promise<boolean> {
  const info = await getCustomerInfo();
  return hasProEntitlement(info);
}
