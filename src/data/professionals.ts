/**
 * Shared professionals data.
 * Later: replace getProfessionalById / list with API or DB.
 *
 * Star rule (as requested):
 *   every 10 review comments = 1 star (max 5)
 *   stars = min(5, floor(totalReviews / 10))
 */

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
  userName: string;
  comment: string;
  date: string;
};

export type Professional = {
  id: string;
  name: string;
  profession: string;
  city: string;
  priceFrom: string;
  image: number;
  verified: boolean;
  latitude: number;
  longitude: number;
  services: ProService[];
  /** Work photos shown in Portfolio tab */
  portfolio: number[];
  reviews: ProReview[];
};

/** Every 10 reviews → 1 star, max 5 */
export function starsFromReviewCount(count: number): number {
  return Math.min(5, Math.floor(count / 10));
}

export const PROFESSIONALS: Professional[] = [
  {
    id: "1",
    name: "John Chukwuemeka",
    profession: "Plumber",
    city: "Lagos",
    priceFrom: "₦8,000",
    image: require("@/assets/profile_1.jpg"),
    verified: true,
    latitude: 6.5244,
    longitude: 3.3792,
    services: [
      {
        id: "s1",
        name: "Plumbing Installation",
        description: "Professional installation of pipes, fixtures, taps and fittings.",
        price: "₦8,000",
        priceValue: 8000,
        icon: "pipe",
      },
      {
        id: "s2",
        name: "Drain Cleaning",
        description: "High-pressure drain cleaning and blockage removal.",
        price: "₦10,000",
        priceValue: 10000,
        icon: "pipe-leak",
      },
      {
        id: "s3",
        name: "Water Heater Repair",
        description: "Repair and maintenance of electric and gas water heaters.",
        price: "₦12,000",
        priceValue: 12000,
        icon: "water-boiler",
      },
    ],
    portfolio: [
      require("@/assets/profile_1.jpg"),
      require("@/assets/profile_3.jpg"),
      require("@/assets/profile_4.jpg"),
      require("@/assets/profile_2.jpg"),
    ],
    reviews: [
      {
        id: "r1",
        userName: "Ada O.",
        comment: "Very professional and on time. Fixed my kitchen sink perfectly.",
        date: "May 10, 2025",
      },
      {
        id: "r2",
        userName: "Tunde A.",
        comment: "Honest pricing and clean work. Highly recommended.",
        date: "Apr 28, 2025",
      },
      {
        id: "r3",
        userName: "Chioma N.",
        comment: "Good job overall. Arrived a bit late but quality was excellent.",
        date: "Apr 12, 2025",
      },
    ],
  },
  {
    id: "2",
    name: "Chioma Eze",
    profession: "Nail Tech",
    city: "Lagos",
    priceFrom: "₦6,000",
    image: require("@/assets/profile_2.jpg"),
    verified: true,
    latitude: 6.6018,
    longitude: 3.3515,
    services: [
      {
        id: "s1",
        name: "Nail Extension",
        description: "Acrylic and gel nail extensions with design options.",
        price: "₦6,000",
        priceValue: 6000,
        icon: "nail",
      },
      {
        id: "s2",
        name: "Manicure & Pedicure",
        description: "Full manicure and pedicure package.",
        price: "₦8,000",
        priceValue: 8000,
        icon: "hand-okay",
      },
    ],
    portfolio: [
      require("@/assets/profile_2.jpg"),
      require("@/assets/profile_4.jpg"),
    ],
    reviews: [
      {
        id: "r1",
        userName: "Blessing K.",
        comment: "Beautiful nails and very careful. Will book again.",
        date: "May 5, 2025",
      },
    ],
  },
  {
    id: "3",
    name: "Ikechukwu Obi",
    profession: "Mechanic",
    city: "Abuja",
    priceFrom: "₦10,000",
    image: require("@/assets/profile_3.jpg"),
    verified: true,
    latitude: 9.0765,
    longitude: 7.3986,
    services: [
      {
        id: "s1",
        name: "Engine Diagnostics",
        description: "Full engine check and fault diagnosis.",
        price: "₦10,000",
        priceValue: 10000,
        icon: "car-wrench",
      },
      {
        id: "s2",
        name: "Oil Change",
        description: "Engine oil and filter replacement.",
        price: "₦15,000",
        priceValue: 15000,
        icon: "oil",
      },
    ],
    portfolio: [require("@/assets/profile_3.jpg"), require("@/assets/profile_1.jpg")],
    reviews: [
      {
        id: "r1",
        userName: "Emeka P.",
        comment: "Fixed my car the same day. Fair price.",
        date: "May 1, 2025",
      },
    ],
  },
  {
    id: "4",
    name: "Blessing Joy",
    profession: "Body Massage Therapist",
    city: "Lagos",
    priceFrom: "₦18,000",
    image: require("@/assets/profile_4.jpg"),
    verified: true,
    latitude: 6.4281,
    longitude: 3.4219,
    services: [
      {
        id: "s1",
        name: "Full Body Massage",
        description: "Relaxing full body massage session (60–90 mins).",
        price: "₦18,000",
        priceValue: 18000,
        icon: "spa",
      },
    ],
    portfolio: [require("@/assets/profile_4.jpg")],
    reviews: [
      {
        id: "r1",
        userName: "Ngozi M.",
        comment: "So relaxing. Professional and respectful.",
        date: "Apr 20, 2025",
      },
    ],
  },
  {
    id: "5",
    name: "Emeka Okoro",
    profession: "Electrician",
    city: "Port Harcourt",
    priceFrom: "₦7,500",
    image: require("@/assets/profile_1.jpg"),
    verified: true,
    latitude: 4.8156,
    longitude: 7.0498,
    services: [
      {
        id: "s1",
        name: "Wiring & Installation",
        description: "Home and office electrical wiring and installations.",
        price: "₦7,500",
        priceValue: 7500,
        icon: "flash",
      },
      {
        id: "s2",
        name: "Fault Finding",
        description: "Diagnose and fix electrical faults safely.",
        price: "₦9,000",
        priceValue: 9000,
        icon: "lightning-bolt",
      },
    ],
    portfolio: [require("@/assets/profile_1.jpg"), require("@/assets/profile_3.jpg")],
    reviews: [
      {
        id: "r1",
        userName: "Ifeanyi D.",
        comment: "Quick and safe. Explained everything clearly.",
        date: "May 8, 2025",
      },
    ],
  },
  {
    id: "6",
    name: "Aisha Bello",
    profession: "Barber",
    city: "Abuja",
    priceFrom: "₦4,000",
    image: require("@/assets/profile_2.jpg"),
    verified: true,
    latitude: 9.0579,
    longitude: 7.4951,
    services: [
      {
        id: "s1",
        name: "Haircut",
        description: "Classic and modern haircuts for men.",
        price: "₦4,000",
        priceValue: 4000,
        icon: "content-cut",
      },
      {
        id: "s2",
        name: "Beard Trim",
        description: "Beard shaping and trim.",
        price: "₦2,500",
        priceValue: 2500,
        icon: "mustache",
      },
    ],
    portfolio: [require("@/assets/profile_2.jpg")],
    reviews: [
      {
        id: "r1",
        userName: "Yusuf H.",
        comment: "Clean cut every time. Best in the area.",
        date: "May 3, 2025",
      },
    ],
  },
];

export function getProfessionalById(id: string): Professional | undefined {
  return PROFESSIONALS.find((p) => p.id === String(id));
}

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
