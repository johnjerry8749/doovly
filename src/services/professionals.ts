/**
 * Professionals service
 * ---------------------
 * Screens import ONLY from here.
 * Function names + return shapes stay stable — UI never changes.
 */

import { supabase } from "@/lib/supabase";
import {
  mapProfessionalRow,
  mapServiceRow,
  mapReviewRow,
  PROFESSIONAL_SELECT,
} from "@/lib/rowMappers";
import { toUuid, tryToUuid } from "@/lib/ids";
import { loadSessionUser } from "@/lib/session";
import {
  getDistanceKm,
  starsFromReviewCount,
  type Professional,
  type ProService,
  type ProReview,
} from "@/data/professionals";
import {
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from "@/data/serviceCategories";

export type { Professional, ProService, ProReview, ServiceCategory };
export { getDistanceKm, starsFromReviewCount };

/** In-memory cache so existing sync callers keep working after first load. */
let cache: Professional[] | null = null;
let loadPromise: Promise<Professional[]> | null = null;

async function fetchAll(): Promise<Professional[]> {
  const { data, error } = await supabase
    .from("professionals")
    .select(PROFESSIONAL_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const list = (data ?? []).map(mapProfessionalRow);
  cache = list;
  return list;
}

export async function ensureProfessionalsLoaded(): Promise<Professional[]> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = fetchAll().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export function invalidateProfessionalsCache() {
  cache = null;
}

export function listProfessionals(): Professional[] {
  if (!cache) {
    void ensureProfessionalsLoaded();
  }
  return cache ?? [];
}

export async function listProfessionalsAsync(): Promise<Professional[]> {
  return ensureProfessionalsLoaded();
}

export function listProfessionalsByCity(city: string): Professional[] {
  const all = listProfessionals();
  const key = city.trim().toLowerCase();
  if (!key || key === "all nigeria" || key === "nigeria") return all;
  const filtered = all.filter(
    (p) =>
      p.city.toLowerCase().includes(key) || key.includes(p.city.toLowerCase()),
  );
  return filtered.length > 0 ? filtered : all;
}

export async function listProfessionalsByCityAsync(
  city: string,
): Promise<Professional[]> {
  await ensureProfessionalsLoaded();
  return listProfessionalsByCity(city);
}

export function getProfessionalById(id: string): Professional | undefined {
  const all = listProfessionals();
  return all.find((p) => String(p.id) === String(id));
}

export async function getProfessionalByIdAsync(
  id: string,
): Promise<Professional | undefined> {
  await ensureProfessionalsLoaded();
  const fromCache = getProfessionalById(id);
  if (fromCache) return fromCache;

  const uuid = tryToUuid("professional", id) ?? id;
  const { data, error } = await supabase
    .from("professionals")
    .select(PROFESSIONAL_SELECT)
    .or(`id.eq.${uuid},mock_id.eq.${id}`)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return mapProfessionalRow(data);
}

export function listServiceCategories(): ServiceCategory[] {
  return SERVICE_CATEGORIES;
}

export async function addReview(
  professionalId: string,
  input: { userName: string; comment: string; rating?: number },
): Promise<ProReview> {
  const proUuid = toUuid("professional", professionalId);
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      professional_id: proUuid,
      user_name: input.userName.trim(),
      comment: input.comment.trim(),
      rating: input.rating ?? null,
      date_label: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })
    .select("id, mock_id, user_name, comment, date_label, rating")
    .single();

  if (error) throw error;
  invalidateProfessionalsCache();
  return mapReviewRow(data);
}

export type ServiceInput = {
  name: string;
  description: string;
  price: string;
  icon?: string;
};

function parsePriceValue(price: string): number {
  const n = Number(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(price: string): string {
  const n = parsePriceValue(price);
  if (!n) return price.trim() || "₦0";
  return `₦${n.toLocaleString("en-NG")}`;
}

export function listMyServices(professionalId: string): ProService[] {
  const pro = getProfessionalById(professionalId);
  return pro?.services ?? [];
}

export async function listMyServicesAsync(
  professionalId: string,
): Promise<ProService[]> {
  await ensureProfessionalsLoaded();
  return listMyServices(professionalId);
}

export async function createMyService(
  professionalId: string,
  input: ServiceInput,
): Promise<ProService> {
  const proUuid = toUuid("professional", professionalId);
  const priceValue = parsePriceValue(input.price);
  const price = formatPrice(input.price);

  const { data, error } = await supabase
    .from("services")
    .insert({
      professional_id: proUuid,
      name: input.name.trim(),
      description: input.description.trim(),
      price,
      price_value: priceValue,
      icon: input.icon || "briefcase-outline",
    })
    .select("id, mock_id, name, description, price, price_value, icon")
    .single();

  if (error) throw error;
  invalidateProfessionalsCache();
  return mapServiceRow(data);
}

export async function updateMyService(
  professionalId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<ProService | null> {
  const proUuid = toUuid("professional", professionalId);
  const priceValue = parsePriceValue(input.price);
  const price = formatPrice(input.price);

  let serviceUuid = serviceId;
  if (!serviceId.includes("-") || serviceId.startsWith("s")) {
    const { data: found } = await supabase
      .from("services")
      .select("id")
      .eq("professional_id", proUuid)
      .or(`mock_id.eq.${serviceId},id.eq.${serviceId}`)
      .maybeSingle();
    if (!found) return null;
    serviceUuid = found.id;
  }

  const { data, error } = await supabase
    .from("services")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      price,
      price_value: priceValue,
      icon: input.icon || "briefcase-outline",
    })
    .eq("id", serviceUuid)
    .eq("professional_id", proUuid)
    .select("id, mock_id, name, description, price, price_value, icon")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  invalidateProfessionalsCache();
  return mapServiceRow(data);
}

export async function deleteMyService(
  professionalId: string,
  serviceId: string,
): Promise<boolean> {
  const proUuid = toUuid("professional", professionalId);

  let serviceUuid = serviceId;
  if (!serviceId.includes("-") || serviceId.startsWith("s")) {
    const { data: found } = await supabase
      .from("services")
      .select("id")
      .eq("professional_id", proUuid)
      .or(`mock_id.eq.${serviceId},id.eq.${serviceId}`)
      .maybeSingle();
    if (!found) return false;
    serviceUuid = found.id;
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceUuid)
    .eq("professional_id", proUuid);

  if (error) throw error;
  invalidateProfessionalsCache();
  return true;
}

export async function resolveMyProfessionalMockId(): Promise<string | null> {
  const s = await loadSessionUser();
  return s?.professionalId ?? null;
}
