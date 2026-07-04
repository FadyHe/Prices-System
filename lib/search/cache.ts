interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_ENTRIES = 200;
const TTL_MS = 5 * 60 * 1000;

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number = TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function normalizeForCache(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}
