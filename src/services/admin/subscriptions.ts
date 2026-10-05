import { supabase } from "@/lib/supabase";

export type SubscriptionPlan = "Pro" | "Free";
export type SubscriptionStatus = "Active" | "Expired" | "Cancelled";
export type SubscriptionUser = {
  id:string; name:string; profession:string; location:string; avatar:any;
  plan:SubscriptionPlan; status:SubscriptionStatus; statusLabel:string; endDate:string;
};

let cache: SubscriptionUser[] = [];
function map(row:any):SubscriptionUser {
  const p = Array.isArray(row.professionals) ? row.professionals[0] : row.professionals;
  const active = row.status === "active";
  const plan = row.plan_code ? "Pro" : "Free";
  const status: SubscriptionStatus = active ? "Active" : row.status === "cancelled" ? "Cancelled" : "Expired";
  return { id:row.id, name:row.profiles?.full_name ?? "Unnamed User", profession:p?.profession ?? "User", location:row.profiles?.city ?? p?.city ?? "", avatar:row.profiles?.avatar_url ? {uri:row.profiles.avatar_url}:undefined, plan, status, statusLabel:active ? (row.end_date ? `Renews ${new Date(row.end_date).toLocaleDateString()}`:"Active") : status, endDate:row.end_date ?? "—" };
}
export async function listSubscriptionsAsync():Promise<SubscriptionUser[]> {
  const {data,error}=await supabase.from("professional_subscriptions").select("id,status,status_label,end_date,plan_code,profiles:user_id(full_name,city,avatar_url),professionals:professional_id(profession)").order("created_at",{ascending:false});
  if(error) throw error; cache=(data??[]).map(map); return cache;
}
export function listSubscriptions(){return cache;}
export function getSubscriptionStats(list=cache){return {total:list.length,pro:list.filter(x=>x.plan==="Pro").length,free:list.filter(x=>x.plan==="Free").length};}
export async function updateSubscription(id:string,input:{plan?:SubscriptionPlan;status?:SubscriptionStatus}) {
  const patch:any={};
  if(input.plan) patch.plan_code=input.plan==="Pro"?"pro":null;
  if(input.status) patch.status=input.status==="Active"?"active":input.status.toLowerCase();
  const {data,error}=await supabase.from("professional_subscriptions").update(patch).eq("id",id).select("id,status,status_label,end_date,plan_code,profiles:user_id(full_name,city,avatar_url),professionals:professional_id(profession)").single();
  if(error) throw error; const item=map(data); cache=cache.map(x=>x.id===id?item:x); return item;
}
