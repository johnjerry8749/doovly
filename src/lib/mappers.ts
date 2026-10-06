/**
 * DB ↔ app shape mappers.
 * Keep service return types stable; map inside services/* only.
 */

import type { BookingStatus } from "@/services/bookings";

/** DB booking.status (lowercase) → app BookingStatus */
export type DbBookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

const BOOKING_STATUS_TO_APP: Record<string, BookingStatus> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

const BOOKING_STATUS_TO_DB: Record<BookingStatus, DbBookingStatus> = {
  Pending: "pending",
  Accepted: "accepted",
  Declined: "declined",
};

export function bookingStatusToApp(
  db: string | null | undefined,
): BookingStatus {
  const key = (db ?? "pending").toLowerCase();
  return BOOKING_STATUS_TO_APP[key] ?? "Pending";
}

export function bookingStatusToDb(app: BookingStatus): DbBookingStatus {
  return BOOKING_STATUS_TO_DB[app] ?? "pending";
}

/** Admin / verification status casing */
export type DbVerificationStatus = "pending" | "verified" | "rejected";
export type AppVerificationStatus = "Pending" | "Verified" | "Rejected";

export function verificationStatusToApp(
  db: string | null | undefined,
): AppVerificationStatus {
  const key = (db ?? "pending").toLowerCase();
  if (key === "verified") return "Verified";
  if (key === "rejected") return "Rejected";
  return "Pending";
}

export function verificationStatusToDb(
  app: AppVerificationStatus,
): DbVerificationStatus {
  return app.toLowerCase() as DbVerificationStatus;
}

/** Subscription plan / status */
export type DbPlanCode = "free" | "pro";
export type AppPlan = "Free" | "Pro";
export type DbSubStatus = "active" | "expired" | "cancelled";
export type AppSubStatus = "Active" | "Expired" | "Cancelled";

export function planCodeToApp(db: string | null | undefined): AppPlan {
  return (db ?? "free").toLowerCase() === "pro" ? "Pro" : "Free";
}

export function planCodeToDb(app: AppPlan): DbPlanCode {
  return app === "Pro" ? "pro" : "free";
}

export function subStatusToApp(db: string | null | undefined): AppSubStatus {
  const key = (db ?? "active").toLowerCase();
  if (key === "expired") return "Expired";
  if (key === "cancelled") return "Cancelled";
  return "Active";
}

export function subStatusToDb(app: AppSubStatus): DbSubStatus {
  return app.toLowerCase() as DbSubStatus;
}


/** Local require number, remote { uri }, or null */
export function resolveImageSource(
  imageUrl: string | null | undefined,
  imageKey?: string | null,
): number | { uri: string } | null {
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) return { uri: imageUrl };
  return null;
}

export function resolveImageSources(
  keys: string[] | null | undefined,
  urls?: string[] | null,
): Array<number | { uri: string }> {
  return (urls ?? [])
    .map((u) => resolveImageSource(u))
    .filter((x): x is number | { uri: string } => x != null);
}

/** Admin notification status */
export function adminNotifStatusToApp(
  db: string | null | undefined,
): "Sent" | "Scheduled" | "Failed" {
  const key = (db ?? "sent").toLowerCase();
  if (key === "scheduled") return "Scheduled";
  if (key === "failed") return "Failed";
  return "Sent";
}

export function adminNotifStatusToDb(
  app: "Sent" | "Scheduled" | "Failed",
): "sent" | "scheduled" | "failed" {
  return app.toLowerCase() as "sent" | "scheduled" | "failed";
}
