import test from "node:test";
import assert from "node:assert/strict";
import {
  getCachedMenuPayload,
  setCachedMenuPayload,
  invalidateRestaurantMenuCache,
  type KVNamespaceLike,
} from "../../src/lib/cache/kv-menu-cache";

function createMemoryKV(): KVNamespaceLike {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

test("kv-menu-cache stores, retrieves, and invalidates restaurant menu versions safely", async () => {
  const kv = createMemoryKV();
  const payload = { restaurant: { id: "rest-1" }, categories: [], menuItems: [] };

  await setCachedMenuPayload(kv, "rest-1", "tok-abc", payload, 60);
  const hit = await getCachedMenuPayload(kv, "rest-1", "tok-abc");
  assert.deepEqual(hit, payload);

  // Invalidate bumps restaurant version so stale key is never served
  await invalidateRestaurantMenuCache(kv, "rest-1");
  const afterInvalidate = await getCachedMenuPayload(kv, "rest-1", "tok-abc");
  assert.equal(afterInvalidate, null);
});

test("kv-menu-cache safely no-ops when KV binding is null (local dev)", async () => {
  await setCachedMenuPayload(null, "rest-1", "tok-abc", { ok: true }, 60);
  const miss = await getCachedMenuPayload(null, "rest-1", "tok-abc");
  assert.equal(miss, null);
  await invalidateRestaurantMenuCache(null, "rest-1");
});
