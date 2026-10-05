/**
 * Professionals service — Supabase only.
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
import type { ServiceCategory } from "@/data/serviceCategories";

export type { Professional, ProService, ProReview, ServiceCategory };
export { getDistanceKm, starsFromReviewCount };

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
  if (!cache) void ensureProfessionalsLoaded();
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
  return listProfessionals().find((p) => String(p.id) === String(id));
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

/** Category chips — All exactly once. */
let serviceCategoriesCache: ServiceCategory[] | null = null;

export function listServiceCategories(): ServiceCategory[] {
  const cached = serviceCategoriesCache;
  return cached ?? [{ name: "All", icon: "apps" }];
}

export async function listServiceCategoriesAsync(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from("service_categories")
    .select("name, icon")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  const rows = data
    .map((r) => ({ name: r.name, icon: r.icon || "briefcase-outline" }))
    .filter((c) => c.name !== "All");
  serviceCategoriesCache = [{ name: "All", icon: "apps" }, ...rows];
  return serviceCategoriesCache;
}

export async function addReview(
  professionalId: string,
  payload: { userName: string; comment: string; userId?: string },
): Promise<ProReview> {
  const proUuid = await resolveProfessionalUuid(professionalId);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      professional_id: proUuid,
      user_id: user?.id ?? null,
      user_name: payload.userName.trim() || "Anonymous",
      comment: payload.comment.trim(),
      display_date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    })
    .select("id, mock_id, user_id, user_name, comment, display_date, created_at")
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
  return Number(String(price).replace(/[^0-9.]/g, "")) || 0;
}

function formatPrice(price: string): string {
  const trimmed = price.trim();
  if (trimmed.startsWith("₦")) return trimmed;
  return `₦${Number(price).toLocaleString()}`;
}

export function listMyServices(professionalId: string): ProService[] {
  const pro = getProfessionalById(professionalId);
  return pro ? [...pro.services] : [];
}

export async function listMyServicesAsync(
  professionalId: string,
): Promise<ProService[]> {
  await ensureProfessionalsLoaded();
  return listMyServices(professionalId);
}

async function resolveProfessionalUuid(professionalId: string): Promise<string> {
  const key = String(professionalId);
  const s = await loadSessionUser();
  if (
    s?.professionalUuid &&
    (s.professionalId === key || s.professionalUuid === key || !key)
  ) {
    return s.professionalUuid;
  }
  const mapped = tryToUuid("professional", key);
  if (mapped) return mapped;
  if (key.includes("-") && key.length >= 32) {
    const { data } = await supabase
      .from("professionals")
      .select("id")
      .eq("id", key)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  const { data, error } = await supabase
    .from("professionals")
    .select("id")
    .or(`mock_id.eq.${key},id.eq.${key}`)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(
      "No professional profile found. Sign in as a professional account.",
    );
  }
  return data.id;
}

export async function createMyService(
  professionalId: string,
  input: ServiceInput,
): Promise<ProService> {
  const proUuid = await resolveProfessionalUuid(professionalId);
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
  const proUuid = await resolveProfessionalUuid(professionalId);
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
  const proUuid = await resolveProfessionalUuid(professionalId);

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
