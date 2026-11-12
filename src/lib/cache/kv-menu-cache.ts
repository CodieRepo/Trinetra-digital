export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

const DEFAULT_TTL_SECONDS = 60;

function versionKey(restaurantId: string): string {
  return `menu:ver:${restaurantId}`;
}

function menuEntryKey(restaurantId: string, version: string, tableToken: string): string {
  return `menu:v${version}:${restaurantId}:${tableToken}`;
}

async function getRestaurantMenuVersion(kv: KVNamespaceLike, restaurantId: string): Promise<string> {
  const existing = await kv.get(versionKey(restaurantId));
  return existing || "1";
}

/**
 * Reads a cached QR menu payload from Cloudflare KV using per-restaurant versioning.
 * Safely returns null when KV is unavailable (e.g. local Next.js dev).
 */
export async function getCachedMenuPayload<T>(
  kv: KVNamespaceLike | null | undefined,
  restaurantId: string,
  tableToken: string
): Promise<T | null> {
  if (!kv || !restaurantId || !tableToken) return null;
  try {
    const version = await getRestaurantMenuVersion(kv, restaurantId);
    const raw = await kv.get(menuEntryKey(restaurantId, version, tableToken));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[kv-menu-cache] read skipped:", err);
    return null;
  }
}

/**
 * Stores a public QR menu response in Cloudflare KV with automatic TTL (minimum 60s per KV rules).
 */
export async function setCachedMenuPayload<T>(
  kv: KVNamespaceLike | null | undefined,
  restaurantId: string,
  tableToken: string,
  payload: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  if (!kv || !restaurantId || !tableToken) return;
  try {
    const version = await getRestaurantMenuVersion(kv, restaurantId);
    const safeTtl = Math.max(60, Math.floor(ttlSeconds));
    await kv.put(menuEntryKey(restaurantId, version, tableToken), JSON.stringify(payload), {
      expirationTtl: safeTtl,
    });
  } catch (err) {
    console.warn("[kv-menu-cache] write skipped:", err);
  }
}

/**
 * Immediately invalidates all cached QR menu entries for a restaurant by bumping its KV version.
 */
export async function invalidateRestaurantMenuCache(
  kv: KVNamespaceLike | null | undefined,
  restaurantId: string
): Promise<void> {
  if (!kv || !restaurantId) return;
  try {
    const nextVersion = String(Date.now());
    await kv.put(versionKey(restaurantId), nextVersion);
  } catch (err) {
    console.warn("[kv-menu-cache] invalidation skipped:", err);
  }
}
