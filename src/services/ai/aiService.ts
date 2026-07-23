import { AiProvider } from "../providers/providerInterfaces";
import { AIAnalysisResult } from "../../types/crm";
import { getSupabaseAdmin } from "../../lib/supabase/admin";

export class GeminiAiProvider implements AiProvider {
  key = "gemini";

  async analyzeLead(
    tenant_id: string,
    conversationHistory: string,
    lastMessage: string,
    systemPromptOverride?: string
  ): Promise<AIAnalysisResult> {
    const db = getSupabaseAdmin();

    // 1. Cost Control & Feature Flags Check
    try {
      const { data: config } = await db
        .from("provider_configs")
        .select("config_json, is_active")
        .eq("tenant_id", tenant_id)
        .eq("provider_key", "ai_settings")
        .maybeSingle();

      if (config && config.is_active === false) {
        console.log("ℹ️ AI Processing is disabled for this tenant.");
        return this.fallbackResult(lastMessage);
      }

      if (config?.config_json?.ai_enabled === false) {
        console.log("ℹ️ AI Execution toggled off in provider configs.");
        return this.fallbackResult(lastMessage);
      }
    } catch (e) {}

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY missing. Returning fallback AI intelligence.");
      return this.fallbackResult(lastMessage);
    }

    try {
      let promptTemplate = systemPromptOverride;

      if (!promptTemplate) {
        const { data: dbPrompt } = await db
          .from("ai_prompts")
          .select("system_prompt")
          .eq("tenant_id", tenant_id)
          .eq("prompt_key", "lead_analysis")
          .maybeSingle();

        promptTemplate = dbPrompt?.system_prompt || `Analyze the client conversation and last message below. Return a valid JSON object with:
- "summary": 2-sentence summary of what they want.
- "score": lead score 0 to 100.
- "intent": main client intent (e.g. Website, CRM, Pricing, General Inquiry).
- "leadTemperature": one of "hot", "warm", "cold".
- "suggestedAction": clear immediate action for sales rep under 10 words.`;
      }

      const fullPrompt = `${promptTemplate}\n\nConversation History:\n${conversationHistory}\n\nLast Message: ${lastMessage}\n\nResponse MUST be valid JSON ONLY.`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP Error ${response.status}`);
      }

      const resJson = await response.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(text);

      const leadTemperature = (["hot", "warm", "cold"].includes(parsed.leadTemperature)
        ? parsed.leadTemperature
        : "warm") as "hot" | "warm" | "cold";

      return {
        summary: parsed.summary || "Inquired about services.",
        score: Number(parsed.score) || 60,
        intent: parsed.intent || "General Inquiry",
        leadTemperature,
        suggestedAction: parsed.suggestedAction || "Follow up with client",
      };
    } catch (err: any) {
      console.error("❌ AI Analysis Error:", err);

      // Central System Error Observability Log
      try {
        await db.from("system_error_logs").insert({
          tenant_id,
          provider: "gemini",
          request_payload: { lastMessage },
          exception: err.message || String(err),
        });
      } catch (e) {}

      return this.fallbackResult(lastMessage);
    }
  }

  private fallbackResult(lastMessage: string): AIAnalysisResult {
    const text = lastMessage.toLowerCase();
    let temp: "hot" | "warm" | "cold" = "warm";
    let score = 50;
    let intent = "Inquiry";
    let action = "Call customer within 24h";

    if (text.includes("price") || text.includes("cost") || text.includes("urgent") || text.includes("buy")) {
      temp = "hot";
      score = 85;
      intent = "High Intent Purchase";
      action = "Send quotation & call immediately";
    }

    return {
      summary: `Inbound inquiry: "${lastMessage.slice(0, 100)}"`,
      score,
      intent,
      leadTemperature: temp,
      suggestedAction: action,
    };
  }
}

export const aiService = new GeminiAiProvider();
