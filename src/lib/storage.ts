// lib/storage.ts
export const LS_KEY = "random-items-pro";

export function safeLoadRaw<T>(key = LS_KEY, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeSave<T>(value: T, key = LS_KEY) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

