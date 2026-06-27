import { AIProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenRouterProvider } from "./openrouter";

export * from "./types";

export function getAIProvider(providerType: string = "gemini"): AIProvider {
  switch (providerType.toLowerCase()) {
    case "openrouter":
      return new OpenRouterProvider();
    case "gemini":
    default:
      return new GeminiProvider();
  }
}
