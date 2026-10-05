import { supabase } from "@/lib/supabase";

export type BillingPeriod = "monthly" | "yearly";
export type PlanFeature = {id:string;label:string};
export type SubscriptionPlanConfig = {id:string;name:string;tagline:string;monthlyPrice:number;yearlyPrice:number;popular:boolean;features:PlanFeature[]};
export type SubscriptionPlansState = {plans:SubscriptionPlanConfig[];yearlySavePercent:number};

export async function getSubscriptionPlans():Promise<SubscriptionPlansState>{
 const {data,error}=await supabase.from("subscription_plans").select("id,mock_id,name,tagline,monthly_price,yearly_price,popular,sort_order,subscription_plan_features(id,label,sort_order)").order("sort_order");
 if(error)throw error;
 const meta=await supabase.from("subscription_plan_meta").select("yearly_save_percent").limit(1).maybeSingle(); if(meta.error)throw meta.error;
 return {plans:(data??[]).map((p:any)=>({id:p.mock_id??p.id,name:p.name??"",tagline:p.tagline??"",monthlyPrice:Number(p.monthly_price??0),yearlyPrice:Number(p.yearly_price??0),popular:Boolean(p.popular),features:(p.subscription_plan_features??[]).sort((a:any,b:any)=>(a.sort_order??0)-(b.sort_order??0)).map((f:any)=>({id:f.id,label:f.label??""}))})),yearlySavePercent:meta.data?.yearly_save_percent??0};
}
export async function saveSubscriptionPlans(state:SubscriptionPlansState):Promise<SubscriptionPlansState>{
 const current=await getSubscriptionPlans();
 for(const p of state.plans){const db=current.plans.find(x=>x.id===p.id);if(!db)continue;const row=await supabase.from("subscription_plans").update({name:p.name,tagline:p.tagline,monthly_price:p.monthlyPrice,yearly_price:p.yearlyPrice,popular:p.popular}).eq("mock_id",p.id);if(row.error)throw row.error;for(const f of p.features){const r=await supabase.from("subscription_plan_features").upsert({id:f.id,plan_id:(await supabase.from("subscription_plans").select("id").eq("mock_id",p.id).single()).data?.id,label:f.label,sort_order:p.features.indexOf(f)});if(r.error)throw r.error;}} 
 const m=await supabase.from("subscription_plan_meta").select("id").limit(1).maybeSingle(); if(m.error)throw m.error;
 if(m.data){const r=await supabase.from("subscription_plan_meta").update({yearly_save_percent:state.yearlySavePercent}).eq("id",m.data.id);if(r.error)throw r.error;}
 return getSubscriptionPlans();
}
export async function updateProPrices(monthlyPrice:number,yearlyPrice:number){const state=await getSubscriptionPlans();const pro=state.plans.find(p=>p.id==="pro");if(!pro)throw new Error("Pro plan not found");pro.monthlyPrice=monthlyPrice;pro.yearlyPrice=yearlyPrice;return saveSubscriptionPlans(state);}
export async function getProMonthlyPrice(){const s=await getSubscriptionPlans();return s.plans.find(p=>p.id==="pro")?.monthlyPrice??0;}
