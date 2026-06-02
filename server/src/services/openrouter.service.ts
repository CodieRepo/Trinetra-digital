/**
 * openrouter.service.ts
 * Production-grade OpenRouter AI service for Trinetra WhatsApp CRM
 * 
 * Features:
 * - Model cascade: Gemini Flash → Flash Lite → DeepSeek → Auto
 * - Token cost optimization (compressed context, max_tokens limits)
 * - 20s timeout protection with AbortController
 * - Response dedup cache (60s window)
 * - Human handoff detection
 * - Lead field extraction
 * - Per-call cost tracking
 */

import dotenv from 'dotenv';
dotenv.config();

import { logAuditAction } from '../database/connection';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = process.env.FRONTEND_URL || 'https://trinetradigitalsolution.com';
const SITE_NAME = 'Trinetra Digital Solution';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIContext {
  leadId: string;
  leadName: string;
  leadPhone: string;
  service: string;
  source: string;
  city?: string;
  company?: string;
  currentScore: number;
  conversationSummary: string;        // compressed memory from memory.service
  recentMessages: Array<{             // last 10 messages ONLY
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIResponse {
  reply: string;
  ai_score: number;
  ai_budget: boolean;
  ai_summary: string;
  human_handoff: boolean;
  handoff_reason?: string;
  extracted_fields: {
    name?: string;
    city?: string;
    company?: string;
    budget?: string;
    service_interest?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

// ─── Model cascade definition ─────────────────────────────────────────────────

const MODELS = [
  { id: 'google/gemini-2.5-flash',      max_tokens: 400, cost_in: 0.0000000375,  cost_out: 0.00000015  },
  { id: 'google/gemini-2.5-flash-lite', max_tokens: 350, cost_in: 0.000000010,   cost_out: 0.00000004  },
  { id: 'deepseek/deepseek-chat-v3',    max_tokens: 350, cost_in: 0.0000000275,  cost_out: 0.00000011  },
  { id: 'openrouter/auto',              max_tokens: 300, cost_in: 0.0000001,     cost_out: 0.0000002   },
];

// ─── Response dedup cache (60-second window) ──────────────────────────────────

const responseCache = new Map<string, { result: AIResponse; ts: number }>();
const CACHE_TTL_MS = 60_000;

function getCacheKey(ctx: AIContext): string {
  const lastMsg = ctx.recentMessages[ctx.recentMessages.length - 1]?.content || '';
  return `${ctx.leadId}:${lastMsg.substring(0, 80)}`;
}

// ─── Human handoff detection keywords ────────────────────────────────────────

const HANDOFF_PATTERNS = [
  /\binsaan\b/i, /\bbanda\b/i, /\bhuman\b/i, /\bmanager\b/i,
  /\bowner\b/i,  /\breal person\b/i, /\bactual person\b/i,
  /\bgusse\b/i,  /\bangry\b/i, /\bfed up\b/i, /\bhate\b/i,
  /\brefund\b/i, /\bcancel\b/i, /\bscam\b/i, /\bfraud\b/i,
  /\bcustom price\b/i, /\bquotation\b/i, /\bquote\b/i,
  /\btalklive\b/i, /\btalk to someone\b/i, /\bspeak to\b/i,
  /paisa wapas/i, /\bpaisa wapis\b/i, /\bpaise wapas\b/i,
];

function detectHandoff(text: string): { trigger: boolean; reason: string } {
  for (const pattern of HANDOFF_PATTERNS) {
    if (pattern.test(text)) {
      return { trigger: true, reason: `Keyword match: ${pattern.source}` };
    }
  }
  return { trigger: false, reason: '' };
}

// ─── Token cost estimator ─────────────────────────────────────────────────────

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = MODELS.find(m => m.id === modelId);
  if (!model) return 0;
  return (inputTokens * model.cost_in) + (outputTokens * model.cost_out);
}

// ─── System prompt builder (cacheable — does NOT change per message) ──────────

function buildSystemPrompt(ctx: AIContext): string {
  return `You are Trinetra AI — the intelligent WhatsApp sales assistant for Trinetra Digital Solution, a company that builds AI-powered CRMs, WhatsApp automation, lead management, and business automation systems.

PERSONA:
- Friendly, professional, warm
- Reply in the same language the customer uses (English / Hindi / Hinglish)
- WhatsApp style: short, punchy, conversational
- Never robotic. Never spam. Never reveal you are AI.
- Never make false promises.

CURRENT LEAD:
Name: ${ctx.leadName}
Phone: ${ctx.leadPhone}
Source: ${ctx.source}
Service Interest: ${ctx.service || 'AI Automation'}
${ctx.city ? `City: ${ctx.city}` : ''}
${ctx.company ? `Company: ${ctx.company}` : ''}
Current Score: ${ctx.currentScore}/100

CONVERSATION CONTEXT:
${ctx.conversationSummary ? `Summary: ${ctx.conversationSummary}` : 'New conversation — no prior context.'}

QUALIFICATION GOALS:
Collect: Business Name, City, Industry, Monthly Lead Volume, Team Size, Current CRM/Tools, Budget Range, Pain Points, Urgency

SCORING:
1-30 = Cold (browsing) | 31-60 = Warm (nurturing) | 61-80 = Hot (follow up) | 81-100 = FIRE (book now)

RULES:
- Keep replies UNDER 120 words
- Ask only ONE question per message
- If customer is angry, payment-related, or asks for custom price → set human_handoff: true
- Extract any personal/business data mentioned and include in extracted_fields
- Score should increase as more data is collected

RESPOND ONLY WITH THIS EXACT JSON (no markdown, no backticks):
{
  "reply": "<your WhatsApp reply to the customer>",
  "ai_score": <number 1-100>,
  "ai_budget": <true if budget/price mentioned>,
  "ai_summary": "<1-2 sentence running summary of what we know>",
  "human_handoff": <true if angry/payment/custom-quote/explicit request>,
  "handoff_reason": "<reason if human_handoff is true, else null>",
  "extracted_fields": {
    "name": "<if stated>",
    "city": "<if stated>",
    "company": "<if stated>",
    "budget": "<if stated>",
    "service_interest": "<specific service if mentioned>",
    "urgency": "<low|medium|high>"
  }
}`;
}

// ─── Single model attempt ─────────────────────────────────────────────────────

async function callModel(
  model: typeof MODELS[number],
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  attempt: number
): Promise<{ raw: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000); // 20s hard timeout

  try {
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: model.max_tokens,
        response_format: { type: 'json_object' },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json() as any;
    const raw = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    if (!raw) throw new Error('Empty response from model');
    return { raw, usage };

  } finally {
    clearTimeout(timeout);
  }
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function processWithAI(ctx: AIContext): Promise<AIResponse> {
  
  // 0. Validate API key
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 20) {
    console.warn('⚠️ [OPENROUTER] API key missing or invalid. Using emergency template.');
    return emergencyResponse(ctx);
  }

  // 1. Check dedup cache
  const cacheKey = getCacheKey(ctx);
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    console.log(`🗂️ [OPENROUTER] Cache hit for ${ctx.leadName}. Returning cached response.`);
    return cached.result;
  }

  // 2. Check for human handoff trigger in latest message
  const latestUserMsg = ctx.recentMessages
    .filter(m => m.role === 'user')
    .pop()?.content || '';
  
  const handoffCheck = detectHandoff(latestUserMsg);
  if (handoffCheck.trigger) {
    console.log(`🚨 [OPENROUTER] Human handoff triggered for ${ctx.leadName}: ${handoffCheck.reason}`);
    return handoffResponse(ctx, handoffCheck.reason);
  }

  // 3. Build system prompt (same every time for a lead — can be cached by OpenRouter)
  const systemPrompt = buildSystemPrompt(ctx);

  // 4. Cascade through models
  let lastError = '';
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🤖 [OPENROUTER] Trying ${model.id} (attempt ${attempt}/2) for ${ctx.leadName}`);
        
        const { raw, usage } = await callModel(model, systemPrompt, ctx.recentMessages, attempt);
        
        // Parse JSON response
        const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```$/,'').trim();
        const parsed = JSON.parse(cleanJson);
        
        // Validate required fields
        if (!parsed.reply || typeof parsed.ai_score !== 'number') {
          throw new Error('Response missing required fields');
        }

        // Cap the reply to 120 words
        const words = parsed.reply.split(/\s+/);
        if (words.length > 130) {
          parsed.reply = words.slice(0, 120).join(' ') + '...';
        }

        const cost = estimateCost(model.id, usage.prompt_tokens, usage.completion_tokens);
        
        const result: AIResponse = {
          reply: parsed.reply,
          ai_score: Math.min(100, Math.max(0, parsed.ai_score)),
          ai_budget: !!parsed.ai_budget,
          ai_summary: parsed.ai_summary || '',
          human_handoff: !!parsed.human_handoff,
          handoff_reason: parsed.handoff_reason || undefined,
          extracted_fields: parsed.extracted_fields || {},
          model_used: model.id,
          input_tokens: usage.prompt_tokens,
          output_tokens: usage.completion_tokens,
          cost_usd: cost,
        };

        // Store in cache
        responseCache.set(cacheKey, { result, ts: Date.now() });

        await logAuditAction('AI_SUCCESS', 
          `${model.id} | ${ctx.leadName} | Score: ${result.ai_score} | ` +
          `Tokens: ${result.input_tokens}in/${result.output_tokens}out | Cost: $${cost.toFixed(6)}`
        );

        console.log(`✅ [OPENROUTER] ${model.id} success | Score: ${result.ai_score} | Cost: $${cost.toFixed(6)}`);
        return result;

      } catch (err: any) {
        lastError = err?.message || 'Unknown error';
        console.warn(`⚠️ [OPENROUTER] ${model.id} attempt ${attempt} failed: ${lastError.substring(0, 100)}`);
        
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000)); // 1s delay before retry
        }
      }
    }
    
    console.error(`❌ [OPENROUTER] ${model.id} exhausted. Moving to next model.`);
    await logAuditAction('AI_FAILOVER', `${model.id} failed: ${lastError.substring(0, 150)}`);
  }

  // All models failed — use emergency template
  console.error('🚨 [OPENROUTER] All models failed. Activating emergency template.');
  await logAuditAction('AI_EMERGENCY', `All OpenRouter models failed. Last error: ${lastError}`);
  return emergencyResponse(ctx);
}

