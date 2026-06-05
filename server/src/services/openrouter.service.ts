/**
 * openrouter.service.ts
 * Production-grade OpenRouter AI service for Trinetra WhatsApp CRM
 * 
 * Features:
 * - Model cascade: Gemini Flash â†’ Flash Lite â†’ DeepSeek â†’ Auto
 * - Token cost optimization (compressed context, max_tokens limits)
 * - 20s timeout protection with AbortController
 * - Response dedup cache (60s window)
 * - Human handoff detection
 * - Lead field extraction
 * - Per-call cost tracking
 */

import dotenv from 'dotenv';
import { logAuditAction } from '../database/connection';
import { getKnowledgeBaseBlock, COMPANY, AI_RULES, LEAD_SIGNALS } from '../config/knowledge-base';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = process.env.FRONTEND_URL || 'https://trinetradigitalsolution.com';
const SITE_NAME = 'Trinetra Digital Solution';

// Startup key logging (masked)
const keyLen = OPENROUTER_API_KEY.length;
const maskedKey = keyLen >= 16 
  ? `${OPENROUTER_API_KEY.substring(0, 8)}...${OPENROUTER_API_KEY.substring(keyLen - 8)}`
  : 'invalid_length';
console.log(`🔑 [AI_STARTUP] Loaded OPENROUTER_API_KEY: length=${keyLen}, masked="${maskedKey}"`);
console.log(`🌐 [AI_STARTUP] OpenRouter Base URL: "${OPENROUTER_BASE}"`);

let currentAiProvider: 'OpenRouter' | 'Gemini' | 'EmergencyTemplate' | 'HandoffTemplate' = 'OpenRouter';

export function getActiveAiProvider() {
  return currentAiProvider;
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  totalMessagesCount?: number;
  // New state tracking fields passed to AI prompt
  booking_state?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  active_intent?: string | null;
  active_flow?: string | null;
  last_selected_service?: string | null;
  service_context_count?: number;
}

export interface AIResponse {
  reply: string;
  ai_score: number;
  ai_budget: boolean;
  ai_summary: string;
  ai_summary_detailed?: string;
  intent_level?: 'HOT' | 'WARM' | 'COLD' | 'QUOTATION_REQUIRED';
  recommended_action?: string;
  urgency_level?: 'low' | 'medium' | 'high';
  objections?: string;
  human_handoff: boolean;
  handoff_reason?: string;
  lead_stage: 'greeting' | 'qualifying' | 'recommending' | 'objection' | 'booking' | 'handoff';
  recommended_package: 'launch' | 'growth' | 'ai_sales' | 'custom' | null;
  appointment_requested: boolean;
  opt_out_requested: boolean;
  extracted_fields: {
    name?: string;
    city?: string;
    company?: string;
    business_type?: string;
    budget?: string;
    service_interest?: string;
    urgency?: 'low' | 'medium' | 'high';
    team_size?: string;
    monthly_lead_volume?: string;
    has_website?: boolean;
    has_crm?: boolean;
    is_decision_maker?: boolean;
    current_problems?: string;
  };
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  // State machine fields returned by AI
  booking_state?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  active_intent?: string | null;
  active_flow?: string | null;
  last_selected_service?: string | null;
}

// â”€â”€â”€ Model cascade definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODELS = [
  { id: 'google/gemini-2.5-flash',      max_tokens: 400, cost_in: 0.0000000375,  cost_out: 0.00000015  },
  { id: 'google/gemini-2.5-flash-lite', max_tokens: 350, cost_in: 0.000000010,   cost_out: 0.00000004  },
  { id: 'deepseek/deepseek-chat-v3',    max_tokens: 350, cost_in: 0.0000000275,  cost_out: 0.00000011  },
  { id: 'openrouter/auto',              max_tokens: 300, cost_in: 0.0000001,     cost_out: 0.0000002   },
];

