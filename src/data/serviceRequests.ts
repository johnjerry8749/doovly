/**
 * Shared service-request mock data.
 * Avatars & comment faces use the same local assets as professionals
 * (@/assets/profile_*.jpg) — no external image URLs.
 *
 * Later: replace with API / DB responses (image URLs or asset ids).
 */

import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

export type ServiceRequestIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export type ServiceRequestComment = {
  id: string;
  /** Optional user id for full DB schema readiness */
  userId?: string;
  userName: string;
  /** Local require() asset or remote URI once API is live */
  userAvatar: ImageSourcePropType;
  text: string;
  timeAgo: string;
};

export type ServiceRequest = {
  id: string;
  title: string;
  category: string;
  profession: string;
  location: string;
  city: string;
  price?: string;
  timeAgo: string;
  icon: ServiceRequestIcon;
  iconBackground: string;
  latitude?: number;
  longitude?: number;
  /** Local require() assets or remote URIs */
  images: ImageSourcePropType[];
  description: string;
  isNew: boolean;
  createdByUserId: string;
  posterName: string;
  posterAvatar: ImageSourcePropType;
  posterVerified?: boolean;
  likesCount: number;
  comments: ServiceRequestComment[];
};

// Local faces shared with professionals mock (src/data/professionals.ts)
const AVATAR_1 = require("@/assets/profile_1.jpg");
const AVATAR_2 = require("@/assets/profile_2.jpg");
const AVATAR_3 = require("@/assets/profile_3.jpg");
const AVATAR_4 = require("@/assets/profile_4.jpg");

