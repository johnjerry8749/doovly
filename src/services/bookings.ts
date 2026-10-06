/**
 * Bookings service — Supabase source of truth.
 */
import { supabase } from "@/lib/supabase";
import { mapBookingRow, BOOKING_SELECT } from "@/lib/rowMappers";
import { bookingStatusToDb } from "@/lib/mappers";
import { loadSessionUser } from "@/lib/session";
export type BookingStatus = "Pending" | "Accepted" | "Declined";

export type Booking = {
  id: string;
  professionalId: string;
  customerId: string;
  title: string;
  professionalName: string;
  professionalVerified: boolean;
  professionalImage: number;
  customerName: string;
  customerImage: number;
  rating: number;
  reviews: number;
  date: string;
  location: string;
  status: BookingStatus;
  amount?: number;
};

export const statusColors: Record<BookingStatus, { bg: string; text: string }> = {
  Pending: { bg: "#E8F8EF", text: "#16A34A" },
  Accepted: { bg: "#DBEAFE", text: "#2563EB" },
  Declined: { bg: "#FEE2E2", text: "#DC2626" },
};
import { getProfessionalById } from "@/services/professionals";
import { notifyBookingRecipient } from "@/services/notifications";

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
  const professionalUuid=input.professionalId;
  const displayDate=input.bookingDate ?? new Date().toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
  const title=input.title.trim();
  const location=input.location.trim();

  // Return the existing active booking instead of creating another order/chat.
  const {data: existing, error: existingError}=await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("customer_id",s.uuid)
    .eq("professional_id",professionalUuid)
    .ilike("title",title)
    .eq("amount",input.amount)
    .ilike("location",location)
    .in("status",["pending","accepted"])
    .order("created_at",{ascending:false})
    .limit(1)
    .maybeSingle();

  if(existingError) throw existingError;
  if(existing) {
    invalidateBookingsCache();
    return mapBookingRow(existing);
  }

  const {data,error}=await supabase.from("bookings").insert({
    customer_id:s.uuid,
    professional_id:professionalUuid,
    title,
    professional_name:input.professionalName,
    customer_name:s.fullName ?? "Customer",
    status:"pending",
    amount:input.amount,
    location,
    display_date:displayDate,
    rating:5,
    reviews_count:0,
  }).select(BOOKING_SELECT).single();

  if(error) {
    // A second tap/request can race the lookup above. The DB unique index
    // protects the order; return the already-created booking in that case.
    if(String(error.code)==="23505") {
      const {data: duplicate,error:duplicateError}=await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("customer_id",s.uuid)
        .eq("professional_id",professionalUuid)
        .ilike("title",title)
        .eq("amount",input.amount)
        .ilike("location",location)
        .in("status",["pending","accepted"])
        .order("created_at",{ascending:false})
        .limit(1)
        .maybeSingle();
      if(duplicateError) throw duplicateError;
      if(duplicate) {
        invalidateBookingsCache();
        return mapBookingRow(duplicate);
      }
    }
    throw error;
  }

  invalidateBookingsCache();
  const booking = mapBookingRow(data);
  const acceptedAutomatically = String((data as any)?.status ?? "").toLowerCase() === "accepted";
  void notifyBookingRecipient({
    kind: "booking",
    bookingId: String((data as any).id),
    title: acceptedAutomatically ? "New Booking Added" : "New Booking Request",
    body: acceptedAutomatically
      ? `${s.fullName ?? "Customer"} added a new booking to your existing conversation.`
      : `${s.fullName ?? "Customer"} sent you a new booking request for ${title}.`,
    data: { type: "booking", screen: "bookings", bookingId: String((data as any).id) },
  });
  return booking;
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
  const uuid=bookingId;
  const {data,error}=await supabase.from("bookings").update({status:bookingStatusToDb(status)}).eq("id", uuid).select(BOOKING_SELECT).maybeSingle();
  if(error) throw error; if(!data)return null; invalidateBookingsCache(); return mapBookingRow(data);
}
