import { supabase } from "@/lib/supabase";

export type AdminPromotionPackageInput = {
  code: string;
  name: string;
  durationDays: number;
  productId: string;
  active?: boolean;
  sortOrder?: number;
};

export async function listPromotionPackagesAdminAsync() {
  const { data, error } = await supabase
    .from("promotion_packages")
    .select("id,code,name,duration_days,product_id,active,sort_order,created_at,updated_at")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPromotionPackageAdminAsync(
  input: AdminPromotionPackageInput,
) {
  const { data, error } = await supabase
    .from("promotion_packages")
    .insert({
      code: input.code.trim(),
      name: input.name.trim(),
      duration_days: input.durationDays,
      product_id: input.productId.trim(),
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePromotionPackageAdminAsync(
  id: string,
  input: Partial<AdminPromotionPackageInput>,
) {
  const payload: Record<string, unknown> = {};
  if (input.code !== undefined) payload.code = input.code.trim();
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.durationDays !== undefined) payload.duration_days = input.durationDays;
  if (input.productId !== undefined) payload.product_id = input.productId.trim();
  if (input.active !== undefined) payload.active = input.active;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("promotion_packages")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setPromotionPackageActiveAdminAsync(
  id: string,
  active: boolean,
) {
  return updatePromotionPackageAdminAsync(id, { active });
}
