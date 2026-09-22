/**
 * Shared service-request mock data.
 * Later: replace listServiceRequests / getServiceRequestById with API or DB.
 */

// =========================
// TYPES....................
// =========================

export type ServiceRequest = {
  id: string;
  title: string;
  /** Display category e.g. "Plumbing", "Electrical" */
  category: string;
  /** Profession key used for filters e.g. "Plumber", "Electrician" */
  profession: string;
  /** Neighbourhood / area shown on card */
  location: string;
  /** City used for location filtering (same idea as Professional.city) */
  city: string;
  date: string;
  price: string;
  timeAgo: string;
  /** MaterialCommunityIcons name */
  icon: string;
  iconBackground: string;
  /** Mock gallery for the request detail modal. Replace later with API response. */
  images?: string[];
  description?: string;
  preferredDate?: string;
  /** Optional: for future map / distance */
  latitude?: number;
  longitude?: number;
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
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Looking for a reliable cleaner to help with a 2-bedroom apartment. Must be experienced, trustworthy and able to bring cleaning supplies. Flexible with time.",
    preferredDate: "ASAP",
    latitude: 6.4281,
    longitude: 3.4219,
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
  },
];

// =========================
// HELPERS (data layer)
// =========================

export function getServiceRequestById(
  id: string,
): ServiceRequest | undefined {
  return SERVICE_REQUESTS.find((r) => r.id === String(id));
}
