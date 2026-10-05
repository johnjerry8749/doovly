/**
 * App data readiness — service layer only (no UI / CSS).
 */

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
    try {
      fn(snap);
    } catch (e) {
      console.warn("[dataState] listener", e);
    }
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

export function setDataPhase(
  phase: DataPhase,
  error: string | null = null,
) {
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
  try {
    // @ts-expect-error RN may not have navigator.onLine always
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOnline(false);
      return false;
    }
    setOnline(true);
    return true;
  } catch {
    setOnline(false);
    return false;
  }
}
