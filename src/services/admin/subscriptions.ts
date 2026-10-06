import { supabase } from "@/lib/supabase";

export type SubscriptionPlan="Pro"|"Free";
export type SubscriptionStatus="Active"|"Expired"|"Cancelled";
export type SubscriptionUser={
  id:string;
  name:string;
  profession:string;
  location:string;
  avatar:any;
  plan:SubscriptionPlan;
  status:SubscriptionStatus;
  statusLabel:string;
  endDate:string;
  userId:string;
  professionalId:string;
};

let cache:SubscriptionUser[]=[];

function map(row:any,profile?:any,pro?:any):SubscriptionUser{
  const active=row.status==="active";
  return {
    id:row.id,
    userId:row.user_id,
    professionalId:row.professional_id,
    name:profile?.full_name??"Unnamed User",
    profession:pro?.profession??"Professional",
    location:profile?.city??pro?.city??"",
    avatar:profile?.avatar_url?{uri:profile.avatar_url}:undefined,
    plan:row.plan_code==="pro"?"Pro":"Free",
    status:active?"Active":row.status==="cancelled"?"Cancelled":"Expired",
    statusLabel:active?(row.end_date?"Renews "+new Date(row.end_date).toLocaleDateString():"Active"):(row.status_label||"Expired"),
    endDate:row.end_date??"—",
  };
}

export async function listSubscriptionsAsync():Promise<SubscriptionUser[]>{
  const [rowsRes,profilesRes,prosRes]=await Promise.all([
    supabase.from("professional_subscriptions").select("id,user_id,professional_id,plan_id,plan_code,status,status_label,end_date,created_at").order("created_at",{ascending:false}),
    supabase.from("profiles").select("id,full_name,city,avatar_url").order("created_at",{ascending:false}),
    supabase.from("professionals").select("id,user_id,profession,city"),
  ]);

  const err=[rowsRes,profilesRes,prosRes].find(r=>r.error)?.error;
  if(err) throw err;

  const rows=rowsRes.data??[];
  const profiles=new Map((profilesRes.data??[]).map((x:any)=>[x.id,x]));
  const pros=new Map((prosRes.data??[]).map((x:any)=>[x.id,x]));
  const subscriptionByProfessional=new Map(rows.map((r:any)=>[r.professional_id,r]));

  const result:SubscriptionUser[]=(prosRes.data??[]).map((professional:any)=>{
    const profile=profiles.get(professional.user_id);
    const existing=subscriptionByProfessional.get(professional.id);

    if(existing) return map(existing,profile,professional);

    return {
      id:`free:${professional.id}`,
      userId:professional.user_id,
      professionalId:professional.id,
      name:profile?.full_name??"Unnamed User",
      profession:professional.profession??"Professional",
      location:profile?.city??professional.city??"",
      avatar:profile?.avatar_url?{uri:profile.avatar_url}:undefined,
      plan:"Free",
      status:"Active",
      statusLabel:"Free",
      endDate:"—",
    };
  });

  cache=result;
  return cache;
}

export function listSubscriptions(){return cache;}

export function getSubscriptionStats(list=cache){
  return {
    total:list.length,
    pro:list.filter(x=>x.plan==="Pro").length,
    free:list.filter(x=>x.plan==="Free").length,
  };
}

export async function updateSubscription(
  id:string,
  input:{plan?:SubscriptionPlan;status?:SubscriptionStatus},
){
  const existing=cache.find(x=>x.id===id);

  if(!existing) throw new Error("Subscription record not found.");

  const plan=input.plan??existing.plan;
  const status=input.status??existing.status;

  const planCode=plan==="Pro"?"pro":"free";
  const statusCode=status==="Active"?"active":status==="Cancelled"?"cancelled":"expired";

  if(id.startsWith("free:")){
    const {data:planRow,error:planError}=await supabase
      .from("subscription_plans")
      .select("id")
      .eq("code",planCode==="pro"?"pro":"basic")
      .maybeSingle();

    if(planError) throw planError;

    const {data,error}=await supabase
      .from("professional_subscriptions")
      .insert({
        professional_id:existing.professionalId,
        user_id:existing.userId,
        plan_id:planRow?.id??null,
        plan_code:planCode,
        status:statusCode,
        status_label:status==="Active"?(plan==="Pro"?"Active":"Free"):status,
      })
      .select("id,user_id,professional_id,plan_id,plan_code,status,status_label,end_date,created_at")
      .single();

    if(error) throw error;

    const { error: professionalError } = await supabase
      .from("professionals")
      .update({ subscribed: planCode === "pro" && statusCode === "active" })
      .eq("id", existing.professionalId);

    if (professionalError) throw professionalError;

    const refreshed=await listSubscriptionsAsync();
    return refreshed.find(x=>x.id===data.id);
  }

  const patch:any={
    plan_code:planCode,
    status:statusCode,
    status_label:status==="Active"?(plan==="Pro"?"Active":"Free"):status,
  };

  if(input.plan){
    const {data:planRow,error:planError}=await supabase
      .from("subscription_plans")
      .select("id")
      .eq("code",planCode==="pro"?"pro":"basic")
      .maybeSingle();

    if(planError) throw planError;
    patch.plan_id=planRow?.id??null;
  }

  const {error}=await supabase
    .from("professional_subscriptions")
    .update(patch)
    .eq("id",id);

  if(error) throw error;

  const { error: professionalError } = await supabase
    .from("professionals")
    .update({ subscribed: planCode === "pro" && statusCode === "active" })
    .eq("id", existing.professionalId);

  if (professionalError) throw professionalError;

  const refreshed=await listSubscriptionsAsync();
  return refreshed.find(x=>x.id===id);
}
