/**
 * Bookings service — Supabase source of truth.
 */
import { supabase } from "@/lib/supabase";
import { mapBookingRow, BOOKING_SELECT } from "@/lib/rowMappers";
import { bookingStatusToDb } from "@/lib/mappers";
import { tryToUuid } from "@/lib/ids";
import { loadSessionUser } from "@/lib/session";
import type { Booking, BookingStatus } from "@/data/booking";
import { statusColors } from "@/data/booking";
import { getProfessionalById } from "@/services/professionals";

export type { Booking, BookingStatus };
export { statusColors };
export const BOOKING_LIST_STATUSES: BookingStatus[] = ["Pending","Accepted","Declined"];

let bookedCache: Booking[] | null = null;
let receivedCache: Booking[] | null = null;
let loadPromise: Promise<void> | null = null;

async function fetchBookings() {
  const s = await loadSessionUser();
  if (!s) { bookedCache=[]; receivedCache=[]; return; }
  const { data, error } = await supabase.from("bookings").select(BOOKING_SELECT).order("created_at",{ascending:false});
  if (error) throw error;
  const all=(data??[]).map(mapBookingRow);
  bookedCache=all.filter(b=>String(b.customerId)===String(s.publicId)||String(b.customerId)===String(s.uuid));
  receivedCache=s.professionalId ? all.filter(b=>String(b.professionalId)===String(s.professionalId)||String(b.professionalId)===String(s.professionalUuid)) : [];
}
export async function ensureBookingsLoaded(){if(bookedCache&&receivedCache)return;if(!loadPromise)loadPromise=fetchBookings().finally(()=>{loadPromise=null});await loadPromise;}
export function invalidateBookingsCache(){bookedCache=null;receivedCache=null;}
export function listBookedJobs(){if(!bookedCache)void ensureBookingsLoaded();return bookedCache??[];}
export async function listBookedJobsAsync(){await ensureBookingsLoaded();return bookedCache??[];}
export function listReceivedJobs(){if(!receivedCache)void ensureBookingsLoaded();return receivedCache??[];}
export async function listReceivedJobsAsync(){await ensureBookingsLoaded();return receivedCache??[];}
export function getBookingById(id:string,type:"booked"|"received"="booked"){return (type==="booked"?listBookedJobs():listReceivedJobs()).find(j=>j.id===String(id));}
export function getProfessionalForBooking(booking:Booking){return getProfessionalById(booking.professionalId);}


export async function createBookingRequest(input:{
  professionalId:string;
  professionalName:string;
  title:string;
  amount:number;
  location:string;
  bookingDate?:string;
}):Promise<Booking>{
  const s=await loadSessionUser();
  if(!s) throw new Error("Not logged in");
  const professionalUuid=tryToUuid("professional",input.professionalId) ?? input.professionalId;
  const displayDate=input.bookingDate ?? new Date().toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
  const {data,error}=await supabase.from("bookings").insert({
    customer_id:s.uuid,
    professional_id:professionalUuid,
    title:input.title,
    professional_name:input.professionalName,
    customer_name:s.fullName ?? "Customer",
    status:"pending",
    amount:input.amount,
    location:input.location,
    display_date:displayDate,
    rating:5,
    reviews_count:0,
  }).select(BOOKING_SELECT).single();
  if(error) throw error;
  invalidateBookingsCache();
  return mapBookingRow(data);
}
export async function recordAcceptedOfferBooking(input:{title:string;amount:number;location:string;professionalId:string;professionalName:string;professionalImage:number;customerId:string;customerName:string;customerImage:number;}):Promise<Booking>{
  const s=await loadSessionUser(); if(!s) throw new Error("Not logged in");
  const proUuid=tryToUuid("professional",input.professionalId)??input.professionalId;
  const displayDate=new Date().toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
  const {data,error}=await supabase.from("bookings").insert({customer_id:s.uuid,professional_id:proUuid,title:input.title,professional_name:input.professionalName,customer_name:input.customerName,status:"accepted",amount:input.amount,location:input.location,display_date:displayDate,rating:5,reviews_count:0}).select(BOOKING_SELECT).single();
  if(error) throw error; invalidateBookingsCache(); return mapBookingRow(data);
}

export async function updateBookingStatus(bookingId:string,status:BookingStatus):Promise<Booking|null>{
  const s=await loadSessionUser(); if(!s) throw new Error("Not logged in");
  const uuid=tryToUuid("booking",bookingId)??bookingId;
  const {data,error}=await supabase.from("bookings").update({status:bookingStatusToDb(status)}).or(`id.eq.${uuid},mock_id.eq.${bookingId}`).select(BOOKING_SELECT).maybeSingle();
  if(error) throw error; if(!data)return null; invalidateBookingsCache(); return mapBookingRow(data);
}
