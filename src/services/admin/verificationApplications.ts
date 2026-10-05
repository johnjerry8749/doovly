import { supabase } from "@/lib/supabase";

export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type VerificationDocument = {id:string;title:string;fileName:string;type:"image"|"pdf";preview?:any;fileUrl?:string};
export type VerificationApplication = {id:string;name:string;profession:string;location:string;email:string;phone:string;status:VerificationStatus;submittedOn:string;avatar:any;documents:VerificationDocument[]};

let cache:VerificationApplication[]=[];
function map(row:any):VerificationApplication {
  const p=Array.isArray(row.professionals)?row.professionals[0]:row.professionals;
  const docs=(row.verification_documents??[]).map((d:any)=>({id:d.id,title:d.title??"Document",fileName:d.file_name??"",type:d.doc_type==="image"?"image":"pdf",preview:d.file_url?{uri:d.file_url}:undefined,fileUrl:d.file_url}));
  return {id:row.id,name:row.profiles?.full_name??"Unnamed User",profession:p?.profession??"Professional",location:row.profiles?.city??p?.city??"",email:row.email??row.profiles?.email??"",phone:row.phone??row.profiles?.phone??"",status:(row.status??"Pending") as VerificationStatus,submittedOn:row.submitted_on??row.created_at??"",avatar:row.profiles?.avatar_url?{uri:row.profiles.avatar_url}:undefined,documents:docs};
}
export async function listVerificationApplicationsAsync(){const {data,error}=await supabase.from("verification_applications").select("id,professional_id,user_id,status,submitted_on,email,phone,created_at,professionals:professional_id(profession,city,user_id),profiles:user_id(full_name,email,phone,city,avatar_url),verification_documents(id,title,file_name,doc_type,file_url)").order("created_at",{ascending:false});if(error)throw error;cache=(data??[]).map(map);return cache;}
export function listVerificationApplications(){return cache;}
export function getVerificationStats(list=cache){return {total:list.length,pending:list.filter(x=>x.status==="Pending").length,verified:list.filter(x=>x.status==="Verified").length,rejected:list.filter(x=>x.status==="Rejected").length};}
export async function updateVerificationStatus(id:string,status:VerificationStatus){const {data,error}=await supabase.from("verification_applications").update({status}).eq("id",id).select("id,professional_id,user_id,status,submitted_on,email,phone,created_at,professionals:professional_id(profession,city,user_id),profiles:user_id(full_name,email,phone,city,avatar_url),verification_documents(id,title,file_name,doc_type,file_url)").single();if(error)throw error;const item=map(data);cache=cache.map(x=>x.id===id?item:x);if(status==="Verified"){const p=await supabase.from("verification_applications").select("professional_id").eq("id",id).single();if(p.data?.professional_id) await supabase.from("professionals").update({is_verified:true}).eq("id",p.data.professional_id);}return item;}
export async function bulkUpdateVerificationStatus(ids:string[],status:VerificationStatus){if(!ids.length)return;const {error}=await supabase.from("verification_applications").update({status}).in("id",ids);if(error)throw error;await listVerificationApplicationsAsync();}
