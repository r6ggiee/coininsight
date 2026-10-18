// Simple in-memory cache with timestamps. The UI always displays the
// "asOf" time so staleness is visible and honest.

interface Entry {
  data: unknown;
  asOf: number;
}

const store = new Map<string, Entry>();

export function getCache<T>(key: string): { data: T; asOf: number } | undefined {
  const e = store.get(key);
  return e ? { data: e.data as T, asOf: e.asOf } : undefined;
}

export function setCache(key: string, data: unknown): void {
  store.set(key, { data, asOf: Date.now() });
}

export function cacheAgeMs(key: string): number | null {
  const e = store.get(key);
  return e ? Date.now() - e.asOf : null;
}

export function isCacheStale(key: string, maxAgeMs: number): boolean {
  const age = cacheAgeMs(key);
  return age === null || age > maxAgeMs;
}

export const BRIEF_TTL_MS = 30 * 60 * 1000; // 30 minutes
