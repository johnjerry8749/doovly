import { supabase } from "@/lib/supabase";

export type DashboardStats={totalUsers:number;totalVerifiedUsers:number;totalProSubUsers:number;openRequests:number;totalRevenueFromPro:number;totalPostRequests:number;totalBookings:number;dateRangeLabel:string;overviewSeries:{label:string;value:number}[]};
let cache:DashboardStats|null=null;

export async function getDashboardStats():Promise<DashboardStats>{
 const [users,verified,subs,posts,bookings,proPlan]=await Promise.all([
  supabase.from("profiles").select("id",{count:"exact",head:true}),
  supabase.from("professionals").select("id",{count:"exact",head:true}).eq("is_verified",true),
  supabase.from("professional_subscriptions").select("id,plan_id,plan_code,status").eq("status","active"),
  supabase.from("service_requests").select("id",{count:"exact",head:true}),
  supabase.from("bookings").select("id",{count:"exact",head:true}),
  supabase.from("subscription_plans").select("id,monthly_price").eq("mock_id","pro").maybeSingle(),
 ]);

 const err=[users,verified,subs,posts,bookings,proPlan].find(r=>r.error)?.error;
 if(err) throw err;

 const proSubs=(subs.data??[]).filter((r:any)=>r.plan_code==="pro"||r.plan_id===proPlan.data?.id);
 const openRequests=posts.count??0;

 const stats:DashboardStats={
  totalUsers:users.count??0,
  totalVerifiedUsers:verified.count??0,
  totalProSubUsers:proSubs.length,
  openRequests,
  totalRevenueFromPro:proSubs.length*Number(proPlan.data?.monthly_price??0),
  totalPostRequests:posts.count??0,
  totalBookings:bookings.count??0,
  dateRangeLabel:"All time",
  overviewSeries:[
   {label:"Users",value:users.count??0},
   {label:"Verified",value:verified.count??0},
   {label:"Pro",value:proSubs.length},
   {label:"Requests",value:posts.count??0},
   {label:"Bookings",value:bookings.count??0},
  ],
 };

 cache=stats;
 return stats;
}

export function getCachedDashboardStats(){return cache;}
