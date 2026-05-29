import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const hasApiKey = apiKey && apiKey !== 'YOUR_GEMINI_API_KEY';

interface AIQualificationResult {
  ai_score: number;
  ai_budget: boolean;
  ai_summary: string;
  suggested_reply: string;
}

export async function qualifyLead(
  leadName: string,
  service: string,
  source: string,
  chatHistory: Array<{ role: 'user' | 'model'; text: string }> = []
): Promise<AIQualificationResult> {
  if (!hasApiKey) {
    console.warn('⚠️ GEMINI_API_KEY is not configured or using template value. Using lightweight AI mock qualification fallback.');
    
    // Calculate a mock score based on data richness
    const hasGenuineness = chatHistory.length > 0;
    const score = hasGenuineness ? 92 : 78;
    const summary = chatHistory.length > 0 
      ? `Mock AI Analysis: Lead ${leadName} responded directly with active details. Intent: High. Scope fits our core CRM offering.`
      : `Mock AI Analysis: New inbound lead captured from ${source} expressing initial interest in: ${service || 'AI Automation'}.`;

    const chatReply = chatHistory.length > 0
      ? `Thanks for sharing that, ${leadName}! Managing that process manually takes a lot of time. Our custom WhatsApp CRM integration is built precisely to automate that lead flow. Would you like to check out a live demonstration of how we set this up? Here is a direct link to book a 15-minute slot: https://calendly.com/trinetra-demo`
      : `Hi ${leadName}! I'm Trinetra's AI assistant. 🚀 I saw you're interested in our ${service || 'AI Automation'} solutions. To ensure I give you the absolute best advice, what is the biggest manual workflow bottleneck your business is currently facing?`;

    return {
      ai_score: score,
      ai_budget: hasGenuineness,
      ai_summary: summary,
      suggested_reply: chatReply
    };
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construct history presentation
    const historyText = chatHistory.map(h => `${h.role === 'user' ? 'Client' : 'AI Assistant'}: ${h.text}`).join('\n');

    const prompt = `
You are the Lead Systems & AI Qualification Specialist for Trinetra Digital Solution.
Trinetra is a premium AI Automation Infrastructure and WhatsApp CRM Provider.

Analyze the following lead data and return a JSON object with qualifications.

Lead Name: ${leadName}
Source Platform: ${source}
Service of Interest: ${service || 'AI Automation Solutions'}

WhatsApp Conversation History (if any):
${historyText || 'No WhatsApp replies received yet. This is the first outbound contact.'}

Your task is to:
1. Calculate a score (0 to 100) representing qualification level.
   - High scores (80+) mean they are clear about their needs, represent an active business, or want to solve specific bottlenecks.
   - Normal scores (60-80) for new inbound leads with basic details.
2. Determine if their budget/intent is qualified (boolean: true/false). If they show direct intent to set up or automate workflows, set true.
3. Write a concise 1-2 sentence AI summary of their intent.
4. Compose a suggested conversational WhatsApp reply.
   - Use a warm, premium, helpful, non-pushy tone.
   - Keep it short (2-3 sentences max).
   - Use formatting (like *bold* for emphasis).
   - If they haven't replied yet, ask a simple, engaging, open-ended question about their biggest manual workflow bottleneck.
   - If they have replied, acknowledge their pain point directly and gently invite them to schedule a brief live demo at: https://calendly.com/trinetra-demo.

CRITICAL: Return ONLY a valid JSON object. Do not include markdown code blocks or text outside the JSON. Match this schema exactly:
{
  "ai_score": number,
  "ai_budget": boolean,
  "ai_summary": "string",
  "suggested_reply": "string"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Parse JSON cleanly, stripping any markdown wrappers if the model generated them
    const cleanJsonText = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsedResult = JSON.parse(cleanJsonText) as AIQualificationResult;
    
    return parsedResult;
  } catch (error) {
    console.error('Error during Gemini qualification execution:', error);
    // Secure fallback on parse/network error
    return {
      ai_score: 75,
      ai_budget: false,
      ai_summary: `AI Evaluation encountered an error: ${(error as Error).message}. Active recovery: defaulted score to baseline.`,
      suggested_reply: `Hi ${leadName}! Thanks for reaching out. We received your interest in our ${service || 'AI Automation'} setups. What is the best time for us to have a quick call today?`
    };
  }
}
