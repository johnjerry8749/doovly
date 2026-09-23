/** Home / Services category chips (static for now). */

export type ServiceCategory = {
  name: string;
  /** MaterialCommunityIcons glyph name */
  icon: string;
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { name: "Plumber", icon: "water-pump" },
  { name: "Electrician", icon: "flash" },
  { name: "Barber", icon: "content-cut" },
  { name: "Nail Tech", icon: "hand-okay" },
  { name: "Mechanic", icon: "car-wrench" },
  { name: "Spa", icon: "spa" },
];
