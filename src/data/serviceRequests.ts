/**
 * Shared service-request mock data.
 * Later: replace listServiceRequests / getServiceRequestById with API or DB.
 */

import type { MaterialCommunityIcons } from "@expo/vector-icons";

// =========================
// TYPES
// =========================

export type ServiceRequestIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export type ServiceRequestComment = {
  id: string;
  userName: string;
  userAvatar: string;
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
  date: string;
  /** Budget is optional; offers set price via Send Offer modal */
  price?: string;
  timeAgo: string;
  icon: ServiceRequestIcon;
  iconBackground: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  description: string;
  preferredDate: string;
  isNew: boolean;
  createdByUserId: string;
  /** Poster display info for feed cards */
  posterName: string;
  posterAvatar: string;
  likesCount: number;
  comments: ServiceRequestComment[];
};

// =========================
// MOCK DATA
// =========================

export const SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: "1",
    title: "Leaking pipe in bathroom",
    category: "Plumbing",
    profession: "Plumber",
    location: "Victoria Island",
    city: "Lagos",
    date: "Today, 10:00 AM",
    timeAgo: "2 min ago",
    icon: "water-pump",
    iconBackground: "#FFF1D5",
    latitude: 6.4281,
    longitude: 3.4219,
    images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Bathroom pipe is leaking under the sink. Need someone experienced who can fix it today if possible.",
    preferredDate: "ASAP",
    isNew: true,
    createdByUserId: "u2",
    posterName: "Amaka O.",
    posterAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    likesCount: 14,
    comments: [
      {
        id: "c1",
        userName: "Chidi P.",
        userAvatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
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
    date: "Tomorrow, 2:00 PM",
    timeAgo: "5 min ago",
    icon: "flash",
    iconBackground: "#DDF2FF",
    latitude: 6.4474,
    longitude: 3.4722,
    images: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Power keeps tripping in the living room. Looking for a licensed electrician to diagnose and fix.",
    preferredDate: "Tomorrow, 2:00 PM",
    isNew: true,
    createdByUserId: "u3",
    posterName: "Emeka B.",
    posterAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
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
    date: "Today, 4:30 PM",
    timeAgo: "8 min ago",
    icon: "car-wrench",
    iconBackground: "#E9E1FF",
    latitude: 6.4541,
    longitude: 3.4316,
    images: [
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Engine warning light is on and the car is making a strange noise. Need a reliable mechanic ASAP.",
    preferredDate: "Today, 4:30 PM",
    isNew: true,
    createdByUserId: "u4",
    posterName: "Tunde A.",
    posterAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    likesCount: 31,
    comments: [
      {
        id: "c2",
        userName: "AutoFix Lagos",
        userAvatar:
          "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
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
    date: "Today, 11:00 AM",
    timeAgo: "12 min ago",
    icon: "content-cut",
    iconBackground: "#E8F5E9",
    latitude: 9.0579,
    longitude: 7.4951,
    images: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Looking for a clean haircut and beard trim. Prefer someone who can come to my location.",
    preferredDate: "Today, 11:00 AM",
    isNew: false,
    createdByUserId: "u5",
    posterName: "Ibrahim K.",
    posterAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
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
    date: "Tomorrow, 1:00 PM",
    timeAgo: "20 min ago",
    icon: "nail",
    iconBackground: "#FCE4EC",
    latitude: 6.4969,
    longitude: 3.3481,
    images: [
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Need gel nails and a full manicure. Looking for a neat and experienced nail tech.",
    preferredDate: "Tomorrow, 1:00 PM",
    isNew: false,
    createdByUserId: "u6",
    posterName: "Blessing M.",
    posterAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    likesCount: 18,
    comments: [
      {
        id: "c3",
        userName: "NailsBySola",
        userAvatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
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
    date: "Today, 3:00 PM",
    timeAgo: "25 min ago",
    icon: "flash",
    iconBackground: "#DDF2FF",
    latitude: 4.8156,
    longitude: 7.0498,
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Need a full house wiring safety check. Some outlets are warm and lights flicker.",
    preferredDate: "This week",
    isNew: false,
    createdByUserId: "u7",
    posterName: "Grace E.",
    posterAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
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
    date: "Today, 5:00 PM",
    timeAgo: "30 min ago",
    icon: "water-pump",
    iconBackground: "#FFF1D5",
    latitude: 9.0765,
    longitude: 7.3986,
    images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Kitchen sink is fully blocked. Need a plumber who can clear it and check the pipes.",
    preferredDate: "ASAP",
    isNew: true,
    createdByUserId: "u1",
    posterName: "You",
    posterAvatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
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
    date: "ASAP",
    timeAgo: "2h ago",
    icon: "broom",
    iconBackground: "#D1FAE5",
    latitude: 6.4474,
    longitude: 3.4722,
    images: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Looking for a reliable cleaner to deep clean my 2 bedroom apartment. Must bring own equipment.",
    preferredDate: "ASAP",
    isNew: true,
    createdByUserId: "u11",
    posterName: "Tunde A.",
    posterAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    likesCount: 22,
    comments: [
      {
        id: "c4",
        userName: "Chioma K.",
        userAvatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        text: "I'm available for this. I have 4 years experience in home cleaning.",
        timeAgo: "1h ago",
      },
      {
        id: "c5",
        userName: "Adaobi N.",
        userAvatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
        text: "Can do this weekend if still open.",
        timeAgo: "45 min ago",
      },
    ],
  },
];

// =========================
// HELPERS
// =========================

export function getServiceRequestById(
  id: string,
): ServiceRequest | undefined {
  return SERVICE_REQUESTS.find((r) => r.id === String(id));
}
