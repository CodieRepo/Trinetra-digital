import { compileTemplate } from "./templateEngine";

const SYNONYMS = {
  services: [
    "service", "services", "menu", "features", "offerings", "products", "what do you do", "help",
    "सेवाएं", "काम", "मदद", "सेवा", "मेनू", "kya karte ho", "sevaye", "details"
  ],
  pricing: [
    "pricing", "price", "cost", "rates", "packages", "charges", "fees", "daam", "price list",
    "कीमत", "दाम", "मूल्य", "खर्च", "पैकेज", "kharch", "charges", "plan", "plans"
  ],
  booking: [
    "book", "booking", "consultation", "schedule", "meet", "appointment", "call",
    "बुक", "परामर्श", "अपॉइंटमेंट", "कॉल", "mulaqat", "meeting", "consult"
  ]
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[?:!.,;]/g, "");
}

function matchesSynonym(text: string, category: keyof typeof SYNONYMS): boolean {
  const norm = normalizeText(text);
  return SYNONYMS[category].some(syn => norm.includes(syn) || syn.includes(norm));
}

// Simple Levenshtein distance check for fuzzy matching
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  let i, j, val;
  for (i = 0; i <= a.length; i++) {
    tmp.push([i]);
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        val = 0;
      } else {
        val = 1;
      }
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + val
      );
    }
  }
  return tmp[a.length][b.length];
}

function getFuzzySimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - getLevenshteinDistance(a, b) / maxLen;
}

