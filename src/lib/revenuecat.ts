/**
 * RevenueCat integration for Doovly.
 *
 * Pro subscriptions are purchased from the current RevenueCat offering.
 * Service promotions are non-subscription products and are fulfilled by the
 * Supabase RevenueCat webhook. Prices always come from RevenueCat.
 */
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

const REVENUECAT_TEST_STORE_API_KEY =
  "test_EoROVstxqPGDHoriXKHBqOoyWQQ";
const REVENUECAT_APPLE_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? "";
const REVENUECAT_GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? "";

export const PRO_ENTITLEMENT = "doovly_pro";

export const PRO_PACKAGE_IDS = {
  monthly: "$rc_monthly",
  yearly: "$rc_annual",
} as const;

// RevenueCat offering identifier for Doovly service-promotion products.
export const BOOST_OFFERING_ID = "ofrng393361aa3d";

export const BOOST_PRODUCT_IDS = [
  "boost_2days",
  "boost_5days",
  "boost_14days",
  "boost_30days",
] as const;

let configured = false;
let configurePromise: Promise<void> | null = null;
let configuredAppUserId: string | null = null;
let cachedProEntitlement = false;

function getApiKey(): string {
  if (__DEV__) return REVENUECAT_TEST_STORE_API_KEY;
  return Platform.OS === "ios"
    ? REVENUECAT_APPLE_API_KEY
    : REVENUECAT_GOOGLE_API_KEY;
}

async function configureRevenueCat(appUserId?: string | null): Promise<void> {
  if (configurePromise) await configurePromise;

  if (configured) {
    if (appUserId && appUserId !== configuredAppUserId) {
      await Purchases.logIn(appUserId);
      configuredAppUserId = appUserId;
    } else if (!appUserId && configuredAppUserId) {
      await Purchases.logOut();
      configuredAppUserId = null;
      cachedProEntitlement = false;
    }
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "RevenueCat is not configured. Add the Test Store key for development or the platform key for production.",
    );
  }

  configurePromise = (async () => {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.INFO);
    await Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    });
    configured = true;
    configuredAppUserId = appUserId ?? null;
    cachedProEntitlement = false;
  })()
    .catch((error) => {
      configured = false;
      configuredAppUserId = null;
      throw error;
    })
    .finally(() => {
      configurePromise = null;
    });

  await configurePromise;
}

export async function initRevenueCat(appUserId?: string | null): Promise<void> {
  try {
    await configureRevenueCat(appUserId);
  } catch (error) {
    console.warn("[RevenueCat] configure failed:", error);
  }
}

async function ensureRevenueCatConfigured(): Promise<void> {
  if (!configured) await configureRevenueCat();
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  await ensureRevenueCatConfigured();
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export async function getProPackages(): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
}> {
  const offering = await getOfferings();
  return {
    monthly:
      offering?.availablePackages.find(
        (pkg) => pkg.identifier === PRO_PACKAGE_IDS.monthly,
      ) ?? null,
    yearly:
      offering?.availablePackages.find(
        (pkg) => pkg.identifier === PRO_PACKAGE_IDS.yearly,
      ) ?? null,
  };
}

export async function getBoostPackages(): Promise<PurchasesPackage[]> {
  await ensureRevenueCatConfigured();

  const offerings = await Purchases.getOfferings();
  const packages =
    offerings.all[BOOST_OFFERING_ID]?.availablePackages ?? [];

  return packages
    .filter((pkg) =>
      BOOST_PRODUCT_IDS.includes(
        pkg.product.identifier as (typeof BOOST_PRODUCT_IDS)[number],
      ),
    )
    .sort((a, b) => a.product.price - b.product.price);
}

export async function getBoostPackage(
  productId: string,
): Promise<PurchasesPackage | null> {
  const packages = await getBoostPackages();
  return packages.find((pkg) => pkg.product.identifier === productId) ?? null;
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  await ensureRevenueCatConfigured();
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function purchaseBoostPackage(
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
    const info = await Purchases.getCustomerInfo();
    cachedProEntitlement = hasProEntitlement(info);
    return info;
  } catch (error) {
    console.warn("[RevenueCat] getCustomerInfo failed:", error);
    return null;
  }
}

export function hasProEntitlement(
  info: CustomerInfo | null | undefined,
): boolean {
  return Boolean(info?.entitlements.active[PRO_ENTITLEMENT]);
}

export async function isProFromRevenueCat(): Promise<boolean> {
  return hasProEntitlement(await getCustomerInfo());
}

export function isProEntitlementCached(): boolean {
  return cachedProEntitlement;
}

export async function setPurchaseContext(
  attributes: Record<string, string>,
): Promise<void> {
  await ensureRevenueCatConfigured();
  await Purchases.setAttributes(attributes);
  await Purchases.syncAttributesAndOfferingsIfNeeded();
}

export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  const wrappedListener = (info: CustomerInfo) => {
    cachedProEntitlement = hasProEntitlement(info);
    listener(info);
  };

  Purchases.addCustomerInfoUpdateListener(wrappedListener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(wrappedListener);
  };
}
