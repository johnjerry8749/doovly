/**
 * Map Supabase rows → app types used by screens.
 * Keep shapes identical so UI / CSS / layout stay untouched.
 */

import type { ImageSourcePropType } from "react-native";
import type {
  Professional,
  ProService,
  ProReview,
  CompletedProject,
} from "@/services/professionals";
import type { Booking } from "@/services/bookings";
import type { Notification, NotifType } from "@/data/notifications";
import type {
  ServiceRequest,
  ServiceRequestComment,
  ServiceRequestIcon,
} from "@/data/serviceRequests";
import { bookingStatusToApp, resolveImageSource } from "@/lib/mappers";

const FALLBACK_AVATAR = require("@/assets/profile_1.jpg");

function asImage(source: ReturnType<typeof resolveImageSource>): ImageSourcePropType {
  if (source == null) return FALLBACK_AVATAR;
  return source as ImageSourcePropType;
}

function publicId(
  _entity:
    | "professional"
    | "user"
    | "booking"
    | "serviceRequest"
    | "conversation",
  _legacyId: string | null | undefined,
  uuid: string,
): string {
  return uuid;
}

export function mapServiceRow(row: {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  price_value?: number | null;
  icon?: string | null;
}): ProService {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    priceValue: Number(row.price_value ?? 0),
    icon: row.icon ?? "briefcase-outline",
  };
}

export function mapReviewRow(row: {
  id: string;
  user_id?: string | null;
  user_name: string;
  comment: string;
  display_date?: string | null;
  created_at?: string | null;
}): ProReview {
  const date =
    row.display_date ??
    (row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "");

  return {
    id: row.id,
    userId: row.user_id ? publicId("user", null, row.user_id) : undefined,
    userName: row.user_name,
    comment: row.comment,
    date,
  };
}

export function mapPortfolioRow(row: {
  id: string;
  description?: string | null;
  image_key?: string | null;
  image_url?: string | null;
}): CompletedProject {
  return {
    id: row.id,
    description: row.description ?? "",
    image: asImage(resolveImageSource(row.image_url, row.image_key)) as number,
  };
}

export function mapProfessionalRow(row: any): Professional {
  const profile = row.profiles;
  const image = asImage(
    resolveImageSource(
      row.avatar_url ?? profile?.avatar_url,
      row.avatar_key,
    ),
  );

  return {
    id: publicId("professional", row.id, row.id),
    userId: row.user_id ?? undefined,
    name: profile?.full_name ?? "Professional",
    profession: row.profession,
    city: row.city,
    priceFrom: row.price_from,
    image: image as number,
    verified: Boolean(row.is_verified),
    subscribed: Boolean(row.subscribed),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    role: profile?.role ?? "user",
    email: row.email ?? profile?.email ?? "",
    phone: row.phone ?? profile?.phone ?? "",
    bio: row.bio ?? undefined,
    services: (row.services ?? []).map(mapServiceRow),
    portfolio: (row.portfolio_items ?? []).map(mapPortfolioRow),
    reviews: (row.reviews ?? []).map(mapReviewRow),
  };
}

export const PROFESSIONAL_SELECT = `
  id,
  user_id,
  profession,
  bio,
  city,
  price_from,
  is_verified,
  subscribed,
  latitude,
  longitude,
  email,
  phone,
  avatar_url,
  avatar_key,
  profiles!professionals_user_id_fkey (
    full_name,
    email,
    phone,
    role,
    avatar_url
  ),
  services (
    id,
    name,
    description,
    price,
    price_value,
    icon
  ),
  reviews (
    id,
    user_id,
    user_name,
    comment,
    display_date,
    created_at
  ),
  portfolio_items (
    id,
    description,
    image_key,
    image_url
  )
`;