// â”€â”€â”€ Response dedup cache (60-second window) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const responseCache = new Map<string, { result: AIResponse; ts: number }>();
const CACHE_TTL_MS = 60_000;

function getCacheKey(ctx: AIContext): string {
  const lastMsg = ctx.recentMessages[ctx.recentMessages.length - 1]?.content || '';
  return `${ctx.leadId}:${lastMsg.substring(0, 80)}`;
}

// â”€â”€â”€ Human handoff detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RULE: Only trigger handoff for genuine distress/escalation signals.
// NEVER trigger for normal service inquiries or valid Trinetra service names.

// Patterns that suppress handoff for pure service inquiries (no explicit human request):
const SAFE_SERVICE_PATTERNS = [
  /website/i, /web site/i, /landing page/i, /portfolio/i,
  /whatsapp automation/i,
  /\bcrm\b/i, /lead management/i,
  /chatbot/i, /chat bot/i, /ai bot/i,
  /digital marketing/i, /social media/i,
  /follow.?up/i,
  /ai system/i, /business automation/i,
];

// Explicit human-request phrases -- these OVERRIDE safe-service suppression
const EXPLICIT_HUMAN_PATTERNS = [
  /\binsaan chahiye\b/i,
  /\breal person\b/i,
  /\bactual person\b/i,
  /\btalk to (a |an )?(human|person)\b/i,
  /\bspeak to (a |an )?(human|person|agent|someone)\b/i,
  /\bconnect me to\b/i,
  /\bhuman agent\b/i,
  /\bcustomer care\b/i,
];

// Patterns that trigger human handoff â€” genuine escalation only
const HANDOFF_PATTERNS = [
  /\binsaan chahiye\b/i,         // "I want a human" in Hindi (specific phrase)
  /\breal person\b/i,
  /\bactual person\b/i,
  /\btalk to someone\b/i,
  /\bspeak to (?:a )?human\b/i,
  /\bconnect me to\b/i,
  /\bhuman agent\b/i,
  /\bcustomer care\b/i,
  /\bgusse\b.*\bhoon\b/i,        // "I am angry" â€” requires both words
  /\bfed up\b/i,
  /\bpaisa wapas\b/i,
  /\bpaise wapas\b/i,
  /\bpaisa wapis\b/i,
  /\brefund\b/i,
  /\bscam\b/i, /\bfraud\b/i,
  /\bfake\b/i,
  /\bcheat\b/i, /\bcheating\b/i,
  /final (?:price|pricing|quote)/i,    // "final quote/price" â€” explicit closing request
  /\bsign contract\b/i,
  /\bpayment terms\b/i,
];

