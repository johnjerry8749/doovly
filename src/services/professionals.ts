
/**
 * Professionals service
 * ----------------------
 * Screens import ONLY from this file.
 *
 * REAL SUPABASE BACKEND:
 * - professionals      → professional account/business data
 * - profiles           → user name/profile data
 * - services           → professional services
 * - reviews            → professional reviews
 * - service_categories → service categories
 * - cities             → Nigerian cities

 */

import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabase";


/* =========================================================
   TYPES
   ========================================================= */

export type ProService = {
  id: string;
  name: string;
  description: string;
  price: string;
  priceValue: number;
  icon: string;
};

export type ProReview = {
  id: string;
  userId?: string;
  userName: string;
  comment: string;
  date?: string;
};

export type CompletedProject = {
  id: string;
  title?: string;
  description?: string;
  image?: string | ImageSourcePropType;
};

export type Professional = {
  id: string;
  userId?: string;

  name: string;
  profession: string;
  bio: string;
  city: string;

  priceFrom: string;
  priceFromValue: number;

  image: ImageSourcePropType | string;

  verified: boolean;
  isAvailable: boolean;
  subscribed: boolean;

  latitude?: number;
  longitude?: number;

  rating: number;
  reviewCount: number;

  email?: string;
  phone?: string;

  services: ProService[];
  portfolio: CompletedProject[];
  reviews: ProReview[];
};

export type ServiceCategory = {
  id?: string;
  name: string;
  icon: string;
  sort_order?: number;
};

export type CityOption = {
  name: string;
  sort_order: number;
};

export type ServiceInput = {
  name: string;
  description: string;
  price: string;
  icon?: string;
};

/* =========================================================
   DEFAULTS / SELECTS
   ========================================================= */

const DEFAULT_AVATAR = require("@/assets/images/icon.png");

const PROFESSIONAL_SELECT = `
  id,
  user_id,
  profession,
  bio,
  city,
  price_from,
  price_from_value,
  is_verified,
  is_available,
  subscribed,
  latitude,
  longitude,
  rating,
  review_count,
  avatar_url,
  email,
  phone,
  created_at
`;

const PROFILE_SELECT = `
  id,
  full_name,
  phone,
  email,
  avatar_url,
  city
`;

const SERVICE_SELECT = `
  id,
  professional_id,
  name,
  description,
  price,
  price_value,
  icon,
  created_at
`;

const REVIEW_SELECT = `
  id,
  professional_id,
  user_id,
  user_name,
  comment,
  display_date,
  created_at
`;

/* =========================================================
   DATABASE ROW TYPES
   ========================================================= */

type ProfessionalRow = {
  id: string;
  user_id: string;
  profession: string | null;
  bio: string | null;
  city: string | null;
  price_from: string | null;
  price_from_value: number | null;
  is_verified: boolean | null;
  is_available: boolean | null;
  subscribed: boolean | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  city: string | null;
};

type ServiceRow = {
  id: string;
  professional_id: string;
  name: string;
  description: string;
  price: string;
  price_value: number;
  icon: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  professional_id: string;
  user_id: string | null;
  user_name: string;
  comment: string;
  display_date: string | null;
  created_at: string;
};

type ServiceCategoryRow = {
  id: string;
  name: string;
  icon: string;
  sort_order: number | null;
};

type CityRow = {
  name: string;
  sort_order: number | null;
};

/* =========================================================
   HELPERS
   ========================================================= */

/**
 * Calculate distance between two coordinates in kilometres.
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/**
 * Existing Doovly star rule:
 * every 10 reviews = 1 star, maximum 5 stars.
 */
export function starsFromReviewCount(reviewCount: number): number {
  return Math.min(5, Math.floor(Math.max(0, reviewCount) / 10));
}

/**
 * Format Nigerian currency.
 */
function formatNaira(value: number): string {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

/**
 * Get avatar.
 */
function getAvatar(
  avatarUrl?: string | null,
): ImageSourcePropType | string {
  return avatarUrl?.trim() ? avatarUrl : DEFAULT_AVATAR;
}

/**
 * Map Supabase service row to app service.
 */
function mapService(row: ServiceRow): ProService {
  const priceValue = Number(row.price_value ?? 0);

  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    price: row.price?.trim() || formatNaira(priceValue),
    priceValue,
    icon: row.icon?.trim() || "briefcase-outline",
  };
}

/**
 * Map Supabase review row to app review.
 */
function mapReview(row: ReviewRow): ProReview {
  const displayDate =
    row.display_date?.trim() ||
    (row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : undefined);

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    userName: row.user_name?.trim() || "Anonymous",
    comment: row.comment ?? "",
    date: displayDate,
  };
}

