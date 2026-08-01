import { AIProvider, AISummaryResult, AIReplyResult } from "./types";

export class OpenRouterProvider implements AIProvider {
  async generateLeadSummary(conversationText: string): Promise<AISummaryResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { summary: "OpenRouter API key not configured", score: 0, intent: "COLD" };
    }
    
    try {
      const prompt = `Analyze this conversation and return a JSON object with "summary", "score" (0-100), and "intent" ("HOT"|"WARM"|"COLD"|"QUOTATION_REQUIRED").
Conversation:
${conversationText}`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });
      
      const resJson = await response.json();
      const text = resJson.choices?.[0]?.message?.content || "{}";
      const result = JSON.parse(text);
      
      return {
        summary: result.summary || "No summary generated",
        score: Number(result.score) || 50,
        intent: result.intent || "WARM"
      };
    } catch (e: any) {
      console.error("OpenRouter summary exception:", e);
      return { summary: `OpenRouter exception: ${e.message}`, score: 50, intent: "WARM" };
    }
  }

  async suggestReply(conversationHistory: string, incomingMessage: string): Promise<AIReplyResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { replySuggestion: "OpenRouter API key not configured" };
    }
    
    try {
      const prompt = `Suggest a response under 3 sentences for the last message based on the history.
History:
${conversationHistory}
Last message: ${incomingMessage}`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      const resJson = await response.json();
      const replySuggestion = resJson.choices?.[0]?.message?.content || "How can I assist you?";
      return { replySuggestion: replySuggestion.trim() };
    } catch (e) {
      return { replySuggestion: "Could not generate reply suggestion." };
    }
  }
}
