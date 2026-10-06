/**
 * In-app notifications — Supabase source of truth.
 * Keeps the existing screen-facing API and adds local cache for offline reads.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { loadSessionUser, getCachedSessionUser } from "@/lib/session";
import { mapNotificationRow } from "@/lib/rowMappers";
import type { Notification, NotifType } from "@/data/notifications";

export type { Notification, NotifType };
const CACHE_KEY = "doovly_notifications_cache_v1";
const PENDING_READS_KEY = "doovly_notifications_pending_reads_v1";
let cache: Notification[] = [];
let loaded = false;
let loading: Promise<Notification[]> | null = null;

export function getCurrentUserId(): string {
  return getCachedSessionUser()?.uuid ?? "";
}

async function readLocal(): Promise<Notification[]> {
  try { const raw = await AsyncStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

async function writeLocal(list: Notification[]) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0, 100))); } catch {}
}

async function readPendingReads(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_READS_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

async function writePendingReads(ids: string[]) {
  try { await AsyncStorage.setItem(PENDING_READS_KEY, JSON.stringify([...new Set(ids)])); } catch {}
}

function isNetworkError(error: any): boolean {
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("networkerror") ||
    msg.includes("offline") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("aborted") ||
    msg.includes("connection refused") ||
    msg.includes("connection reset")
  );
}

async function fetchMine(): Promise<Notification[]> {
  const s = await loadSessionUser();
  if (!s) { cache = await readLocal(); loaded = true; return cache; }
  const { data, error } = await supabase.from("notifications")
    .select("id,user_id,type,title,body,time_label,unread,avatar_url,created_at")
    .eq("user_id", s.uuid).order("created_at", { ascending:false });
  if (error) {
    cache = await readLocal(); loaded = true; return cache;
  }
  const pendingReads = await readPendingReads();
  const pendingSet = new Set(pendingReads);
  cache = (data ?? []).map(mapNotificationRow).map((n) =>
    pendingSet.has(n.id) ? { ...n, unread: false } : n,
  );
  loaded = true;
  await writeLocal(cache);
  if (pendingReads.length) void syncPendingReads(pendingReads);
  return cache;
}

export async function ensureNotificationsLoaded(): Promise<Notification[]> {
  if (loaded) return cache;
  if (!loading) loading = fetchMine().finally(() => { loading = null; });
  return loading;
}

export function getNotificationsByUserId(userId: string): Notification[] {
  if (!loaded) void ensureNotificationsLoaded();
  return cache.filter(n => n.userId === String(userId));
}

export async function getNotificationsByUserIdAsync(userId: string): Promise<Notification[]> {
  await ensureNotificationsLoaded(); return cache.filter(n => n.userId === String(userId));
}

export function getMyNotifications(): Notification[] { if (!loaded) void ensureNotificationsLoaded(); return cache; }
export async function getMyNotificationsAsync(): Promise<Notification[]> {
  return ensureNotificationsLoaded();
}

export async function refreshNotificationsAsync(): Promise<Notification[]> {
  loaded = false;
  cache = [];
  return fetchMine();
}

export function getUnreadCount(userId?: string): number {
  const uid = userId ?? getCurrentUserId();
  return getNotificationsByUserId(uid).filter(n => n.unread).length;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const s = await loadSessionUser();
  if (!s) return;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", s.uuid);

  if (error) throw error;

  cache = cache.filter((n) => n.id !== notificationId);
  await writeLocal(cache);
}

async function syncPendingReads(ids: string[]): Promise<void> {
  const s = await loadSessionUser();
  if (!s || !ids.length) return;

  const remaining: string[] = [];
  for (const id of ids) {
    try {
      const { error } = await supabase.from("notifications").update({ unread:false })
        .or(`id.eq.${id},mock_id.eq.${id}`).eq("user_id", s.uuid);
      if (error) {
        if (isNetworkError(error)) remaining.push(id);
      }
    } catch (error) {
      if (isNetworkError(error)) remaining.push(id);
    }
  }

  await writePendingReads(remaining);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  // Mark locally first so opening a notification immediately clears the unread dot,
  // even when the device is offline. The server state is synchronized when possible.
  cache = cache.map(n => n.id === notificationId ? {...n, unread:false} : n);
  await writeLocal(cache);

  const pending = await readPendingReads();
  await writePendingReads([...pending, notificationId]);

  const s = await loadSessionUser();
  if (!s) return;

  try {
    const { error } = await supabase.from("notifications").update({ unread:false })
      .or(`id.eq.${notificationId},mock_id.eq.${notificationId}`).eq("user_id", s.uuid);
    if (error) {
      if (isNetworkError(error)) return;
      throw error;
    }

    await writePendingReads((await readPendingReads()).filter((id) => id !== notificationId));
  } catch (error) {
    if (isNetworkError(error)) return;
    throw error;
  }
}

export type InAppNotificationInput = { userId:string; type:NotifType; title:string; body:string };

export async function addInAppNotification(input: InAppNotificationInput): Promise<Notification> {
  const { data, error } = await supabase.from("notifications").insert({
    user_id: input.userId, type: input.type, title: input.title, body: input.body, unread:true,
  }).select("id,mock_id,user_id,type,title,body,time_label,unread,avatar_url,created_at").single();
  if (error) throw error;
  const row = mapNotificationRow(data); cache = [row, ...cache.filter(n => n.id !== row.id)]; loaded = true; await writeLocal(cache); return row;
}

export async function clearAllNotifications(userId?: string): Promise<void> {
  const s = await loadSessionUser();
  const uid = userId || s?.uuid;
  if (!uid) return;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", uid);

  if (error) throw error;

  cache = cache.filter((n) => n.userId !== String(uid));
  await writeLocal(cache);
}

export async function markAllNotificationsRead(userId?: string): Promise<void> {
  const s = await loadSessionUser(); const uid = userId || s?.uuid; if (!uid) return;
  const { error } = await supabase.from("notifications").update({unread:false}).eq("user_id", uid);
  if (error) throw error;
  cache = cache.map(n => n.userId === String(uid) ? {...n,unread:false} : n); await writeLocal(cache);
}

export function invalidateNotificationsCache() { loaded = false; cache = []; }

export async function notifySubscribedProsInArea(input:{city:string;title:string;body:string}): Promise<number> {
  const city = input.city.trim().toLowerCase(); if (!city) return 0;
  const { data, error } = await supabase.from("professionals").select("user_id,city,subscribed").eq("subscribed",true);
  if (error) throw error;
  const ids = (data ?? []).filter(p => {
    const c = String(p.city ?? "").toLowerCase(); return c.includes(city) || city.includes(c);
  }).map(p => p.user_id).filter(Boolean);
  let count = 0;
  for (const userId of [...new Set(ids)]) {
    await addInAppNotification({userId, type:"general", title:input.title, body:input.body}); count++;
  }
  return count;
}