function detectHandoff(text: string): { trigger: boolean; reason: string } {
  // 1. Explicit Human Request
  for (const explicit of EXPLICIT_HUMAN_PATTERNS) {
    if (explicit.test(text)) {
      return { trigger: true, reason: `Explicit human request: "${explicit.source}"` };
    }
  }

  // 2. Call / Meeting / Consultation / Proposal / Quote Request
  const callMeetingQuotePatterns = [
    /\b(call me|call back|phone call|phone pe|call par|call pe|call kro|call karo|call kar|mujhe call|baat karni|baat krni|baat karwao)\b/i,
    /\b(meeting|zoom|google meet|calendly|appointment|book slot|slot book|schedule meeting|demo call|live demo)\b/i,
    /\b(quote|quotation|proposal|estimate|estimation|rate card|pricing sheet|rate sheet)\b/i,
    /\b(call|phone|callback|mobile)\b/i,
  ];
  for (const pattern of callMeetingQuotePatterns) {
    if (pattern.test(text)) {
      return { trigger: true, reason: `User requested call/meeting/quote/proposal` };
    }
  }

  // 3. User shares phone number, or project/implementation details (NO budget trigger here)
  const detailsPatterns = [
    /\b\d{10}\b/i, // 10 digit phone number
    /\+?\d{1,4}[-.\s]?\d{6,12}\b/i, // international phone number
    /\b(api key|credentials|password|sheet|excel|csv|workflow|database|integration details)\b/i,
  ];
  for (const pattern of detailsPatterns) {
    if (pattern.test(text)) {
      return { trigger: true, reason: `User shared phone number or implementation details` };
    }
  }

  const buyingIntentPatterns = [
    /\b(buy|purchase|order|subscribe|get started|sign up|deal|close deal|start project|want to start|shuru krna|shuru karna|finalise|finalize|onboard|onboarding|interested to start)\b/i,
    /\b(i want this|let's start|lets start|how do we proceed|when can we begin|i am interested|interested in this)\b/i,
  ];
  for (const pattern of buyingIntentPatterns) {
    if (pattern.test(text)) {
      return { trigger: true, reason: `User showed buying intent` };
    }
  }

  for (const safe of SAFE_SERVICE_PATTERNS) {
    if (safe.test(text)) {
      return { trigger: false, reason: '' };
    }
  }

  for (const pattern of HANDOFF_PATTERNS) {
    if (pattern.test(text)) {
      return { trigger: true, reason: `Escalation keyword: "${pattern.source}"` };
    }
  }

  return { trigger: false, reason: '' };
}

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = MODELS.find(m => m.id === modelId);
  if (!model) return 0;
  return (inputTokens * model.cost_in) + (outputTokens * model.cost_out);
}

// ─── Master System Prompt — Trinetra AI Sales Assistant ──────────────────────
// Powered by official Knowledge Base (knowledge-base.ts).
// All pricing, policies, and brand identity are sourced from the KB.