export function mapBookingRow(row: any): Booking {
  const pro = row.professionals;
  const customer = row.customer;

  const proImage = asImage(
    resolveImageSource(
      pro?.avatar_url ?? pro?.profiles?.avatar_url,
      pro?.avatar_key,
    ),
  );
  const customerImage = asImage(
    resolveImageSource(customer?.avatar_url, null),
  );

  const date =
    row.display_date ??
    (row.scheduled_at
      ? new Date(row.scheduled_at).toLocaleString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "");

  return {
    id: publicId("booking", row.id, row.id),
    professionalId: publicId(
      "professional",
      pro?.id,
      row.professional_id,
    ),
    customerId: publicId("user", customer?.id, row.customer_id),
    title: row.title,
    professionalName:
      row.professional_name ?? pro?.profiles?.full_name ?? "Professional",
    professionalVerified: Boolean(
      row.professional_verified ?? pro?.is_verified,
    ),
    professionalImage: proImage as number,
    customerName: row.customer_name ?? customer?.full_name ?? "Customer",
    customerImage: customerImage as number,
    rating: Number(row.rating ?? 0),
    reviews: Number(row.reviews_count ?? 0),
    date,
    location: row.location ?? "",
    status: bookingStatusToApp(row.status),
    amount: row.amount != null ? Number(row.amount) : undefined,
  };
}

export const BOOKING_SELECT = `
  id,
  mock_id,
  customer_id,
  professional_id,
  title,
  professional_name,
  customer_name,
  professional_verified,
  status,
  amount,
  location,
  display_date,
  scheduled_at,
  rating,
  reviews_count,
  professionals (
    is_verified,
    avatar_url,
    avatar_key,
    profiles!professionals_user_id_fkey ( full_name, avatar_url )
  )
`;

export function mapNotificationRow(row: any): Notification {
  const avatar = resolveImageSource(row.avatar_url, null);
  return {
    id: row.id,
    userId: publicId("user", null, row.user_id),
    type: (row.type as NotifType) || "general",
    title: row.title,
    body: row.body,
    time:
      row.time_label ??
      (row.created_at ? new Date(row.created_at).toLocaleString() : ""),
    unread: Boolean(row.unread ?? true),
    avatar: avatar == null ? null : (avatar as number),
  };
}

export function mapServiceRequestComment(row: any): ServiceRequestComment {
  return {
    id: row.id,
    userId: row.user_id ? publicId("user", null, row.user_id) : "",
    authUserId: row.user_id ?? undefined,
    userName: row.user_name,
    userAvatar: asImage(resolveImageSource(row.user_avatar_url, null)),
    text: row.text,
    timeAgo: row.time_ago ?? "Just now",
  };
}

export function mapServiceRequestRow(row: any): ServiceRequest {
  const imageSources =
    (row.images && row.images.length > 0
      ? row.images.map((u: string) => asImage(resolveImageSource(u, null)))
      : null) ??
    (row.image_keys ?? []).map((k: string) =>
      asImage(resolveImageSource(null, k)),
    );

  return {
    id: publicId("serviceRequest", row.id, row.id),
    title: row.title,
    category: row.category,
    profession: row.profession,
    location: row.location,
    city: row.city,
    timeAgo: row.time_ago ?? "",
    icon: (row.icon as ServiceRequestIcon) || "briefcase-outline",
    iconBackground: row.icon_background ?? "#E8F5E9",
    images: imageSources.length > 0 ? imageSources : [FALLBACK_AVATAR],
    description: row.description ?? "",
    isNew: Boolean(row.is_new ?? true),
    createdByUserId: row.created_by
      ? publicId("user", null, row.created_by)
      : "",
    posterName: row.poster_name,
    posterAvatar: asImage(resolveImageSource(row.poster_avatar_url, null)),
    posterVerified: Boolean(row.poster_verified),
    likesCount: Number(row.likes_count ?? 0),
    maxOffers: Number(row.max_offers ?? 5),
    offersCount: Number(row.offers_count ?? 0),
    offeredByUserIds: (row.offered_by ?? []).map((uid: string) =>
      publicId("user", null, uid),
    ),
    comments: (row.service_request_comments ?? []).map(
      mapServiceRequestComment,
    ),
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}

export const SERVICE_REQUEST_SELECT = `
  id,
  mock_id,
  title,
  category,
  profession,
  location,
  city,
  description,
  icon,
  icon_background,
  images,
  image_keys,
  time_ago,
  is_new,
  created_by,
  poster_name,
  poster_avatar_url,
  poster_verified,
  likes_count,
  max_offers,
  offers_count,
  offered_by,
  latitude,
  longitude,
  service_request_comments (
    id,
    user_id,
    user_name,
    user_avatar_url,
    text,
    time_ago
  )
`;
