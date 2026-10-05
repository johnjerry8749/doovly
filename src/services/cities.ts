import { supabase } from "@/lib/supabase";

let cache: string[] | null = null;
let loadPromise: Promise<string[]> | null = null;

async function fetchCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw error;

  const cities = (data ?? [])
    .map((row) => String(row.name ?? "").trim())
    .filter(Boolean);

  cache = cities;
  return cities;
}

export function listCities(): string[] {
  return cache ?? [];
}

export async function listCitiesAsync(): Promise<string[]> {
  if (cache) return cache;

  if (!loadPromise) {
    loadPromise = fetchCities().finally(() => {
      loadPromise = null;
    });
  }

  return loadPromise;
}

export function invalidateCitiesCache() {
  cache = null;
}
