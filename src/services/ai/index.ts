import { AIProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenRouterProvider } from "./openrouter";
import { CloudflareWorkersAiProvider, type WorkersAiBindingLike } from "./cloudflare";

export * from "./types";

/**
 * Returns the configured AI provider for CRM insights only.
 * This is NEVER used for WhatsApp messaging — BhashSMS handles all messaging.
 * Provider is controlled via AI_PROVIDER env var (default: openrouter).
 */
export function getAIProvider(
  providerType?: string,
  options?: { aiBinding?: WorkersAiBindingLike | null }
): AIProvider {
  const provider = providerType ?? process.env.AI_PROVIDER ?? "openrouter";
  switch (provider.toLowerCase()) {
    case "cloudflare":
    case "workers-ai":
      return new CloudflareWorkersAiProvider(options?.aiBinding);
    case "gemini":
      return new GeminiProvider();
    case "openrouter":
    default:
      return new OpenRouterProvider();
  }
}
