import { AIProvider, AISummaryResult, AIReplyResult } from "./types";

export class GeminiProvider implements AIProvider {
  async generateLeadSummary(conversationText: string): Promise<AISummaryResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { summary: "Gemini API key not configured", score: 0, intent: "COLD" };
    }
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Analyze the following client conversation and return a JSON object with:
- "summary": a brief 2-sentence summary of what they want.
- "score": lead quality score from 0 (poor) to 100 (excellent).
- "intent": one of: "HOT", "WARM", "COLD", "QUOTATION_REQUIRED".

Conversation:
${conversationText}

Response MUST be a valid JSON object ONLY.`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      const resJson = await response.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const result = JSON.parse(text);
      
      return {
        summary: result.summary || "No summary generated",
        score: Number(result.score) || 50,
        intent: result.intent || "WARM"
      };
    } catch (e: any) {
      console.error("Gemini summary exception:", e);
      return { summary: `Gemini exception: ${e.message}`, score: 50, intent: "WARM" };
    }
  }

  async suggestReply(conversationHistory: string, incomingMessage: string): Promise<AIReplyResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { replySuggestion: "Gemini API key not configured" };
    }
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const prompt = `Based on the conversation history below, suggest a helpful response to the last message.
Keep it under 3 sentences.

History:
${conversationHistory}

Last message: ${incomingMessage}

Suggested reply:`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      
      const resJson = await response.json();
      const replySuggestion = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "How can I assist you?";
      return { replySuggestion: replySuggestion.trim() };
    } catch (e: any) {
      return { replySuggestion: "Sorry, could not generate a reply suggestion." };
    }
  }
}
