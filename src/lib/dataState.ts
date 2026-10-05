/**
 * App data readiness — service layer only (no UI / CSS).
 */

import { supabase } from "@/lib/supabase";

export type DataPhase = "idle" | "loading" | "ready" | "error" | "offline";

export type DataState = {
  phase: DataPhase;
  error: string | null;
  lastLoadedAt: number | null;
  online: boolean;
};

type Listener = (state: DataState) => void;

let state: DataState = {
  phase: "idle",
  error: null,
  lastLoadedAt: null,
  online: true,
};

const listeners = new Set<Listener>();

function emit() {
  const snap = { ...state };
  listeners.forEach((fn) => {
    try { fn(snap); } catch (e) { console.warn("[dataState] listener", e); }
  });
}

export function getDataState(): DataState {
  return { ...state };
}

export function subscribeDataState(fn: Listener): () => void {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

export function setDataPhase(phase: DataPhase, error: string | null = null) {
  state = {
    ...state,
    phase,
    error,
    lastLoadedAt: phase === "ready" ? Date.now() : state.lastLoadedAt,
  };
  emit();
}

export function setOnline(online: boolean) {
  if (state.online === online) return;
  state = {
    ...state,
    online,
    phase: !online
      ? "offline"
      : state.phase === "offline"
        ? "idle"
        : state.phase,
  };
  emit();
}

export async function checkOnline(): Promise<boolean> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    setOnline(true);
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    // A 401/404 still proves the device can reach Supabase. We only need
    // connectivity here; authentication and RLS are handled by Supabase.
    await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    setOnline(true);
    return true;
  } catch {
    setOnline(false);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
