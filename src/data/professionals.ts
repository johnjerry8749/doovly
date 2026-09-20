/**
 * Shared professionals mock data.
 *
 * Later:
 * Replace this file with API / database data.
 *
 * Star rule:
 * Every 10 reviews = 1 star.
 * Maximum = 5 stars.
 */

// =========================
// TYPES
// =========================

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

export type CompletedProject = {
  id: string;
  description: string;
  image: number;
};

export type Professional = {
  id: string;
  name: string;
  profession: string;
  city: string;
  priceFrom: string;
  image: number;
  verified: boolean;
  subscribed: boolean;
  latitude: number;
  longitude: number;
  role: string;


  services: ProService[];

  portfolio: CompletedProject[];

  reviews: ProReview[];
};

// =========================
// STAR CALCULATION
// =========================

export function starsFromReviewCount(count: number): number {
  return Math.min(5, Math.floor(count / 10));
}

// =========================
// PROFESSIONALS
// =========================

export const PROFESSIONALS: Professional[] = [
  // =====================================================
  // 1. JOHN CHUKWUEMEKA
  // =====================================================
  {
    id: "1",
    name: "John Chukwuemeka",
    profession: "Plumber",
    city: "Lagos",
    priceFrom: "₦8,000",
    image: require("@/assets/profile_1.jpg"),
    verified: true,
    subscribed: false,
    latitude: 6.5244,
    longitude: 3.3792,
    role: "admin",

    services: [
      {
        id: "s1",
        name: "Plumbing Installation",
        description:
          "Professional installation of pipes, taps, fixtures and fittings.",
        price: "₦8,000",
        priceValue: 8000,
        icon: "pipe",
      },
      {
        id: "s2",
        name: "Drain Cleaning",
        description:
          "Professional drain cleaning and blockage removal.",
        price: "₦10,000",
        priceValue: 10000,
        icon: "pipe-leak",
      },
      {
        id: "s3",
        name: "Water Heater Repair",
        description:
          "Repair and maintenance of electric and gas water heaters.",
        price: "₦12,000",
        priceValue: 12000,
        icon: "water-boiler",
      },
    ],

    portfolio: [
      {
        id: "p1",
        description:
          "Installed new kitchen pipes, taps and drainage connections.",
        image: require("@/assets/profile_1.jpg"),
      },
      {
        id: "p2",
        description:
          "Completed a full bathroom plumbing installation.",
        image: require("@/assets/profile_3.jpg"),
      },
      {
        id: "p3",
        description:
          "Installed and tested a residential water heating system.",
        image: require("@/assets/profile_4.jpg"),
      },
      {
        id: "p4",
        description:
          "Removed blockage and restored proper drainage flow.",
        image: require("@/assets/profile_2.jpg"),
      },
    ],

    reviews: [
      {
        id: "r1",
        userName: "Ada O.",
        comment:
          "Very professional and on time. Fixed my kitchen sink perfectly.",
        date: "May 10, 2025",
      },
      {
        id: "r2",
        userName: "Tunde A.",
        comment:
          "Honest pricing and clean work. Highly recommended.",
        date: "Apr 28, 2025",
      },
      {
        id: "r3",
        userName: "Chioma N.",
        comment:
          "Good job overall. The quality of the work was excellent.",
        date: "Apr 12, 2025",
      },
    ],
  },

  // =====================================================
  // 2. CHIOMA EZE
  // =====================================================
  {
    id: "2",
    name: "Chioma Eze",
    profession: "Nail Tech",
    city: "Lagos",
    priceFrom: "₦6,000",
    image: require("@/assets/profile_2.jpg"),
    verified: true,
    subscribed: true,
    latitude: 6.6018,
    longitude: 3.3515,
    role: "user",

    services: [
      {
        id: "s1",
        name: "Nail Extension",
        description:
          "Acrylic and gel nail extensions with custom designs.",
        price: "₦6,000",
        priceValue: 6000,
        icon: "nail",
      },
      {
        id: "s2",
        name: "Manicure & Pedicure",
        description:
          "Complete manicure and pedicure treatment.",
        price: "₦8,000",
        priceValue: 8000,
        icon: "hand-okay",
      },
      {
        id: "s3",
        name: "Nail Art",
        description:
          "Creative nail art and detailed custom designs.",
        price: "₦4,000",
        priceValue: 4000,
        icon: "brush",
      },
    ],

    portfolio: [
      {
        id: "p1",
        description:
          "Elegant gel nails with a clean modern finish.",
        image: require("@/assets/profile_2.jpg"),
      },
      {
        id: "p2",
        description:
          "Classic French tip design with a polished finish.",
        image: require("@/assets/profile_4.jpg"),
      },
      {
        id: "p3",
        description:
          "Custom bridal nail design with detailed decoration.",
        image: require("@/assets/profile_1.jpg"),
      },
      {
        id: "p4",
        description:
          "Premium nail art with custom patterns and finishing.",
        image: require("@/assets/profile_3.jpg"),
      },
    ],

    reviews: [
      {
        id: "r1",
        userName: "Blessing K.",
        comment:
          "Beautiful nails and very careful. Will book again.",
        date: "May 5, 2025",
      },
      {
        id: "r2",
        userName: "Amaka R.",
        comment:
          "Very neat work and friendly service.",
        date: "Apr 21, 2025",
      },
    ],
  },

  // =====================================================
  // 3. IKECHUKWU OBI
  // =====================================================
  {
    id: "3",
    name: "Ikechukwu Obi",
    profession: "Mechanic",
    city: "Abuja",
    priceFrom: "₦10,000",
    image: require("@/assets/profile_3.jpg"),
    verified: false,
    subscribed: true,
    latitude: 9.0765,
    longitude: 7.3986,
    role: "user",

    services: [
      {
        id: "s1",
        name: "Engine Diagnostics",
        description:
          "Complete engine inspection and fault diagnosis.",
        price: "₦10,000",
        priceValue: 10000,
        icon: "car-wrench",
      },
      {
        id: "s2",
        name: "Oil Change",
        description:
          "Engine oil and filter replacement service.",
        price: "₦15,000",
        priceValue: 15000,
        icon: "oil",
      },
      {
        id: "s3",
        name: "Brake Repair",
        description:
          "Brake inspection, repair and replacement.",
        price: "₦12,000",
        priceValue: 12000,
        icon: "car-brake-alert",
      },
    ],

    portfolio: [
      {
        id: "p1",
        description:
          "Diagnosed and repaired a vehicle engine fault.",
        image: require("@/assets/profile_3.jpg"),
      },
      {
        id: "p2",
        description:
          "Completed brake inspection and replacement.",
        image: require("@/assets/profile_1.jpg"),
      },
      {
        id: "p3",
        description:
          "Performed full oil and filter replacement.",
        image: require("@/assets/profile_4.jpg"),
      },
      {
        id: "p4",
        description:
          "Identified and resolved multiple dashboard fault codes.",
        image: require("@/assets/profile_2.jpg"),
      },
    ],

    reviews: [
      {
        id: "r1",
        userName: "Emeka P.",
        comment:
          "Fixed my car the same day. Fair price.",
        date: "May 1, 2025",
      },
      {
        id: "r2",
        userName: "David O.",
        comment:
          "Explained the problem clearly and completed the repair.",
        date: "Apr 18, 2025",
      },
    ],
  },

  // =====================================================
  // 4. BLESSING JOY
  // =====================================================
  {
    id: "4",
    name: "Blessing Joy",
    profession: "Massage Therapist",
    city: "Lagos",
    priceFrom: "₦18,000",
    image: require("@/assets/profile_4.jpg"),
    verified: true,
    subscribed: true,
    latitude: 6.4281,
    longitude: 3.4219,
    role: "user",

    services: [
      {
        id: "s1",
        name: "Full Body Massage",
        description:
          "Relaxing full body massage session lasting 60–90 minutes.",
        price: "₦18,000",
        priceValue: 18000,
        icon: "spa",
      },
      {
        id: "s2",
        name: "Deep Tissue Massage",
        description:
          "Focused massage designed for muscle tension and relaxation.",
        price: "₦22,000",
        priceValue: 22000,
        icon: "hand-back-right",
      },
    ],

    portfolio: [
      {
        id: "p1",
        description:
          "Completed a relaxing full body massage session.",
        image: require("@/assets/profile_4.jpg"),
      },
      {
        id: "p2",
        description:
          "Provided targeted deep tissue massage treatment.",
        image: require("@/assets/profile_2.jpg"),
      },
      {
        id: "p3",
        description:
          "Created a calming wellness session for a returning client.",
        image: require("@/assets/profile_1.jpg"),
      },
      {
        id: "p4",
        description:
          "Delivered a personalized relaxation and wellness treatment.",
        image: require("@/assets/profile_3.jpg"),
      },
    ],

    reviews: [
      {
        id: "r1",
        userName: "Ngozi M.",
        comment:
          "Very relaxing. Professional and respectful.",
        date: "Apr 20, 2025",
      },
      {
        id: "r2",
        userName: "Sarah A.",
        comment:
          "Great experience and very comfortable environment.",
        date: "Apr 10, 2025",
      },
    ],
  },

  // =====================================================
  // 5. EMEKA OKORO
  // =====================================================
  {
    id: "5",
    name: "Emeka Okoro",
    profession: "Electrician",
    city: "Port Harcourt",
    priceFrom: "₦7,500",
    image: require("@/assets/profile_1.jpg"),
    verified: false,
    subscribed: true,
    latitude: 4.8156,
    longitude: 7.0498,
    role: "user",

    services: [
      {
        id: "s1",
        name: "Wiring & Installation",
        description:
          "Home and office electrical wiring and installations.",
        price: "₦7,500",
        priceValue: 7500,
        icon: "flash",
      },
      {
        id: "s2",
        name: "Fault Finding",
        description:
          "Diagnose and repair electrical faults safely.",
        price: "₦9,000",
        priceValue: 9000,
        icon: "lightning-bolt",
      },
      {
        id: "s3",
        name: "Lighting Installation",
        description:
          "Indoor and outdoor lighting installation.",
        price: "₦6,000",
        priceValue: 6000,
        icon: "lightbulb",
      },
    ],

    portfolio: [
      {
        id: "p1",
        description:
          "Completed electrical wiring for a residential property.",
        image: require("@/assets/profile_1.jpg"),
      },
      {
        id: "p2",
        description:
          "Installed modern lighting throughout a home.",
        image: require("@/assets/profile_3.jpg"),
      },
      {
        id: "p3",
        description:
          "Diagnosed and repaired multiple electrical faults.",
        image: require("@/assets/profile_2.jpg"),
      },
      {
        id: "p4",
        description:
          "Completed electrical installation for a small office.",
        image: require("@/assets/profile_4.jpg"),
      },
    ],

    reviews: [
      {
        id: "r1",
        userName: "Ifeanyi D.",
        comment:
          "Quick and safe. Explained everything clearly.",
        date: "May 8, 2025",
      },
      {
        id: "r2",
        userName: "Chinedu K.",
        comment:
          "Very neat electrical work and fair pricing.",
        date: "Apr 25, 2025",
      },
    ],
  },

  // =====================================================
  // 6. AISHA BELLO
  // =====================================================
  {
    id: "6",
    name: "Aisha Bello",
    profession: "Barber",
    city: "Abuja",
    priceFrom: "₦4,000",
    image: require("@/assets/profile_2.jpg"),
    verified: true,
    subscribed: true,
    latitude: 9.0579,
    longitude: 7.4951,
    role: "user",

    services: [
      {
        id: "s1",
        name: "Haircut",
        description:
          "Classic and modern haircuts for men.",
        price: "₦4,000",
        priceValue: 4000,
        icon: "content-cut",
      },
      {
        id: "s2",
        name: "Beard Trim",
        description:
          "Professional beard shaping and trimming.",
        price: "₦2,500",
        priceValue: 2500,
        icon: "mustache",
      },
      {
        id: "s3",
        name: "Haircut & Beard",
        description:
          "Complete haircut and beard grooming package.",
        price: "₦6,000",
        priceValue: 6000,
        icon: "face-man",
      },
    ],
    // None subscribe user allow only 5 images
    //subcribe pro user only allow up to 20 img 
    portfolio: [
      {
        id: "p1",
        description:
          "Clean classic fade with a sharp professional finish.",
        image: require("@/assets/profile_2.jpg"),
      },
      {
        id: "p2",
        description:
          "Detailed beard shaping and grooming service.",
        image: require("@/assets/profile_4.jpg"),
      },
      {
        id: "p3",
        description:
          "Modern low fade with a clean line-up.",
        image: require("@/assets/profile_1.jpg"),
      },
      {
        id: "p4",
        description:
          "Complete haircut, beard trim and styling.",
        image: require("@/assets/profile_3.jpg"),
      },
    ],

    reviews: [
      {
        id: "r1",
        userName: "Yusuf H.",
        comment:
          "Clean cut every time. Very professional.",
        date: "May 3, 2025",
      },
      {
        id: "r2",
        userName: "Ibrahim S.",
        comment:
          "Great attention to detail and excellent service.",
        date: "Apr 16, 2025",
      },
    ],
  },
];

// =========================
// GET PROFESSIONAL BY ID
// =========================

export function getProfessionalById(
  id: string
): Professional | undefined {
  return PROFESSIONALS.find(
    (professional) => professional.id === String(id)
  );
}

// =========================
// DISTANCE CALCULATION
// =========================

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}