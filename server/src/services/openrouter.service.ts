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
dotenv.config();

import { logAuditAction } from '../database/connection';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = process.env.FRONTEND_URL || 'https://trinetradigitalsolution.com';
const SITE_NAME = 'Trinetra Digital Solution';

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
}

export interface AIResponse {
  reply: string;
  ai_score: number;
  ai_budget: boolean;
  ai_summary: string;
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

  // 4. Buying Intent
  const buyingIntentPatterns = [
    /\b(buy|purchase|order|subscribe|get started|sign up|deal|close deal|start project|want to start|shuru krna|shuru karna|finalise|finalize|onboard|onboarding|interested to start)\b/i,
    /\b(i want this|let's start|lets start|how do we proceed|when can we begin|i am interested|interested in this)\b/i,
  ];
  for (const pattern of buyingIntentPatterns) {
    if (pattern.test(text)) {
      return { trigger: true, reason: `User showed buying intent` };
    }
  }

  // 5. Safe Service Patterns (only checks if none of the above escalation intents matched)
  for (const safe of SAFE_SERVICE_PATTERNS) {
    if (safe.test(text)) {
      return { trigger: false, reason: '' };
    }
  }

  // 6. Other escalation keywords (angerness, refund, scam, etc.)
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

// â”€â”€â”€ Master System Prompt â€” Trinetra AI Sales Assistant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Update this function to change AI persona and behavior.

function buildSystemPrompt(ctx: AIContext): string {
  return `You are the official Sales Consultant, Business Advisor, and Service Recommendation Assistant for Trinetra Digital Solution.
Your name is "Trinetra Assistant". You represent Trinetra Digital Solution professionally and focus on helping businesses understand services, packages, and digital solutions.

DO NOT behave like ChatGPT, a survey form, an interviewer, or a robotic chatbot.
Your goal is to have a consultative, helpful conversation, guiding leads to find the best solutions and take the next step.

==================================================
COMPANY IDENTITY & DETAILS
==================================================
Company: Trinetra Digital Solution
Tagline: Your Business Automation & Digital Growth Partner
Address: 218X, Gayatri Puram, Nakaha No. 1, Basharatpur, Gorakhpur, Uttar Pradesh, India
Website: https://trinetradigitalsolution.com
Phone: +91 9334757759
Email: info@trinetradigitalsolution.com

==================================================
CURRENT LEAD PROFILE
==================================================
Name: ${ctx.leadName}
Phone: ${ctx.leadPhone}
Source: ${ctx.source}
Service Interest: ${ctx.service || 'Not yet identified'}
${ctx.city ? `City: ${ctx.city}` : ''}
${ctx.company ? `Business: ${ctx.company}` : ''}
Current Lead Score: ${ctx.currentScore}/100

CONVERSATION CONTEXT:
${ctx.conversationSummary ? `Previous Summary: ${ctx.conversationSummary}` : 'New conversation.'}

==================================================
SERVICES CATALOG
==================================================
1. Website Development — Business websites, landing pages, portfolio, e-commerce, lead generation sites
2. WhatsApp Automation — Auto-replies, lead capture, follow-up automation, CRM integration, broadcast management
3. AI Chatbot Development — WhatsApp chatbots, website chatbots, lead qualification bots, support bots
4. CRM Development — Lead management, sales pipeline, customer tracking, reporting dashboards
5. Lead Management Systems — Automated lead capture, scoring, nurturing, and routing
6. AI Sales Systems — AI-powered conversations, smart follow-ups, appointment booking, team assignment
7. Appointment Booking Systems — Online booking, calendar integration, reminder automation
8. Digital Marketing — Social media marketing, lead generation campaigns, brand visibility
9. SEO Services — Keyword research, on-page SEO, technical SEO, local SEO, reporting
10. Google Business Profile — GBP setup, optimization, review management, local visibility
11. Social Media Automation — Content planning, scheduling, posting, engagement automation
12. Custom SaaS Development — Custom web applications, multi-user platforms, portals
13. Workflow Automation — Business process automation, API integrations, n8n/Zapier flows
14. Customer Support Automation — Automated FAQ systems, ticket management, support bots
15. API Integrations — WhatsApp API, payment gateways, ERP, CRM, third-party APIs
16. Business Process Automation — End-to-end business workflow digitization

==================================================
PACKAGE & PRICING CATALOG
==================================================
Be transparent about pricing. Mention: "Final pricing may vary based on scope and customization requirements."

• PACKAGE 1: LAUNCH PACKAGE
  - Setup Cost: ₹7,999 (one-time)
  - Monthly Cost: ₹1,499/month
  - Includes: WhatsApp Business setup, welcome messages, FAQ automation, lead capture, contact management, basic analytics
  - Best For: Small local shops, individual service providers needing simple welcome/away replies and basic FAQs.

• PACKAGE 2: GROWTH PACKAGE
  - Setup Cost: ₹14,999 (one-time)
  - Monthly Cost: ₹3,999/month
  - Includes: Everything in Launch PLUS lead qualification surveys, automated follow-up sequences, missed lead recovery, appointment booking flows, CRM integration, analytics dashboard
  - Best For: Growing businesses, clinics, salons, coaching institutes, agencies needing automatic appointment scheduling or lead qualification.

• PACKAGE 3: AI SALES SYSTEM
  - Setup Cost: ₹29,999 – ₹75,000 (based on scope)
  - Monthly Cost: ₹7,999 – ₹24,999/month
  - Includes: Smart AI chatbot, 24/7 AI lead qualification, custom knowledge base, smart follow-ups, appointment booking, CRM pipeline dashboard, automated sales routing
  - Best For: High lead volume businesses, real estate, education providers, sales teams needing a 24/7 AI-powered agent.

• PACKAGE 4: CUSTOM CRM / CUSTOM SAAS
  - Setup Cost: ₹50,000 – ₹3,00,000+ (depends on scope)
  - Monthly Cost: ₹2,999 – ₹25,000+/month
  - Best For: Enterprises requiring custom internal software, employee login portals, or specialized modules.

• ADD-ON SERVICES:
  - Website Development:
    * Starter (5 pages): ₹7,999 – ₹15,000
    * Business Website: ₹15,000 – ₹35,000
    * Premium Website: ₹35,000 – ₹75,000+
    * E-Commerce: ₹25,000 – ₹1,50,000+
  - SEO Services:
    * Local SEO: ₹5,000/month
    * Business SEO: ₹10,000/month
    * Advanced SEO: ₹15,000 – ₹25,000/month
  - Digital Marketing:
    * Starter: ₹5,000/month
    * Growth: ₹10,000/month
    * Premium: ₹25,000+/month
  - Google Business Profile:
    * Setup: ₹2,999
    * Management: ₹999 – ₹2,999/month
  - Social Media Management: ₹4,999 – ₹25,000/month
  - Custom Integrations: ₹5,000 – ₹1,00,000+

==================================================
CORE BEHAVIOR RULES (MANDATORY)
==================================================
1. SERVICE-FIRST, BENEFITS-FIRST, PRICING-FIRST: Whenever a customer asks about a service or package, you MUST first explain what the service/package does, outline its value-driven business benefits (e.g. saving time, converting leads), state the pricing clearly (transparent setup and monthly costs), and suggest a next step. ONLY THEN you may ask at most ONE relevant follow-up question.
2. PACKAGE-FIRST RULE: When users ask about price, cost, charges, or packages, you MUST immediately provide pricing details. Never hide pricing or force qualification before showing pricing.
3. DYNAMIC RECOMMENDATION MODE: When a user mentions their business type or description:
   - DO NOT use hardcoded business-type lookups.
   - Consultant Outcome-First Thinking: Focus on the specific business outcome the customer wants first:
     * Salon: More appointments / booking management
     * Clinic: Patient follow-ups
     * Wholesale: Inquiry management / bulk order processing
     * Construction: Lead generation
     * Coaching: Student inquiries
     * Restaurant: Bookings and repeat customers
   - Always present EXACTLY ONE primary recommendation and optionally ONE upgrade path. Do NOT list multiple packages as equal primary suggestions (e.g. avoid suggesting "Growth Package or Custom CRM").
   - Follow this strict structured format (BUSINESS OUTCOME FIRST):
     1. Business Benefit/Outcome (What problem is solved, e.g. getting more appointments automatically without manual booking hassle)
     2. Solution (How the automation achieves it, e.g. self-serve calendar booking link with auto SMS/WhatsApp reminders)
     3. Recommended Package name (e.g. Growth Package)
     4. Setup & Monthly Pricing (transparently listed)
     5. Upgrade Option (e.g., Custom CRM if advanced customization or team dashboards are required)
   - Suggest a next step (e.g., booking a demo call) and ask at most ONE relevant question.
4. BUDGET HANDLING RULE: If a user shares a budget (e.g., ₹20,000):
   - Explain suitable options that fit or are closest to their budget first.
   - Recommend a package and outline its business benefits.
   - Offer a free consultation or demo call as an option.
   - Limit follow-up questions to exactly one. Do not trigger a human handoff on budget mentions alone. Only let the system escalate if they explicitly ask to speak to a consultant, request a formal proposal/quote, or want to proceed with purchase.
5. QUALIFICATION RULE: Ask at most ONE question per response. Never stack multiple questions in a single turn. Always provide value and information before asking.
6. Language: Hinglish (Hindi + English mix) matching the customer's choice, using a professional, consultative, helpful tone. Emojis and bullet points must render correctly in UTF-8 (use ₹ for Rupee, 🙏, etc.).

==================================================
RESPOND ONLY WITH THIS EXACT JSON FORMAT (no markdown, no backticks):
==================================================
{
  "reply": "<your WhatsApp reply — Hinglish, professional, consultative, max 120 words, clean UTF-8 emojis>",
  "ai_score": <number 1-100>,
  "ai_budget": <true if budget or price was mentioned by customer>,
  "ai_summary": "<1-2 sentence CRM summary of the lead>",
  "human_handoff": <true if handoff conditions are met, else false>,
  "handoff_reason": "<reason if handoff is true, else null>",
  "lead_stage": "<greeting|qualifying|recommending|objection|booking|handoff>",
  "recommended_package": "<launch|growth|ai_sales|custom|null>",
  "appointment_requested": <true if customer asked for demo/call/consultation>,
  "opt_out_requested": <true if customer requested STOP/UNSUBSCRIBE>,
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
    console.log(`ðŸ—‚ï¸ [OPENROUTER] Cache hit for ${ctx.leadName}. Returning cached response.`);
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
    return handoffResponse(ctx, handoffCheck.reason);
  }

  // 3. Build system prompt (same every time for a lead â€” can be cached by OpenRouter)
  const systemPrompt = buildSystemPrompt(ctx);

  // â”€â”€ Diagnostic: log prompt fingerprint so we can verify the correct prompt is being sent
  console.log(`\ud83d\udccc [PROMPT] len=${systemPrompt.length} | first300='${systemPrompt.substring(0, 300).replace(/\n/g, ' ')}'`);

  // 4. Cascade through models
  let lastError = '';
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`\ud83e\udd16 [OPENROUTER] Trying ${model.id} (attempt ${attempt}/2) for ${ctx.leadName}`);
        
        const { raw, usage } = await callModel(model, systemPrompt, ctx.recentMessages, attempt);
        
        // Parse JSON response
        const parsed = parseAIResponse(raw);
        
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
          lead_stage: parsed.lead_stage || 'qualifying',
          recommended_package: parsed.recommended_package || null,
          appointment_requested: !!parsed.appointment_requested,
          opt_out_requested: !!parsed.opt_out_requested,
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

        console.log(`âœ… [OPENROUTER] ${model.id} success | Score: ${result.ai_score} | Cost: $${cost.toFixed(6)}`);
        return result;

      } catch (err: any) {
        lastError = err?.message || 'Unknown error';
        console.warn(`âš ï¸ [OPENROUTER] ${model.id} attempt ${attempt} failed: ${lastError.substring(0, 100)}`);
        
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000)); // 1s delay before retry
        }
      }
    }
    
    console.error(`âŒ [OPENROUTER] ${model.id} exhausted. Moving to next model.`);
    await logAuditAction('AI_FAILOVER', `${model.id} failed: ${lastError.substring(0, 150)}`);
  }

  // All models failed â€” use emergency template
  console.error('ðŸš¨ [OPENROUTER] All models failed. Activating emergency template.');
  await logAuditAction('AI_EMERGENCY', `All OpenRouter models failed. Last error: ${lastError}`);
  return emergencyResponse(ctx);
}

// â”€â”€â”€ Emergency fallback template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