export async function processRuleEngine(
  tenantId: string,
  _contactId: string,
  activeFlow: string | null,
  flowState: any,
  messageBody: string,
  messageType: string,
  payload: any,
  supabaseAdmin: any
): Promise<{
  replyText: string;
  templateName?: string;
  stateUpdate?: {
    active_flow: string | null;
    flow_state: any;
  } | null;
  triggerWorkflow: boolean;
  workflowPayload?: any;
}> {
  const text = messageBody.trim();
  const normalized = normalizeText(text);

  // ── PRIORITY 1: Interactive Button Click ──
  if (messageType === "button" || messageType === "interactive") {
    const buttonId = payload?.id || payload?.title || "";
    const normId = buttonId.toLowerCase();
    
    if (normId.includes("services") || normId === "1") {
      const template = await fetchTemplate(tenantId, "welcome_msg", supabaseAdmin);
      return { replyText: template, templateName: "welcome_msg", triggerWorkflow: false };
    }
    if (normId.includes("pricing") || normId === "2") {
      const template = await fetchTemplate(tenantId, "pricing_msg", supabaseAdmin);
      return { replyText: template, templateName: "pricing_msg", triggerWorkflow: false };
    }
    if (normId.includes("book") || normId === "3") {
      const template = await fetchTemplate(tenantId, "booking_start_msg", supabaseAdmin);
      return {
        replyText: template,
        templateName: "booking_start_msg",
        stateUpdate: { active_flow: "booking", flow_state: { step: "waiting_for_name" } },
        triggerWorkflow: false
      };
    }
  }

  // ── PRIORITY 2: Meta Flow Submission ──
  if (messageType === "nfm_reply" || (payload && payload.flow_token)) {
    const form = payload.response || payload;
    const bookingDetails = {
      name: form.name || "Customer",
      phone: form.phone || "",
      service: form.service || "AI Automation",
      date: form.booking_date || form.date || "",
      time: form.booking_time || form.time || ""
    };

    const rawTemplate = await fetchTemplate(tenantId, "booking_confirm_msg", supabaseAdmin);
    const replyText = compileTemplate(rawTemplate, {
      contact_name: bookingDetails.name,
      booking_date: bookingDetails.date,
      booking_time: bookingDetails.time,
      service_name: bookingDetails.service,
      contact_phone: bookingDetails.phone
    });

    return {
      replyText,
      templateName: "booking_confirm_msg",
      stateUpdate: { active_flow: null, flow_state: {} },
      triggerWorkflow: true,
      workflowPayload: bookingDetails
    };
  }

  // ── PRIORITY 3: Active Flow State ──
  if (activeFlow === "booking") {
    const state = { ...flowState };
    const step = state.step;

    if (step === "waiting_for_name") {
      state.name = text;
      state.step = "waiting_for_phone";
      return {
        replyText: `Got it, ${text}! What is your phone number? 📱`,
        stateUpdate: { active_flow: "booking", flow_state: state },
        triggerWorkflow: false
      };
    }

    if (step === "waiting_for_phone") {
      state.phone = text;
      state.step = "waiting_for_service";
      return {
        replyText: `Which service are you looking for? Reply with the name or number:\n\n1. AI Automation 🤖\n2. WhatsApp CRM 💬\n3. Web Development 💻\n4. SEO & GBP Optimization 📈`,
        stateUpdate: { active_flow: "booking", flow_state: state },
        triggerWorkflow: false
      };
    }

    if (step === "waiting_for_service") {
      let resolvedService = text;
      if (text === "1" || normalized.includes("ai")) resolvedService = "AI Automation";
      else if (text === "2" || normalized.includes("crm") || normalized.includes("whatsapp")) resolvedService = "WhatsApp CRM";
      else if (text === "3" || normalized.includes("web") || normalized.includes("dev")) resolvedService = "Web Development";
      else if (text === "4" || normalized.includes("seo") || normalized.includes("gbp")) resolvedService = "SEO & GBP Optimization";
      
      state.service = resolvedService;
      state.step = "waiting_for_date";
      return {
        replyText: `Perfect! What date would you prefer for the call? (Format: DD-MM-YYYY) 📅`,
        stateUpdate: { active_flow: "booking", flow_state: state },
        triggerWorkflow: false
      };
    }

    if (step === "waiting_for_date") {
      state.date = text;
      state.step = "waiting_for_time";
      return {
        replyText: `Awesome. What is your preferred time slot? (e.g. 11:30 AM or 04:00 PM) ⏰`,
        stateUpdate: { active_flow: "booking", flow_state: state },
        triggerWorkflow: false
      };
    }

    if (step === "waiting_for_time") {
      state.time = text;
      
      const rawTemplate = await fetchTemplate(tenantId, "booking_confirm_msg", supabaseAdmin);
      const replyText = compileTemplate(rawTemplate, {
        contact_name: state.name,
        booking_date: state.date,
        booking_time: state.time,
        service_name: state.service,
        contact_phone: state.phone
      });

      return {
        replyText,
        templateName: "booking_confirm_msg",
        stateUpdate: { active_flow: null, flow_state: {} },
        triggerWorkflow: true,
        workflowPayload: {
          name: state.name,
          phone: state.phone,
          service: state.service,
          date: state.date,
          time: state.time
        }
      };
    }
  }

  // ── PRIORITY 4: Multilingual Synonym Match ──
  if (matchesSynonym(text, "services")) {
    const template = await fetchTemplate(tenantId, "welcome_msg", supabaseAdmin);
    return { replyText: template, templateName: "welcome_msg", triggerWorkflow: false };
  }
  
  if (matchesSynonym(text, "pricing")) {
    const template = await fetchTemplate(tenantId, "pricing_msg", supabaseAdmin);
    return { replyText: template, templateName: "pricing_msg", triggerWorkflow: false };
  }

  if (matchesSynonym(text, "booking")) {
    const template = await fetchTemplate(tenantId, "booking_start_msg", supabaseAdmin);
    return {
      replyText: template,
      templateName: "booking_start_msg",
      stateUpdate: { active_flow: "booking", flow_state: { step: "waiting_for_name" } },
      triggerWorkflow: false
    };
  }

  // ── PRIORITY 5: FAQ Keyword Match ──
  try {
    const { data: faqs } = await supabaseAdmin
      .from("faqs")
      .select("question, keywords, answer_template_name")
      .eq("tenant_id", tenantId);

    if (faqs && faqs.length > 0) {
      for (const faq of faqs) {
        const matches = faq.keywords.some((kw: string) => {
          const normKw = normalizeText(kw);
          return normalized.includes(normKw) || normKw.includes(normalized);
        });
        if (matches) {
          const template = await fetchTemplate(tenantId, faq.answer_template_name, supabaseAdmin);
          return { replyText: template, templateName: faq.answer_template_name, triggerWorkflow: false };
        }
      }
    }
  } catch (e) {
    console.error("FAQ lookup exception:", e);
  }

  // ── PRIORITY 6: Fuzzy Match ──
  try {
    const { data: faqs } = await supabaseAdmin
      .from("faqs")
      .select("question, answer_template_name")
      .eq("tenant_id", tenantId);

    if (faqs && faqs.length > 0) {
      for (const faq of faqs) {
        const similarity = getFuzzySimilarity(normalized, normalizeText(faq.question));
        if (similarity > 0.65) {
          const template = await fetchTemplate(tenantId, faq.answer_template_name, supabaseAdmin);
          return { replyText: template, templateName: faq.answer_template_name, triggerWorkflow: false };
        }
      }
    }
  } catch (e) {
    console.error("Fuzzy matching lookup exception:", e);
  }

  // ── PRIORITY 7 & 8: Gemini Fallback / Default Message ──
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("feature_flags")
    .eq("tenant_id", tenantId)
    .single();

  const isAiFallbackEnabled = settings?.feature_flags?.ai_fallback !== false;

  if (isAiFallbackEnabled) {
    try {
      const geminiReply = await executeGeminiFallback(text);
      if (geminiReply) {
        return { replyText: geminiReply, triggerWorkflow: false };
      }
    } catch (e) {
      console.error("Gemini fallback execution failed:", e);
    }
  }

  // Default hard fallback template
  const defaultTemplate = await fetchTemplate(tenantId, "fallback_msg", supabaseAdmin);
  return { replyText: defaultTemplate, templateName: "fallback_msg", triggerWorkflow: false };
}

async function fetchTemplate(tenantId: string, name: string, supabaseAdmin: any): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .select("body")
      .eq("tenant_id", tenantId)
      .eq("name", name)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      return data.body;
    }
  } catch (e) {
    console.error("Error fetching template from db:", e);
  }
  
  // Hardcoded default fallback text if db fails
  if (name === "welcome_msg") return "Welcome to Trinetra! Reply with Services or Booking.";
  if (name === "pricing_msg") return "Our packages start from ₹14,999. Reply Book to get started.";
  if (name === "booking_start_msg") return "Perfect! What is your name?";
  if (name === "booking_confirm_msg") return "Thank you! Your call has been scheduled.";
  return "Thanks for your message! Our team will get back to you shortly.";
}

async function executeGeminiFallback(userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the digital assistant for Trinetra Digital Solution. Answer the customer's question directly, politely and concisely. Keep answers under 3 lines.
              
Customer says: "${userPrompt}"`
            }]
          }]
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }
  } catch (e) {
    console.error("Gemini API call failed:", e);
  }
  return null;
}