/**
 * Map Supabase professional + profile data
 * to the existing app Professional shape.
 */
function mapProfessional(
  row: ProfessionalRow,
  profile: ProfileRow | undefined,
  services: ProService[],
  reviews: ProReview[],
): Professional {
  const priceFromValue = Number(row.price_from_value ?? 0);

  const reviewCount = Number(
    row.review_count ?? reviews.length,
  );

  const profileName =
    profile?.full_name?.trim() ||
    "Professional";

  const avatarUrl =
    row.avatar_url?.trim() ||
    profile?.avatar_url?.trim() ||
    null;

  const email =
    row.email?.trim() ||
    profile?.email?.trim() ||
    undefined;

  const phone =
    row.phone?.trim() ||
    profile?.phone?.trim() ||
    undefined;

  const city =
    row.city?.trim() ||
    profile?.city?.trim() ||
    "";

  return {
    id: row.id,

    userId: row.user_id,

    name: profileName,

    profession: row.profession?.trim() || "",

    bio: row.bio?.trim() || "",

    city,

    priceFrom:
      row.price_from?.trim() ||
      formatNaira(priceFromValue),

    priceFromValue,

    image: getAvatar(avatarUrl),

    verified: Boolean(row.is_verified),

    isAvailable: Boolean(row.is_available),

    subscribed: Boolean(row.subscribed),

    latitude:
      row.latitude !== null
        ? Number(row.latitude)
        : undefined,

    longitude:
      row.longitude !== null
        ? Number(row.longitude)
        : undefined,

    rating: Number(row.rating ?? 0),

    reviewCount,

    email,

    phone,

    services,

    /*
     * Portfolio will be connected when the real
     * professional portfolio table is created.
     */
    portfolio: [],

    reviews,
  };
}

/* =========================================================
   LOAD ALL PROFESSIONAL DATA
   ========================================================= */

/**
 * Loads professionals, profiles, services and reviews.
 *
 * This avoids making one Supabase request for every
 * professional relation.
 */
async function loadProfessionalData(): Promise<Professional[]> {
  const [
    professionalsResult,
    profilesResult,
    servicesResult,
    reviewsResult,
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select(PROFESSIONAL_SELECT)
      .order("created_at", { ascending: false }),

    supabase
      .from("profiles")
      .select(PROFILE_SELECT),

    supabase
      .from("services")
      .select(SERVICE_SELECT)
      .order("created_at", { ascending: true }),

    supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .order("created_at", { ascending: false }),
  ]);

  if (professionalsResult.error) {
    throw professionalsResult.error;
  }

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (servicesResult.error) {
    throw servicesResult.error;
  }

  if (reviewsResult.error) {
    throw reviewsResult.error;
  }

  const professionalRows =
    (professionalsResult.data ?? []) as ProfessionalRow[];

  const profileRows =
    (profilesResult.data ?? []) as ProfileRow[];

  const serviceRows =
    (servicesResult.data ?? []) as ServiceRow[];

  const reviewRows =
    (reviewsResult.data ?? []) as ReviewRow[];

  const profilesById = new Map<string, ProfileRow>();

  for (const profile of profileRows) {
    profilesById.set(profile.id, profile);
  }

  const servicesByProfessionalId =
    new Map<string, ProService[]>();

  for (const service of serviceRows) {
    const existing =
      servicesByProfessionalId.get(service.professional_id) ?? [];

    existing.push(mapService(service));

    servicesByProfessionalId.set(
      service.professional_id,
      existing,
    );
  }

  const reviewsByProfessionalId =
    new Map<string, ProReview[]>();

  for (const review of reviewRows) {
    const existing =
      reviewsByProfessionalId.get(review.professional_id) ?? [];

    existing.push(mapReview(review));

    reviewsByProfessionalId.set(
      review.professional_id,
      existing,
    );
  }

  return professionalRows.map((professional) => {
    const profile = profilesById.get(professional.user_id);

    const services =
      servicesByProfessionalId.get(professional.id) ?? [];

    const reviews =
      reviewsByProfessionalId.get(professional.id) ?? [];

    return mapProfessional(
      professional,
      profile,
      services,
      reviews,
    );
  });
}

/* =========================================================
   PROFESSIONALS
   ========================================================= */

/**
 * List all professionals.
 *
 * Home / Search.
 */
export async function listProfessionals(): Promise<Professional[]> {
  try {
    return await loadProfessionalData();
  } catch (error) {
    console.error("listProfessionals error:", error);
    throw error;
  }
}

