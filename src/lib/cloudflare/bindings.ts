import type { KVNamespaceLike } from "../cache/kv-menu-cache";
import type { WorkersAiBindingLike } from "../../services/ai/cloudflare";

export interface TrinetraCloudflareBindings {
  MENU_CACHE?: KVNamespaceLike;
  RATE_LIMIT_KV?: KVNamespaceLike;
  AI?: WorkersAiBindingLike;
}

/**
 * Safely resolves Cloudflare Worker bindings when running via @opennextjs/cloudflare.
 * Returns null cleanly during standard Node/Next.js dev or Vercel builds.
 */
export async function getCloudflareBindings(): Promise<TrinetraCloudflareBindings | null> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = await mod.getCloudflareContext({ async: true });
    const env = (ctx?.env || {}) as Record<string, unknown>;
    return {
      MENU_CACHE: env.MENU_CACHE as KVNamespaceLike | undefined,
      RATE_LIMIT_KV: env.RATE_LIMIT_KV as KVNamespaceLike | undefined,
      AI: env.AI as WorkersAiBindingLike | undefined,
    };
  } catch {
    return null;
  }
}
