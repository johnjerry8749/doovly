/**
 * Shared service-request mock data.
 * Later: replace listServiceRequests / getServiceRequestById with API or DB.
 */

// =========================
// TYPES
// =========================

export type ServiceRequest = {
  id: string;
  title: string;
  category: string;
  profession: string;
  location: string;
  city: string;
  date: string;
  price: string;
  timeAgo: string;
  icon: string;
  iconBackground: string;
  latitude?: number;
  longitude?: number;
  /** Gallery images (URLs) — required for detail modal */
  images: string[];
  description: string;
  preferredDate: string;
  serviceType: string;
  isNew: boolean;
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
    price: "₦20,000",
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
    serviceType: "Plumbing",
    isNew: true,
  },
  {
    id: "2",
    title: "Need electrician to fix power",
    category: "Electrical",
    profession: "Electrician",
    location: "Lekki Phase 1",
    city: "Lagos",
    date: "Tomorrow, 2:00 PM",
    price: "₦10,000",
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
    serviceType: "Electrical",
    isNew: true,
  },
  {
    id: "3",
    title: "Car needs urgent repair",
    category: "Mechanic",
    profession: "Mechanic",
    location: "Ikoyi",
    city: "Lagos",
    date: "Today, 4:30 PM",
    price: "₦30,000",
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
    serviceType: "Mechanic",
    isNew: true,
  },
  {
    id: "4",
    title: "Haircut and beard trim",
    category: "Barber",
    profession: "Barber",
    location: "Garki",
    city: "Abuja",
    date: "Today, 11:00 AM",
    price: "₦5,000",
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
    serviceType: "Barber",
    isNew: false,
  },
  {
    id: "5",
    title: "Gel nails and manicure",
    category: "Nail Tech",
    profession: "Nail Tech",
    location: "Surulere",
    city: "Lagos",
    date: "Tomorrow, 1:00 PM",
    price: "₦15,000",
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
    serviceType: "Nail Tech",
    isNew: false,
  },
  {
    id: "6",
    title: "House wiring check",
    category: "Electrical",
    profession: "Electrician",
    location: "GRA",
    city: "Port Harcourt",
    date: "Today, 3:00 PM",
    price: "₦25,000",
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
    serviceType: "Electrical",
    isNew: false,
  },
  {
    id: "7",
    title: "Blocked kitchen sink",
    category: "Plumbing",
    profession: "Plumber",
    location: "Wuse 2",
    city: "Abuja",
    date: "Today, 5:00 PM",
    price: "₦30,000",
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
    serviceType: "Plumbing",
    isNew: true,
  },
  {
    id: "8",
    title: "Full body massage booking",
    category: "Spa",
    profession: "Spa",
    location: "Ikeja",
    city: "Lagos",
    date: "Tomorrow, 10:00 AM",
    price: "₦100,000",
    timeAgo: "45 min ago",
    icon: "spa",
    iconBackground: "#E0F2F1",
    latitude: 6.6018,
    longitude: 3.3515,
    images: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Looking for a professional full body massage at home. Prefer a verified and experienced therapist.",
    preferredDate: "Tomorrow, 10:00 AM",
    serviceType: "Spa",
    isNew: false,
  },
  {
    id: "9",
    title: "AC not cooling – need mechanic",
    category: "Mechanic",
    profession: "Mechanic",
    location: "New Haven",
    city: "Enugu",
    date: "Today, 12:00 PM",
    price: "₦20,000",
    timeAgo: "1 hr ago",
    icon: "car-wrench",
    iconBackground: "#E9E1FF",
    latitude: 6.4584,
    longitude: 7.5464,
    images: [
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Car AC is not cooling at all. Need a mechanic who specializes in AC systems.",
    preferredDate: "ASAP",
    serviceType: "Mechanic",
    isNew: false,
  },
  {
    id: "10",
    title: "Bathroom tile and pipe fix",
    category: "Plumbing",
    profession: "Plumber",
    location: "Owerri Municipal",
    city: "Owerri",
    date: "Tomorrow, 9:00 AM",
    price: "₦23,200",
    timeAgo: "1 hr ago",
    icon: "water-pump",
    iconBackground: "#FFF1D5",
    latitude: 5.4836,
    longitude: 7.0333,
    images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Broken tiles and a leaking pipe in the bathroom. Need both plumbing and minor tiling work.",
    preferredDate: "Tomorrow, 9:00 AM",
    serviceType: "Plumbing",
    isNew: false,
  },
  {
    id: "11",
    title: "Home Cleaning Needed",
    category: "Cleaning",
    profession: "Cleaner",
    location: "Lekki",
    city: "Lagos",
    date: "ASAP",
    price: "₦25,000",
    timeAgo: "2 hours ago",
    icon: "broom",
    iconBackground: "#D1FAE5",
    latitude: 6.4474,
    longitude: 3.4722,
    images: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Looking for a reliable cleaner to help with a 2-bedroom apartment. Must be experienced, trustworthy and able to bring cleaning supplies. Flexible with time.",
    preferredDate: "ASAP",
    serviceType: "Home cleaning",
    isNew: true,
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