/**
 * Filter professionals by city.
 *
 * "All Nigeria" and "Nigeria" return all professionals.
 *
 * Cities themselves come from the Supabase cities table.
 */
export async function listProfessionalsByCity(
  city: string,
): Promise<Professional[]> {
  const professionals = await listProfessionals();

  const key = city.trim().toLowerCase();

  if (
    !key ||
    key === "all nigeria" ||
    key === "nigeria"
  ) {
    return professionals;
  }

  return professionals.filter((professional) => {
    const professionalCity =
      professional.city.trim().toLowerCase();

    return professionalCity === key;
  });
}

/**
 * Get one professional by REAL Supabase UUID.
 *
 * Example:
 *
 * getProfessionalById(
 *   "a7c4e7c0-1234-4d8a-9f11-123456789abc"
 * );
 *
 * DO NOT pass old IDs such as:
 *
 * getProfessionalById("4")
 */
export async function getProfessionalById(
  id: string,
): Promise<Professional | undefined> {
  const professionalId = id.trim();

  if (!professionalId) {
    return undefined;
  }

  try {
    const { data, error } = await supabase
      .from("professionals")
      .select(PROFESSIONAL_SELECT)
      .eq("id", professionalId)
      .maybeSingle();

    if (error) {
      console.error("getProfessionalById error:", error);
      throw error;
    }

    if (!data) {
      return undefined;
    }

    const professional =
      data as ProfessionalRow;

    const [profileResult, servicesResult, reviewsResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(PROFILE_SELECT)
          .eq("id", professional.user_id)
          .maybeSingle(),

        supabase
          .from("services")
          .select(SERVICE_SELECT)
          .eq("professional_id", professional.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("reviews")
          .select(REVIEW_SELECT)
          .eq("professional_id", professional.id)
          .order("created_at", { ascending: false }),
      ]);

    if (profileResult.error) {
      throw profileResult.error;
    }

    if (servicesResult.error) {
      throw servicesResult.error;
    }

    if (reviewsResult.error) {
      throw reviewsResult.error;
    }

    const profile =
      profileResult.data as ProfileRow | null;

    const services =
      (servicesResult.data ?? []).map((row) =>
        mapService(row as ServiceRow),
      );

    const reviews =
      (reviewsResult.data ?? []).map((row) =>
        mapReview(row as ReviewRow),
      );

    return mapProfessional(
      professional,
      profile ?? undefined,
      services,
      reviews,
    );
  } catch (error) {
    console.error("getProfessionalById error:", error);
    throw error;
  }
}

/* =========================================================
   SERVICE CATEGORIES
   ========================================================= */

/**
 * Get service categories from Supabase.
 *
 * "All" is UI-only and is not stored in the database.
 */
export async function listServiceCategories(): Promise<
  ServiceCategory[]
> {
  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(
      "listServiceCategories error:",
      error,
    );

    throw error;
  }

  const rows =
    (data ?? []) as ServiceCategoryRow[];

  return [
    {
      name: "All",
      icon: "apps",
    },

    ...rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon || "briefcase-outline",
      sort_order: Number(row.sort_order ?? 0),
    })),
  ];
}

/* =========================================================
   CITIES
   ========================================================= */

/**
 * Get all cities directly from Supabase.
 *
 * No NIGERIA_CITIES constant.
 * No local city fallback.
 */
export async function listCities(): Promise<CityOption[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("name, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listCities error:", error);
    throw error;
  }

  const rows = (data ?? []) as CityRow[];

  return rows.map((row) => ({
    name: row.name,
    sort_order: Number(row.sort_order ?? 0),
  }));
}

/* =========================================================
   REVIEWS
   ========================================================= */

/**
 * Add a review for a professional.
 *
 * professionalId MUST be the real professionals.id UUID.
 */
export async function addReview(
  professionalId: string,
  payload: {
    userName: string;
    comment: string;
    userId?: string;
  },
): Promise<ProReview> {
  const cleanProfessionalId =
    professionalId.trim();

  if (!cleanProfessionalId) {
    throw new Error("Professional ID is required.");
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const authenticatedUserId =
    authData.user?.id;

  if (!authenticatedUserId) {
    throw new Error(
      "You must be signed in to add a review.",
    );
  }

  const userName =
    payload.userName.trim() || "Anonymous";

  const comment =
    payload.comment.trim();

  if (!comment) {
    throw new Error(
      "Review comment cannot be empty.",
    );
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      professional_id: cleanProfessionalId,
      user_id: authenticatedUserId,
      user_name: userName,
      comment,
      display_date: new Date().toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      ),
    })
    .select(REVIEW_SELECT)
    .single();

  if (error) {
    console.error("addReview error:", error);
    throw error;
  }

  return mapReview(data as ReviewRow);
}

