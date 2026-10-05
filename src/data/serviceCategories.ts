/** Home / Services category chips (static for now). */

export type ServiceCategory = {
  name: string;
  /** MaterialCommunityIcons glyph name */
  icon: string;
};

/**
 * Single source of truth for category chips / filters.
 * Names match service_categories seed + request.category values.
 * "All" is added by listServiceCategories() / CATEGORY_FILTERS where needed.
 */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { name: "Plumbing", icon: "pipe" },
  { name: "Electrical", icon: "flash" },
  { name: "Cleaning", icon: "broom" },
  { name: "Mechanic", icon: "car-wrench" },
  { name: "Barber", icon: "content-cut" },
  { name: "Nail Tech", icon: "nail" },
  { name: "Massage", icon: "spa" },
  { name: "Carpentry", icon: "hammer" },
];