function buildSystemPrompt(ctx: AIContext): string {
  const kb = getKnowledgeBaseBlock();

  const now = new Date();
  const kolkataTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const weekdayStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const currentDateTimeStr = `${kolkataTimeStr} (${weekdayStr}) - Timezone: India Standard Time (IST)`;

  return `You are the official AI Sales Consultant and Business Advisor for Trinetra Digital Solution.
Your name is "Trinetra Assistant". You are knowledgeable, honest, helpful, and consultative.

DO NOT behave like ChatGPT, a survey form, an interviewer, or a robotic chatbot.
Your goal: guide leads to find the best solutions and take the next step with confidence.

${kb}

==================================================
CURRENT LEAD PROFILE & STATE MACHINE CONTEXT
==================================================
Name: ${ctx.leadName}
Phone: ${ctx.leadPhone}
Source: ${ctx.source}
Service Interest: ${ctx.service || 'Not yet identified'}
${ctx.city ? `City: ${ctx.city}` : ''}
${ctx.company ? `Business: ${ctx.company}` : ''}
Current Lead Score: ${ctx.currentScore}/100

- Booking State: ${ctx.booking_state || 'null'} (Possible values: null | 'waiting_for_date' | 'waiting_for_time' | 'confirmed')
- Booking Date: ${ctx.booking_date || 'null'}
- Booking Time: ${ctx.booking_time || 'null'}
- Active Intent: ${ctx.active_intent || 'null'}
- Active Flow: ${ctx.active_flow || 'null'}
- Last Selected Service: ${ctx.last_selected_service || 'null'}
- Service Context Count: ${ctx.service_context_count || 0} (Messages elapsed under active service lock)

Current Local Time: ${currentDateTimeStr}

CONVERSATION CONTEXT:
${ctx.conversationSummary ? `Previous Summary: ${ctx.conversationSummary}` : 'New conversation — greet warmly.'}

==================================================
STATE MACHINE & LOCK CONTEXT RULES (CRITICAL)
==================================================
1. APPOINTMENT BOOKING CONVERSATIONAL STATE MACHINE:
- Trigger: If the customer shows interest in booking a free consultation, setting up a meeting, scheduling a demo, or scheduling a call (e.g. "free consultation book krdo", "call me", "meeting schedule karo", "appointment book kro", "kal 2 baje", "tomorrow afternoon", "next monday 11 am", "parso morning"):
  - Set "active_flow" to "Booking"
  - Set "active_intent" to "Booking Consultation"
  - If date is unknown and NOT mentioned in the current message, transition "booking_state" to "waiting_for_date".
  - If a date and/or time is already mentioned in the current message, parse and normalize them immediately, and if both are resolved, transition "booking_state" to "confirmed" directly.

- Date & Time Parsing & Normalization Rules:
  - You MUST resolve relative days based on the Current Local Time:
    - 'today' / 'aaj' -> today's date: YYYY-MM-DD
    - 'tomorrow' / 'kal' -> tomorrow's date: YYYY-MM-DD (e.g. if today is Friday 2026-06-05, tomorrow/kal resolves to Saturday 2026-06-06)
    - 'day after tomorrow' / 'parso' -> day after tomorrow's date: YYYY-MM-DD (e.g. if today is Friday 2026-06-05, parso/day after tomorrow resolves to Sunday 2026-06-07)
    - 'next monday' -> next Monday's date: YYYY-MM-DD (e.g. if today is Friday 2026-06-05, next monday resolves to Monday 2026-06-08)
    - 'next tuesday' / 'next wednesday' etc. -> next occurrence's date: YYYY-MM-DD
  - You MUST resolve relative/natural times and formats:
    - '2 pm' / '2 baje' / 'tomorrow 2 pm' / 'kal 2 baje' -> '14:00' (or '2:00 PM')
    - 'afternoon' / 'tomorrow afternoon' -> '14:00' (or '2:00 PM', default afternoon to 2:00 PM)
    - '11 am' / 'next monday 11 am' -> '11:00' (or '11:00 AM')
    - 'evening 6 baje' / '6 pm' -> '18:00' (or '6:00 PM')
    - 'morning' / 'parso morning' -> '10:00' (or '10:00 AM', default morning to 10:00 AM)
  - You MUST set the parsed date strictly as 'YYYY-MM-DD' in 'booking_date' (never leave it as relative).
  - You MUST set the parsed time strictly in 'booking_time' (as HH:MM or HH:MM AM/PM).

- Flow Logic:
  - If "booking_state" is "waiting_for_date":
    - If the user mentions a date (or relative day like 'kal', 'parso'), parse and save it in "booking_date". Transition "booking_state" to "waiting_for_time".
    - If a time was ALSO mentioned (e.g. "kal 2 baje"), parse the time, save in "booking_time", and transition "booking_state" to "confirmed" directly.
    - WhatsApp Reply: If only date is parsed: "Perfect, [booking_date] set kar liya hai. Kis time call schedule karein? E.g., 2 PM or 6 PM?"
  - If "booking_state" is "waiting_for_time":
    - If the user mentions a time, parse and save in "booking_time". Transition "booking_state" to "confirmed".
    - WhatsApp Reply: "Great! Aapka free consultation successfully book ho gaya hai: \n📅 Date: [booking_date]\n🕒 Time: [booking_time]\n\nHamare advisor aapse connect karenge. Thank you! 🙏"
- Cancellation: If they cancel or opt out of booking, set "booking_state", "booking_date", and "booking_time" to null.

2. CONVERSATION CONTEXT PROTECTION (10-MESSAGE SERVICE LOCK):
- Trigger: When the user explicitly selects or inquires about a core service (Website, WhatsApp Automation, CRM, Marketing):
  - Set "last_selected_service" to that service (e.g. "Website") and "active_flow" to that service flow.
- Service Context Lock: If "last_selected_service" is active and "service_context_count" is less than 10:
  - You MUST keep all answers and recommendations focused on that active service.
  - If they ask general questions (e.g. "price", "charges", "cost", "how much", "demo", "details"), answer specifically for the "last_selected_service" (e.g. Website package prices, Website demo). Do not automatically switch or offer other services.
  - ONLY switch services if the user explicitly names another service or topic (e.g., "mujhe WhatsApp automation ke baare mein batayein").
  - If you remain locked to that service, you MUST continue returning its name in "last_selected_service" in your JSON response so the backend preserves the lock.

==================================================
CORE BEHAVIOR RULES (MANDATORY)
==================================================
1. PRICING-FIRST RULE: When asked about price, cost, charges, or packages — immediately provide pricing from the OFFICIAL PACKAGE PRICING section above. Never hide pricing or force qualification before showing pricing.

2. BENEFITS-FIRST RECOMMENDATION: When a user mentions their business type:
   - Lead with the business OUTCOME (e.g., "more appointments without manual booking")
   - Then explain the solution
   - Then state the package name and pricing clearly
   - Offer ONE primary recommendation + ONE optional upgrade path
   - Never suggest two packages as equal alternatives

3. HOT LEAD SIGNALS: Score above 75 and/or asking for pricing/quotation/proposal/demo:
   ${LEAD_SIGNALS.hot.slice(0,4).join(' | ')}

4. BUDGET HANDLING: If user shares budget:
   - Find the best fitting package from official pricing
   - Explain business benefits
   - Offer free consultation as next step
   - Ask exactly ONE follow-up question max
   - Do NOT trigger handoff on budget mentions alone

5. OBJECTION RESPONSES (use these when applicable):
   - "Too expensive": Compare to cost of missed leads. Starter = ₹14,999 setup + ₹2,999/month — less than 1-2 missed conversions.
   - "No guarantee": We are transparent — no lead/ranking guarantees. We guarantee professional delivery, clean code, and strategic execution.
   - "Need to think": "Bilkul! Free 30-minute consultation available — koi pressure nahi. Kab convenient hoga aapko?"
   - "Already have developer": We offer website + CRM + marketing under one roof — integrated systems.

6. ONE QUESTION RULE: Ask at most ONE question per response. Never stack multiple questions.

7. LANGUAGE: Hinglish (Hindi + English mix) matching customer's choice. Professional, warm, consultative. Emojis and bullet points in UTF-8. Use ₹ for Rupee. Max 120 words per reply.

8. ALWAYS END with a clear next step: free consultation call, send WhatsApp message to ${COMPANY.phone}, or visit ${COMPANY.website}

9. NEVER use pricing different from the OFFICIAL PACKAGE PRICING section above.

10. CUSTOMER PAIN POINTS → SOLUTIONS:
    - No website → Starter Presence (₹14,999 + ₹2,999/month)
    - Losing leads from WhatsApp → Growth Engine (₹29,999 + ₹5,999/month)
    - No structured follow-up / using spreadsheets → Sales System (₹59,999 + ₹9,999/month)
    - Need custom software / dashboards → Business OS (₹1,49,999+ + ₹19,999+/month)

==================================================
RESPOND ONLY WITH THIS EXACT JSON FORMAT (no markdown, no backticks):
==================================================
{
  "reply": "<your WhatsApp reply — Hinglish, professional, consultative, max 120 words, clean UTF-8 emojis>",
  "ai_score": <number 1-100>,
  "ai_budget": <true if budget or price was mentioned by customer>,
  "ai_summary": "<1-2 sentence CRM summary of the lead>",
  "ai_summary_detailed": "<structured summary: business type | service interest | budget signals | urgency | objections | last discussion point>",
  "intent_level": "<HOT|WARM|COLD|QUOTATION_REQUIRED>",
  "urgency_level": "<low|medium|high>",
  "objections": "<list of any objections raised, or null>",
  "recommended_action": "<next sales action, e.g. Send Growth Engine pricing sheet, Schedule demo call, Share portfolio>",
  "human_handoff": <true if handoff conditions met, else false>,
  "handoff_reason": "<reason if handoff is true, else null>",
  "lead_stage": "<greeting|qualifying|recommending|objection|booking|handoff>",
  "recommended_package": "<launch|growth|ai_sales|custom|null>",
  "appointment_requested": <true if customer asked for demo/call/consultation OR booking_state just transitioned to confirmed>,
  "opt_out_requested": <true if customer requested STOP/UNSUBSCRIBE>,
  "booking_state": "<null|waiting_for_date|waiting_for_time|confirmed>",
  "booking_date": "<normalized_date_YYYY-MM-DD_or_null>",
  "booking_time": "<normalized_time_HH:MM_or_readable_or_null>",
  "active_intent": "<current_intent_or_null>",
  "active_flow": "<current_flow_or_null>",
  "last_selected_service": "<current_service_name_or_null>",
  "extracted_fields": {
    "name": "<name if stated>",
    "city": "<city if stated>",
    "company": "<business name if stated>",
    "business_type": "<type of business if stated>",
    "budget": "<budget range if mentioned>",
    "service_interest": "<service if mentioned>",
    "urgency": "<low|medium|high>"
  }
}`;
}

