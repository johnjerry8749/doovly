import { supabase } from "@/lib/supabase";

export type NotificationChannel = "in-app" | "email" | "sms";
export type NotificationAudience = "all" | "verified" | "subscribed" | "free";
export type NotificationStatus = "Sent" | "Scheduled" | "Failed";
export type AdminNotification = { id:string; title:string; message:string; channels:NotificationChannel[]; sentTo:NotificationAudience; sentToLabel:string; status:NotificationStatus; link?:string; sentAt:string; createdAt:string };

export type SendAdminNotificationInput = { title:string; message:string; channels:NotificationChannel[]; sentTo:NotificationAudience; link?:string };
export type SendAdminNotificationResult = { notification:AdminNotification; inAppRecipientCount:number; systemNotificationShown:boolean };
export type SendInAppToUserInput = { userId:string; title:string; message:string };
export type SendInAppToUserResult = { ok:true; inboxUserId:string; systemNotificationShown:boolean };

const labels:Record<NotificationAudience,string>={all:"All Users",verified:"Verified Users",subscribed:"Subscribed Users",free:"Free Users"};
export const AUDIENCE_LABELS=labels;
let audienceCache:{id:string;verified:boolean;pro:boolean;suspended:boolean}[]=[];

async function audienceIds(audience:NotificationAudience){
 const {data,error}=await supabase.from("profiles").select("id,is_suspended,professionals(is_verified,professional_subscriptions(status))");
 if(error) throw error;
 return (data??[]).filter((p:any)=>{
   if(p.is_suspended)return false;
   const pro=Array.isArray(p.professionals)?p.professionals[0]:p.professionals;
   const verified=Boolean(pro?.is_verified);
   const subscribed=Array.isArray(pro?.professional_subscriptions) && pro.professional_subscriptions.some((s:any)=>s.status==="active");
   return audience==="all" || (audience==="verified"&&verified) || (audience==="subscribed"&&subscribed) || (audience==="free"&&!subscribed);
 }).map((p:any)=>p.id);
}
export async function resolveAudienceUsersAsync(audience:NotificationAudience){ return audienceIds(audience); }
export function resolveAudienceUsers(_audience:NotificationAudience): any[] { return audienceCache; }

function map(row:any):AdminNotification{return{id:row.id,title:row.title,message:row.message,channels:(row.channels??[]) as NotificationChannel[],sentTo:(row.sent_to??"all") as NotificationAudience,sentToLabel:row.sent_to_label??labels[row.sent_to as NotificationAudience]??"All Users",status:(row.status??"Sent") as NotificationStatus,link:row.link??undefined,sentAt:row.sent_at??row.created_at,createdAt:row.created_at};}

export async function listAdminNotifications():Promise<AdminNotification[]>{
 const {data,error}=await supabase.from("admin_notifications").select("id,title,message,channels,sent_to,sent_to_label,status,link,sent_at,created_at").order("created_at",{ascending:false});
 if(error) throw error; return (data??[]).map(map);
}

export async function sendAdminNotification(input:SendAdminNotificationInput):Promise<SendAdminNotificationResult>{
 const recipients=input.channels.includes("in-app")?await audienceIds(input.sentTo):[];
 const {data,error}=await supabase.from("admin_notifications").insert({title:input.title.trim(),message:input.message.trim(),channels:input.channels,sent_to:input.sentTo,sent_to_label:labels[input.sentTo],status:"Sent",link:input.link?.trim()||null,sent_at:new Date().toISOString()}).select("id,title,message,channels,sent_to,sent_to_label,status,link,sent_at,created_at").single();
 if(error) throw error;
 if(input.channels.includes("in-app")&&recipients.length){
   const rows=recipients.map(user_id=>({user_id,type:"general",title:input.title.trim(),body:input.message.trim(),unread:true,data:input.link?{link:input.link}:null}));
   const n=await supabase.from("notifications").insert(rows);
   if(n.error) throw n.error;
 }
 return {notification:map(data),inAppRecipientCount:recipients.length,systemNotificationShown:false};
}

export async function sendInAppToUser(input:SendInAppToUserInput):Promise<SendInAppToUserResult>{
 const {error}=await supabase.from("notifications").insert({user_id:input.userId,type:"general",title:input.title.trim(),body:input.message.trim(),unread:true});
 if(error) throw error;
 return {ok:true,inboxUserId:input.userId,systemNotificationShown:false};
}