/* =========================================================
   MY SERVICES
   ========================================================= */

/**
 * List services belonging to a professional.
 *
 * professionalId MUST be the real professionals.id UUID.
 */
export async function listMyServices(
  professionalId: string,
): Promise<ProService[]> {
  const cleanProfessionalId =
    professionalId.trim();

  if (!cleanProfessionalId) {
    return [];
  }

  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("professional_id", cleanProfessionalId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listMyServices error:", error);
    throw error;
  }

  return (data ?? []).map((row) =>
    mapService(row as ServiceRow),
  );
}

/**
 * Create a service.
 *
 * professionalId MUST be the real professionals.id UUID.
 */
export async function createMyService(
  professionalId: string,
  input: ServiceInput,
): Promise<ProService> {
  const cleanProfessionalId =
    professionalId.trim();

  if (!cleanProfessionalId) {
    throw new Error(
      "Professional ID is required.",
    );
  }

  const name = input.name.trim();

  const description =
    input.description.trim();

  const rawPrice =
    input.price.trim();

  const icon =
    input.icon?.trim() ||
    "briefcase-outline";

  if (!name) {
    throw new Error(
      "Service name is required.",
    );
  }

  if (!rawPrice) {
    throw new Error(
      "Service price is required.",
    );
  }

  const priceValue =
    Number(
      rawPrice.replace(/[^0-9.]/g, ""),
    ) || 0;

  const formattedPrice =
    rawPrice.startsWith("₦")
      ? rawPrice
      : formatNaira(priceValue);

  const { data, error } = await supabase
    .from("services")
    .insert({
      professional_id: cleanProfessionalId,
      name,
      description,
      price: formattedPrice,
      price_value: priceValue,
      icon,
    })
    .select(SERVICE_SELECT)
    .single();

  if (error) {
    console.error(
      "createMyService error:",
      error,
    );

    throw error;
  }

  return mapService(data as ServiceRow);
}

/**
 * Update a service.
 *
 * professionalId MUST be the real professionals.id UUID.
 */
export async function updateMyService(
  professionalId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<ProService | null> {
  const cleanProfessionalId =
    professionalId.trim();

  const cleanServiceId =
    serviceId.trim();

  if (!cleanProfessionalId) {
    throw new Error(
      "Professional ID is required.",
    );
  }

  if (!cleanServiceId) {
    throw new Error(
      "Service ID is required.",
    );
  }

  const name = input.name.trim();

  const description =
    input.description.trim();

  const rawPrice =
    input.price.trim();

  if (!name) {
    throw new Error(
      "Service name is required.",
    );
  }

  if (!rawPrice) {
    throw new Error(
      "Service price is required.",
    );
  }

  const priceValue =
    Number(
      rawPrice.replace(/[^0-9.]/g, ""),
    ) || 0;

  const formattedPrice =
    rawPrice.startsWith("₦")
      ? rawPrice
      : formatNaira(priceValue);

  const updatePayload: {
    name: string;
    description: string;
    price: string;
    price_value: number;
    icon?: string;
  } = {
    name,
    description,
    price: formattedPrice,
    price_value: priceValue,
  };

  if (input.icon?.trim()) {
    updatePayload.icon =
      input.icon.trim();
  }

  const { data, error } = await supabase
    .from("services")
    .update(updatePayload)
    .eq("id", cleanServiceId)
    .eq(
      "professional_id",
      cleanProfessionalId,
    )
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    console.error(
      "updateMyService error:",
      error,
    );

    throw error;
  }

  if (!data) {
    return null;
  }

  return mapService(data as ServiceRow);
}

/**
 * Delete a service.
 *
 * professionalId MUST be the real professionals.id UUID.
 */
export async function deleteMyService(
  professionalId: string,
  serviceId: string,
): Promise<boolean> {
  const cleanProfessionalId =
    professionalId.trim();

  const cleanServiceId =
    serviceId.trim();

  if (
    !cleanProfessionalId ||
    !cleanServiceId
  ) {
    return false;
  }

  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", cleanServiceId)
    .eq(
      "professional_id",
      cleanProfessionalId,
    )
    .select("id");

  if (error) {
    console.error(
      "deleteMyService error:",
      error,
    );

    throw error;
  }

  return Boolean(data?.length);
}