// ─── Emergency fallback template ──────────────────────────────────────────────

function emergencyResponse(ctx: AIContext): AIResponse {
  return {
    reply: `🙏 Thank you for reaching out to Trinetra Digital Solution!\n\nHum aapki business ko AI aur WhatsApp automation se grow karne mein madad karte hain.\n\nKya aap bata sakte hain:\n• Aapka business kya hai?\n• Kahan se ho aap?\n• Main challenge kya hai?\n\nMain abhi help karta hoon! 😊`,
    ai_score: 30,
    ai_budget: false,
    ai_summary: 'New contact. Emergency template used — AI service temporarily unavailable.',
    human_handoff: false,
    extracted_fields: {},
    model_used: 'emergency_template',
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  };
}

// ─── Human handoff response ───────────────────────────────────────────────────

function handoffResponse(ctx: AIContext, reason: string): AIResponse {
  return {
    reply: `Bilkul! Main aapko abhi hamare expert se connect kar raha hoon. 🙏\n\nHumara team aapko 5-10 minutes mein call/message karega.\n\nAgar urgent ho toh aap directly call kar sakte hain:\n📞 Contact: https://trinetradigitalsolution.com/contact`,
    ai_score: ctx.currentScore,
    ai_budget: false,
    ai_summary: `Customer requested human assistance. Reason: ${reason}`,
    human_handoff: true,
    handoff_reason: reason,
    extracted_fields: {},
    model_used: 'handoff_template',
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  };
}

// ─── Cache cleanup (run every 5 minutes) ─────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of responseCache.entries()) {
    if (now - val.ts > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}, 5 * 60_000);