export const SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: "1",
    title: "Leaking pipe in bathroom",
    category: "Plumbing",
    profession: "Plumber",
    location: "Victoria Island",
    city: "Lagos",
    timeAgo: "2 min ago",
    icon: "water-pump",
    iconBackground: "#FFF1D5",
    latitude: 6.4281,
    longitude: 3.4219,
    images: [AVATAR_1, AVATAR_3],
    description:
      "Bathroom pipe is leaking under the sink. Need someone experienced who can fix it today if possible.",
    isNew: true,
    createdByUserId: "u2",
    posterName: "Amaka O.",
    posterAvatar: AVATAR_2,
    posterVerified: true,
    likesCount: 14,
    comments: [
      {
        id: "c1",
        userId: "u1",
        userName: "John Chukwuemeka",
        userAvatar: AVATAR_1,
        text: "I can come today after 3pm. DM me.",
        timeAgo: "1 min ago",
      },
    ],
  },
  {
    id: "2",
    title: "Need electrician to fix power",
    category: "Electrical",
    profession: "Electrician",
    location: "Lekki Phase 1",
    city: "Lagos",
    timeAgo: "5 min ago",
    icon: "flash",
    iconBackground: "#DDF2FF",
    latitude: 6.4474,
    longitude: 3.4722,
    images: [AVATAR_3],
    description:
      "Power keeps tripping in the living room. Looking for a licensed electrician to diagnose and fix.",
    isNew: true,
    createdByUserId: "u3",
    posterName: "Emeka Okoro",
    posterAvatar: AVATAR_1,
    posterVerified: false,
    likesCount: 9,
    comments: [],
  },
  {
    id: "3",
    title: "Car needs urgent repair",
    category: "Mechanic",
    profession: "Mechanic",
    location: "Ikoyi",
    city: "Lagos",
    timeAgo: "8 min ago",
    icon: "car-wrench",
    iconBackground: "#E9E1FF",
    latitude: 6.4541,
    longitude: 3.4316,
    images: [AVATAR_3, AVATAR_4],
    description:
      "Engine warning light is on and the car is making a strange noise. Need a reliable mechanic ASAP.",
    isNew: true,
    createdByUserId: "u4",
    posterName: "Ikechukwu Obi",
    posterAvatar: AVATAR_3,
    posterVerified: false,
    likesCount: 31,
    comments: [
      {
        id: "c2",
        userId: "u5",
        userName: "Emeka Okoro",
        userAvatar: AVATAR_1,
        text: "We can tow and diagnose same day.",
        timeAgo: "3 min ago",
      },
    ],
  },
  {
    id: "4",
    title: "Haircut and beard trim",
    category: "Barber",
    profession: "Barber",
    location: "Garki",
    city: "Abuja",
    timeAgo: "12 min ago",
    icon: "content-cut",
    iconBackground: "#E8F5E9",
    latitude: 9.0579,
    longitude: 7.4951,
    images: [AVATAR_2],
    description:
      "Looking for a clean haircut and beard trim. Prefer someone who can come to my location.",
    isNew: false,
    createdByUserId: "u5",
    posterName: "Aisha Bello",
    posterAvatar: AVATAR_2,
    posterVerified: true,
    likesCount: 6,
    comments: [],
  },
  {
    id: "5",
    title: "Gel nails and manicure",
    category: "Nail Tech",
    profession: "Nail Tech",
    location: "Surulere",
    city: "Lagos",
    timeAgo: "20 min ago",
    icon: "nail",
    iconBackground: "#FCE4EC",
    latitude: 6.4969,
    longitude: 3.3481,
    images: [AVATAR_2, AVATAR_4],
    description:
      "Need gel nails and a full manicure. Looking for a neat and experienced nail tech.",
    isNew: false,
    createdByUserId: "u6",
    posterName: "Chioma Eze",
    posterAvatar: AVATAR_2,
    posterVerified: true,
    likesCount: 18,
    comments: [
      {
        id: "c3",
        userId: "u4",
        userName: "Blessing Joy",
        userAvatar: AVATAR_4,
        text: "I have slots tomorrow afternoon!",
        timeAgo: "10 min ago",
      },
    ],
  },
  {
    id: "6",
    title: "House wiring check",
    category: "Electrical",
    profession: "Electrician",
    location: "GRA",
    city: "Port Harcourt",
    timeAgo: "25 min ago",
    icon: "flash",
    iconBackground: "#DDF2FF",
    latitude: 4.8156,
    longitude: 7.0498,
    images: [AVATAR_1],
    description:
      "Need a full house wiring safety check. Some outlets are warm and lights flicker.",

    isNew: false,
    createdByUserId: "u7",
    posterName: "Emeka Okoro",
    posterAvatar: AVATAR_1,
    posterVerified: false,
    likesCount: 4,
    comments: [],
  },
  {
    id: "7",
    title: "Blocked kitchen sink",
    category: "Plumbing",
    profession: "Plumber",
    location: "Wuse 2",
    city: "Abuja",
    timeAgo: "30 min ago",
    icon: "water-pump",
    iconBackground: "#FFF1D5",
    latitude: 9.0765,
    longitude: 7.3986,
    images: [AVATAR_1, AVATAR_3],
    description:
      "Kitchen sink is fully blocked. Need a plumber who can clear it and check the pipes.",

    isNew: true,
    createdByUserId: "u1",
    posterName: "John Chukwuemeka",
    posterAvatar: AVATAR_1,
    posterVerified: false,
    likesCount: 11,
    comments: [],
  },
  {
    id: "11",
    title: "Home Cleaning Needed",
    category: "Cleaning",
    profession: "Cleaner",
    location: "Lekki Phase 1",
    city: "Lagos",
    timeAgo: "2h ago",
    icon: "broom",
    iconBackground: "#D1FAE5",
    latitude: 6.4474,
    longitude: 3.4722,
    images: [AVATAR_4, AVATAR_2],
    description:
      "Looking for a reliable cleaner to deep clean my 2 bedroom apartment. Must bring own equipment.",

    isNew: true,
    createdByUserId: "u11",
    posterName: "Blessing Joy",
    posterAvatar: AVATAR_4,
    posterVerified: true,
    likesCount: 22,
    comments: [
      {
        id: "c4",
        userId: "u2",
        userName: "Chioma Eze",
        userAvatar: AVATAR_2,
        text: "I'm available for this. I have 4 years experience in home cleaning.",
        timeAgo: "1h ago",
      },
      {
        id: "c5",
        userId: "u6",
        userName: "Aisha Bello",
        userAvatar: AVATAR_2,
        text: "Can do this weekend if still open.",
        timeAgo: "45 min ago",
      },
    ],
  },
];

export function getServiceRequestById(
  id: string,
): ServiceRequest | undefined {
  return SERVICE_REQUESTS.find((r) => r.id === String(id));
}