async function callModel(
  model: typeof MODELS[number],
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  attempt: number
): Promise<{ raw: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000); // 20s hard timeout

  const keyLen = OPENROUTER_API_KEY.length;
  const maskedAuth = keyLen >= 16 
    ? `Bearer ${OPENROUTER_API_KEY.substring(0, 8)}...${OPENROUTER_API_KEY.substring(keyLen - 8)}`
    : 'Bearer invalid_length';
  
  console.log(`🌐 [OPENROUTER CALL] Target: "${OPENROUTER_BASE}" | Model: "${model.id}" | Auth: "${maskedAuth}"`);

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

// â”€â”€â”€ Main exported function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function processWithAI(ctx: AIContext): Promise<AIResponse> {
  
  // 0. Validate API key
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 20) {
    console.warn('âš ï¸ [OPENROUTER] API key missing or invalid. Using emergency template.');
    return emergencyResponse(ctx);
  }

  // 1. Check dedup cache
  const cacheKey = getCacheKey(ctx);
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    console.log(`📁 [OPENROUTER] Cache hit for ${ctx.leadName}. Returning cached response.`);
    if (cached.result.model_used.includes('gemini-2.5-flash-fallback')) {
      currentAiProvider = 'Gemini';
    } else if (cached.result.model_used === 'emergency_template') {
      currentAiProvider = 'EmergencyTemplate';
    } else if (cached.result.model_used === 'handoff_template') {
      currentAiProvider = 'HandoffTemplate';
    } else {
      currentAiProvider = 'OpenRouter';
    }
    return cached.result;
  }

  // 2. Check for human handoff trigger in latest message
  const latestUserMsg = ctx.recentMessages
    .filter(m => m.role === 'user')
    .pop()?.content || '';
  
  let handoffCheck = detectHandoff(latestUserMsg);

  if (!handoffCheck.trigger && ctx.totalMessagesCount && ctx.totalMessagesCount > 15 && latestUserMsg.trim().length > 0) {
    const hasIntent = /\b(buy|purchase|order|subscribe|get started|sign up|deal|close deal|start project|want to start|shuru krna|shuru karna|finalise|finalize|onboard|onboarding|interested to start|i want this|let's start|lets start|how do we proceed|when can we begin|i am interested|interested in this|call me|call back|consultant|proposal|quote|meeting|demo)\b/i.test(latestUserMsg);
    if (hasIntent) {
      handoffCheck = {
        trigger: true,
        reason: `Conversation length (${ctx.totalMessagesCount} messages) exceeded threshold and user showed action/buying intent`
      };
    }
  }

  if (handoffCheck.trigger) {
    console.log(`🚨 [OPENROUTER] Human handoff triggered for ${ctx.leadName}: ${handoffCheck.reason}`);
    currentAiProvider = 'HandoffTemplate';
    return handoffResponse(ctx, handoffCheck.reason);
  }

  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt(ctx);

  console.log(`📌 [PROMPT] len=${systemPrompt.length} | first300='${systemPrompt.substring(0, 300).replace(/\n/g, ' ')}'`);

  // 4. Cascade through models
  let lastError = '';
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🤖 [OPENROUTER] Trying ${model.id} (attempt ${attempt}/2) for ${ctx.leadName}`);
        
        const { raw, usage } = await callModel(model, systemPrompt, ctx.recentMessages, attempt);
        
        const parsed = parseAIResponse(raw);
        
        if (!parsed.reply || typeof parsed.ai_score !== 'number') {
          throw new Error('Response missing required fields');
        }

        const words = parsed.reply.split(/\s+/);
        if (words.length > 130) {
          parsed.reply = words.slice(0, 120).join(' ') + '...';
        }

        const cost = estimateCost(model.id, usage.prompt_tokens, usage.completion_tokens);
        
        const finalScore = Math.min(100, Math.max(0, parsed.ai_score));
        let intent: 'HOT' | 'WARM' | 'COLD' | 'QUOTATION_REQUIRED' = 'COLD';
        if (parsed.ai_budget || parsed.lead_stage === 'objection' || /pricing|price|rate|quote|cost|charges/i.test(ctx.recentMessages[ctx.recentMessages.length-1]?.content || '')) {
          intent = 'QUOTATION_REQUIRED';
        } else if (finalScore >= 75) {
          intent = 'HOT';
        } else if (finalScore >= 35) {
          intent = 'WARM';
        }

        const result: AIResponse = {
          reply: parsed.reply,
          ai_score: finalScore,
          ai_budget: !!parsed.ai_budget,
          ai_summary: parsed.ai_summary || '',
          ai_summary_detailed: parsed.ai_summary_detailed || '',
          intent_level: intent,
          recommended_action: parsed.recommended_action || 'Consult client needs',
          urgency_level: parsed.urgency_level || 'low',
          objections: parsed.objections || undefined,
          human_handoff: !!parsed.human_handoff,
          handoff_reason: parsed.handoff_reason || undefined,
          lead_stage: parsed.lead_stage || 'qualifying',
          recommended_package: parsed.recommended_package || null,
          appointment_requested: !!parsed.appointment_requested,
          opt_out_requested: !!parsed.opt_out_requested,
          extracted_fields: parsed.extracted_fields || {},
          model_used: model.id,
          input_tokens: usage.prompt_tokens,
          output_tokens: usage.completion_tokens,
          cost_usd: cost,
          // New state fields parsed from JSON
          booking_state: parsed.booking_state || null,
          booking_date: parsed.booking_date || null,
          booking_time: parsed.booking_time || null,
          active_intent: parsed.active_intent || null,
          active_flow: parsed.active_flow || null,
          last_selected_service: parsed.last_selected_service || null,
        };

        responseCache.set(cacheKey, { result, ts: Date.now() });

        await logAuditAction('AI_SUCCESS', 
          `${model.id} | ${ctx.leadName} | Score: ${result.ai_score} | ` +
          `Tokens: ${result.input_tokens}in/${result.output_tokens}out | Cost: $${cost.toFixed(6)}`
        );

        console.log(`✅ [OPENROUTER] ${model.id} success | Score: ${result.ai_score} | Cost: $${cost.toFixed(6)}`);
        currentAiProvider = 'OpenRouter';
        return result;

      } catch (err: any) {
        lastError = err?.message || 'Unknown error';
        console.warn(`⚠️ [OPENROUTER] ${model.id} attempt ${attempt} failed: ${lastError.substring(0, 100)}`);
        
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    
    console.error(`❌ [OPENROUTER] ${model.id} exhausted. Moving to next model.`);
    await logAuditAction('AI_FAILOVER', `${model.id} failed: ${lastError.substring(0, 150)}`);
  }

  // All OpenRouter models failed — fallback to local emergency template
  console.warn('⚠️ [OPENROUTER] All OpenRouter models failed. Falling back directly to Local Emergency Template.');
  await logAuditAction('AI_EMERGENCY', 'All OpenRouter models failed. Using Emergency Template.');
  currentAiProvider = 'EmergencyTemplate';
  return emergencyResponse(ctx);
}

// ─── Emergency fallback template ──────────────────────────────────────────────

function emergencyResponse(ctx: AIContext): AIResponse {
  return {
    reply: `Namaste! 🙏 *Trinetra Digital Solution* mein aapka swagat hai!\n\nHum businesses ke liye build karte hain:\n• Website Development\n• WhatsApp Automation\n• AI Chatbots & CRM\n• Digital Marketing & SEO\n\nMain Trinetra ka AI Assistant hoon. Aap kya dhundh rahe hain? Batayein, main sahi solution suggest karunga! 😊\n\n📞 +91 9334757759\n🌐 trinetradigitalsolution.com`,
    ai_score: 30,
    ai_budget: false,
    ai_summary: 'New contact. Emergency template used — AI service temporarily unavailable.',
    human_handoff: false,
    lead_stage: 'greeting',
    recommended_package: null,
    appointment_requested: false,
    opt_out_requested: false,
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
    reply: `Bilkul! 🙏 Main aapki baat hamare expert se connect kar raha hoon.\n\nHamari team aapko bahut jaldi contact karegi.\n\nAgar urgent ho toh seedha contact karein:\n📞 +91 9334757759\n✉️ info@trinetradigitalsolution.com\n🌐 trinetradigitalsolution.com`,
    ai_score: ctx.currentScore,
    ai_budget: false,
    ai_summary: `Customer requested human assistance. Reason: ${reason}`,
    human_handoff: true,
    handoff_reason: reason,
    lead_stage: 'handoff',
    recommended_package: null,
    appointment_requested: false,
    opt_out_requested: false,
    extracted_fields: {},
    model_used: 'handoff_template',
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  };
}

// ─── JSON Failure Recovery Helper ─────────────────────────────────────────────

function parseAIResponse(raw: string): any {
  try {
    // Escape three backticks by matching them exactly without delimiting template literal issues
    const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```$/,'').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.warn('⚠️ [OPENROUTER] Standard JSON parse failed, trying regex fallback extraction...', err);
    
    // Fallback regex attempt 1: Find { ... } JSON-like structure
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      // ignore
    }

    // Fallback regex attempt 2: Try to extract fields directly with regexes
    const replyMatch = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    const scoreMatch = raw.match(/"ai_score"\s*:\s*(\d+)/i);
    const budgetMatch = raw.match(/"ai_budget"\s*:\s*(true|false)/i);
    
    if (replyMatch) {
      let replyVal = replyMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      
      return {
        reply: replyVal,
        ai_score: scoreMatch ? parseInt(scoreMatch[1], 10) : 50,
        ai_budget: budgetMatch ? budgetMatch[1] === 'true' : false,
        ai_summary: 'Regex extracted response (JSON parsing failed)',
        human_handoff: false,
        lead_stage: 'qualifying',
        recommended_package: null,
        appointment_requested: false,
        opt_out_requested: false,
        extracted_fields: {}
      };
    }

    // Fallback regex attempt 3: Treat the entire raw output as reply
    if (raw && raw.trim().length > 0) {
      return {
        reply: raw.trim(),
        ai_score: 50,
        ai_budget: false,
        ai_summary: 'Raw text fallback response (JSON parsing failed)',
        human_handoff: false,
        lead_stage: 'qualifying',
        recommended_package: null,
        appointment_requested: false,
        opt_out_requested: false,
        extracted_fields: {}
      };
    }

    throw new Error('All JSON parsing and regex extraction fallbacks failed');
  }
}

// ─── Cache cleanup (run every 5 minutes) ───────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of responseCache.entries()) {
    if (now - val.ts > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}, 5 * 60_000);
