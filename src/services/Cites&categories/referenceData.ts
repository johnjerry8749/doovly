import { supabase } from "@/lib/supabase";

export type CityOption = {
  name: string;
  sort_order: number;
};

export type ServiceCategoryOption = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};

/**
 * Get all Nigerian cities from Supabase.
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

  return data ?? [];
}

/**
 * Get all service categories from Supabase.
 *
 * Admin can add more categories later and they will
 * automatically appear in the app.
 */
export async function listServiceCategoriesFromSupabase(): Promise<
  ServiceCategoryOption[]
> {
  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listServiceCategoriesFromSupabase error:", error);
    throw error;
  }

  return data ?? [];
}

