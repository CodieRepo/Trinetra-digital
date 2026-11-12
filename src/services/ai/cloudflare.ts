import { AIProvider, AIReplyResult, AISummaryResult } from "./types";

export interface WorkersAiBindingLike {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

const DEFAULT_CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeIntent(val: unknown): AISummaryResult["intent"] {
  const s = String(val || "WARM").toUpperCase();
  if (s === "HOT" || s === "WARM" || s === "COLD" || s === "QUOTATION_REQUIRED") {
    return s;
  }
  return "WARM";
}

export class CloudflareWorkersAiProvider implements AIProvider {
  private readonly aiBinding?: WorkersAiBindingLike | null;
  private readonly model: string;

  constructor(aiBinding?: WorkersAiBindingLike | null, model: string = DEFAULT_CF_MODEL) {
    this.aiBinding = aiBinding;
    this.model = model;
  }

  private async runTextPrompt(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (this.aiBinding) {
      const output = (await this.aiBinding.run(this.model, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      })) as { response?: string };
      return output?.response || null;
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "52ca2c75d5ee0677be20c4d1a1597859";
    const apiToken = process.env.CLOUDFLARE_WORKERS_AI_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    if (!apiToken) {
      return null;
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${this.model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Workers AI HTTP ${res.status}`);
    }

    const json = (await res.json()) as { result?: { response?: string } };
    return json.result?.response || null;
  }

  async generateLeadSummary(conversationText: string): Promise<AISummaryResult> {
    try {
      const raw = await this.runTextPrompt(
        "You are a CRM sales analyst. Respond strictly with valid JSON containing keys: summary (string), score (0-100 number), intent (HOT|WARM|COLD|QUOTATION_REQUIRED).",
        `Analyze this WhatsApp CRM conversation:\n${conversationText}`
      );

      if (!raw) {
        return { summary: "Cloudflare Workers AI not configured", score: 0, intent: "COLD" };
      }

      const parsed = extractJsonObject(raw);
      return {
        summary: String(parsed?.summary || raw.slice(0, 240)),
        score: Math.max(0, Math.min(100, Number(parsed?.score ?? 60) || 60)),
        intent: normalizeIntent(parsed?.intent),
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown Workers AI error";
      console.error("Cloudflare Workers AI summary exception:", message);
      return { summary: `Workers AI fallback error: ${message}`, score: 50, intent: "WARM" };
    }
  }

  async suggestReply(conversationHistory: string, incomingMessage: string): Promise<AIReplyResult> {
    try {
      const raw = await this.runTextPrompt(
        "Draft a concise, polite, professional WhatsApp reply for a business CRM representative.",
        `History:\n${conversationHistory}\n\nLatest customer message:\n${incomingMessage}`
      );

      return {
        replySuggestion: raw?.trim() || "Thank you for contacting Trinetra Digital! How can we assist you today?",
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown Workers AI error";
      console.error("Cloudflare Workers AI reply exception:", message);
      return { replySuggestion: "Thank you for reaching out! Our team will get back to you shortly." };
    }
  }
}
