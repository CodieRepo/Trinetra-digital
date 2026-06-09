/**
 * knowledge-base.ts
 * ═══════════════════════════════════════════════════════════════════════════
 * TRINETRA DIGITAL SOLUTION — Official AI Training Knowledge Base
 * Version: 1.0 | Date: June 5, 2026
 * Single source of truth for all AI agents:
 *   • WhatsApp Sales Assistant
 *   • CRM Assistant
 *   • Website Chatbot
 *   • Voice Agent
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── COMPANY IDENTITY ─────────────────────────────────────────────────────────

export const COMPANY = {
  brand:        'Trinetra Digital Solution',
  legal_entity: 'Charulata Enterprises',
  tagline:      'Your Business Automation & Digital Growth Partner',
  address:      'Gorakhpur, Uttar Pradesh, India — 273001',
  phone:        '+91 88107 21068',
  whatsapp:     '+91 88107 21068',
  email:        'info@trinetradigitalsolution.com',
  website:      'https://trinetradigitalsolution.com',
  hours:        'Monday – Saturday, 9:00 AM – 7:00 PM IST',
  coverage:     'All states of India (100% remote delivery)',
  city:         'Gorakhpur, Uttar Pradesh',
};

export const MISSION = `To help Indian businesses — especially local businesses, service providers and SMBs — 
establish a strong digital presence, manage customer inquiries more effectively, and operate more efficiently 
through the right technology.`;

export const VALUE_PROPOSITION = `One partner, every capability — Website, CRM, SEO, Digital Marketing, Custom Software.
Zero corners cut — Custom-built, no templates, no page builders.
Transparent pricing — Upfront pricing before kickoff, no hidden charges.
No unrealistic promises — Never guarantees leads, rankings, or revenue figures.
Process-driven delivery — 5-stage structured process from discovery to support.`;

// ─── OFFICIAL PACKAGE PRICING ─────────────────────────────────────────────────
// Source: Official website pricing page. These are the CANONICAL prices.
// DO NOT use any other pricing figures.

export const PACKAGES = {
  starter: {
    name:       'Starter Presence',
    setup:      '₹14,999 one-time',
    monthly:    '₹2,999/month',
    setup_num:  14999,
    monthly_num: 2999,
    best_for:   'Local service providers establishing credibility',
    includes: [
      'Professional Landing Page Website',
      'Mobile-first responsive design',
      'WhatsApp & call CTA integration',
      'Lead inquiry form',
      'Basic on-page SEO setup',
      'Google Analytics & Search Console',
      'Domain & SSL configuration',
      'Social Media Profile Setup',
      '8 social media posts/month',
      'Monthly support',
    ],
  },
  growth: {
    name:       'Growth Engine',
    setup:      '₹29,999 one-time',
    monthly:    '₹5,999/month',
    setup_num:  29999,
    monthly_num: 5999,
    best_for:   'Growing businesses wanting structured leads',
    includes: [
      'Multi-Page Business Website',
      'Mobile optimization',
      'WhatsApp Lead Automation',
      'Lead Capture System',
      'Auto Reply Configuration',
      'Follow-Up Workflow Setup',
      'Google Business Profile Optimization',
      'Local SEO Foundation',
      '15 social media posts/month',
      'Technical Maintenance',
      'Monthly Reporting',
    ],
  },
  sales_system: {
    name:       'Sales System',
    setup:      '₹59,999 one-time',
    monthly:    '₹9,999/month',
    setup_num:  59999,
    monthly_num: 9999,
    best_for:   'Teams looking to automate sales pipeline',
    includes: [
      'CRM Setup & Lead Pipeline',
      'WhatsApp Lead Automation',
      'Instagram Automation',
      'Facebook Automation',
      'Appointment Booking System',
      'Lead Reminder Automation',
      '20 social media posts/month',
      'Monthly Optimization Review',
    ],
  },
  business_os: {
    name:       'Business OS',
    setup:      '₹1,49,999+ one-time',
    monthly:    '₹19,999+/month',
    setup_num:  149999,
    monthly_num: 19999,
    best_for:   'Custom databases, dashboards, and app workflows',
    includes: [
      'Advanced CRM & Pipeline',
      'Custom Business Software',
      'Dashboard Development',
      'Business Workflow Automation',
      'Reporting & Analytics Systems',
      'Custom Third-Party Integrations',
      'SEO & Content Support',
      'Dedicated Support',
    ],
  },
};

// ─── ADD-ON SERVICES & PRICING ────────────────────────────────────────────────

export const ADDONS = {
  website: {
    starter_5pg:  '₹14,999 – ₹29,999',
    business:     '₹29,999 – ₹59,999',
    premium:      '₹59,999 – ₹1,49,999+',
    note: 'Delivered within 7–14 days from design approval',
  },
  seo: {
    local:    '₹5,000/month',
    business: '₹10,000/month',
    advanced: '₹15,000 – ₹25,000/month',
  },
  digital_marketing: {
    starter:  '₹5,000/month',
    growth:   '₹10,000/month',
    premium:  '₹25,000+/month',
    note:     'Ad budgets (Google/Meta) are paid directly by client to platforms. Our fees cover management only.',
  },
  google_business_profile: {
    setup:      '₹2,999',
    management: '₹999 – ₹2,999/month',
  },
  social_media: {
    management: '₹4,999 – ₹25,000/month',
  },
  custom_integrations: '₹5,000 – ₹1,00,000+',
};

// ─── SERVICES CATALOG ─────────────────────────────────────────────────────────

export const SERVICES = [
  {
    id: 'website',
    name: 'Website Development',
    status: 'active',
    description: 'Custom, mobile-responsive, SEO-ready business websites. No templates, no page builders. Clean code from scratch.',
    delivery: '7–14 days from design approval',
    payment: '50% advance + 50% on completion before go-live',
    use_cases: ['Real estate property listing site', 'Clinic appointment booking page', 'Coaching institute course catalog', 'B2B corporate website with lead capture'],
  },
  {
    id: 'crm',
    name: 'CRM Development',
    status: 'active',
    description: 'Custom CRM replacing spreadsheets and WhatsApp chaos. Lead pipelines, role-based access, follow-up automation, analytics dashboards.',
    delivery: '10–14 working days',
    payment: '50% advance + 50% on completion before migration',
    results: {
      response_time: '4.5 hours → under 90 seconds',
      leads_contacted_same_day: '40% → 100%',
      site_visits_per_100_leads: '14 → 31',
      conversions_per_100_leads: '3.2 → 8.7',
      agent_time: '5–6 hrs/day → under 1 hr/day',
    },
  },
  {
    id: 'seo_marketing',
    name: 'SEO & Digital Marketing',
    status: 'active',
    description: 'Local SEO, Google Ads, Meta Ads, WhatsApp marketing, Google Business Profile, content strategy.',
    disclaimer: 'No specific lead, ranking, or revenue guarantees. Results depend on market demand, product fit, and sales processing.',
  },
  {
    id: 'social_media',
    name: 'Social Media Management',
    status: 'active',
    description: 'Content creation, scheduling, posting (8–20 posts/month), community engagement on Instagram and Facebook.',
  },
  {
    id: 'custom_software',
    name: 'Custom Software Development',
    status: 'active',
    description: 'Custom dashboards, ERP modules, inventory systems, booking platforms, reporting tools. Price: ₹1,49,999+ setup.',
  },
  {
    id: 'whatsapp_ai',
    name: 'WhatsApp Automation & AI Chatbots',
    status: 'coming_soon',
    description: 'Advanced WhatsApp automation, natural language engines, intelligent customer support modules. Currently in Innovation Lab.',
    note: 'Join waitlist via WhatsApp: +91 88107 21068',
  },
];

// ─── INDUSTRIES SERVED ────────────────────────────────────────────────────────

export const INDUSTRIES = [
  { name: 'Healthcare & Clinics',       use_case: 'Patient appointment scheduling, WhatsApp reminders, clinic landing pages' },
  { name: 'Real Estate & Developers',   use_case: 'Property listing sites, lead capture workflows, CRM integration' },
  { name: 'Coaching & Education',       use_case: 'Course enrollment funnels, student inquiry systems, automated welcome follow-ups' },
  { name: 'Local Service Businesses',   use_case: 'Google Business Profile SEO, booking calendars, WhatsApp CTAs' },
  { name: 'B2B & Professional Services', use_case: 'Corporate websites, lead qualifying pipelines, secure database workflows' },
  { name: 'Retail & E-commerce',        use_case: 'Digital catalogs, order inquiry systems, payment gateway configurations' },
  { name: 'Solar Companies',            use_case: 'Lead qualification on electricity consumption and roof access' },
  { name: 'Restaurants',               use_case: 'Bookings, repeat customers, Google Maps visibility' },
  { name: 'Salons',                     use_case: 'Appointment booking, client follow-ups, social media presence' },
];

// ─── 5-STAGE DELIVERY PROCESS ─────────────────────────────────────────────────

export const DELIVERY_PROCESS = [
  { stage: 1, name: 'Discovery',         detail: 'Discuss business needs, analyze competitors, outline technical requirements' },
  { stage: 2, name: 'Strategy & Scope',  detail: 'Define page structures, database schemas, milestone timelines' },
  { stage: 3, name: 'Custom Build',      detail: 'Clean code (no page builders), custom backend configurations' },
  { stage: 4, name: 'Staging & Review',  detail: 'Client reviews and tests on private staging link before final delivery' },
  { stage: 5, name: 'Launch & Support',  detail: 'Migrate live, index search engines, begin contract support' },
];

// ─── PAYMENT POLICY ───────────────────────────────────────────────────────────

export const PAYMENT_POLICY = {
  projects:  '50% advance (kickoff + design + staging) + 50% on completion before go-live',
  retainers: 'Billed upfront on recurring 30-day cycle. Month-to-month — no long-term contract.',
  cancel:    '7-day written notice to info@trinetradigitalsolution.com',
  ad_budgets: 'Google Ads and Meta Ads budgets are paid DIRECTLY by client to those platforms. Not included in Trinetra fees.',
};

// ─── REFUND POLICY ────────────────────────────────────────────────────────────

export const REFUND_POLICY = {
  before_wireframes:   'Eligible for cancellation minus 15% administrative fee',
  after_wireframes:    '50% advance is non-refundable once wireframes/staging are delivered',
  monthly_retainers:   'No partial refunds for mid-month cancellations. Cancel with 7-day written notice.',
  ad_budgets:          'Ad budgets spent on Google/Meta are non-refundable by Trinetra',
  refund_timeline:     '7–10 working days processing for eligible refunds',
};

// ─── OBJECTION HANDLING ───────────────────────────────────────────────────────

export const OBJECTION_HANDLING: Record<string, string> = {
  'too expensive': `Compare the cost against missed leads and lost revenue. Our Starter package is ₹14,999 setup + ₹2,999/month — less than 1-2 missed conversions for most businesses. Monthly fees are flexible with no long-term lock-in.`,
  'do it ourselves': `Our custom-built approach (no templates, no page builders) delivers professional, SEO-ready results that DIY solutions rarely achieve. Plus, our ongoing maintenance saves your team 5+ hours monthly.`,
  'guarantee results': `We are transparent: we do not guarantee specific leads, rankings, or revenue. We guarantee professional delivery, clean code, strategic execution, and a structured process. Results depend on market demand, your product fit, and follow-up speed.`,
  'already have developer': `We offer website + CRM + marketing under one roof — what most individual developers don't provide. One partner, consistent processes, integrated systems.`,
  'need to think': `Absolutely, take your time. Would it help if we sent a detailed proposal with clear pricing? We also offer a free no-obligation 30-minute consultation call whenever you're ready.`,
  'no contract lock': `No catch. We operate month-to-month with 7-day written cancellation notice. We earn your business every month through quality work.`,
  'how do i trust': `We follow a structured 5-stage process with a private staging server review before final delivery. You see and test everything before the final payment and go-live.`,
  'show examples': `We have verified portfolio projects including Vaastu Infra (real estate) and Akuafi (technology). We share only projects we have actually delivered.`,
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'What is Trinetra Digital Solution?',
    a: 'Trinetra Digital Solution is the technology services brand of Charulata Enterprises. We build responsive websites, engineer custom CRMs, and manage strategic, ads-compliant digital marketing for growing businesses across India.',
  },
  {
    q: 'Where are you located?',
    a: 'Gorakhpur, Uttar Pradesh, India — 273001. We serve clients across all states of India via 100% remote delivery. In-person meetings available for local Gorakhpur clients.',
  },
  {
    q: 'How are payments structured?',
    a: '50% advance to start (wireframing, design, staging). 50% on project validation and approval — strictly before go-live. Monthly retainers are billed upfront on 30-day cycles.',
  },
  {
    q: 'Are advertising budgets included in fees?',
    a: 'No. Google Ads and Meta Ads budgets are paid directly by you to those platforms. Our fees cover campaign creation, creative optimization, tracking setup, and ongoing strategy.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No contracts. Month-to-month billing with 7-day written cancellation notice. We earn your business every month.',
  },
  {
    q: 'How long does website development take?',
    a: '7–14 days from design approval.',
  },
  {
    q: 'How long does CRM implementation take?',
    a: '10–14 working days for full implementation.',
  },
  {
    q: 'Do you guarantee leads or rankings?',
    a: 'No. We never make artificial lead guarantees or unrealistic revenue promises. Results depend on market demand, product fit, and your team\'s follow-up speed. We guarantee professional delivery and strategic execution.',
  },
  {
    q: 'What is the legal entity?',
    a: 'Trinetra Digital Solution is a brand of Charulata Enterprises. All contracts, invoices, payments, and legal transactions are under Charulata Enterprises.',
  },
  {
    q: 'What support is included?',
    a: 'Monthly support is included in all packages. Technical maintenance is included in Growth Engine and above. Business OS includes dedicated support. Support is available Mon–Sat, 9 AM – 7 PM IST.',
  },
];

// ─── AI AGENT RULES ───────────────────────────────────────────────────────────

export const AI_RULES = {
  allowed: [
    'Describe all services with honest, accurate information',
    'Share official pricing from PACKAGES and ADDONS above',
    'Explain the 5-stage delivery process',
    'Offer free 30-minute consultation call',
    'Share portfolio (Vaastu Infra, Akuafi)',
    'Explain payment terms (50% + 50%)',
    'Mention month-to-month billing with no lock-in',
    'Provide contact: +91 88107 21068, info@trinetradigitalsolution.com',
    'Discuss industries served and specific use cases',
    'Handle objections using the OBJECTION_HANDLING guide above',
  ],
  restricted: [
    'NEVER guarantee specific lead numbers, conversions, or revenue',
    'NEVER claim "rank #1 on Google" or any specific ranking guarantee',
    'NEVER make promises about ad platform performance',
    'NEVER claim to be affiliated with Meta, Google, or WhatsApp as an official partner',
    'NEVER share client confidential information',
    'NEVER promise delivery shorter than 7 days for websites',
    'NEVER promise delivery shorter than 10 working days for CRM',
    'NEVER quote prices different from the official PACKAGES table above',
  ],
  handoff_triggers: [
    'Customer requests pricing discount beyond published rates',
    'Customer reports technical issue with existing service',
    'Complex custom development with scope > ₹1,49,999',
    'Customer wants to speak to a founder or senior team member',
    'Billing disputes or refund requests',
    'NDA requests',
    'Customer is angry or dissatisfied',
    'Customer asks for formal proposal/contract',
  ],
  conversation_style: `Professional, transparent, helpful. Hinglish (Hindi + English mix) matching the customer's language.
  Warm but not pushy. Offer value before asking questions. Ask at most ONE question per response.
  Always end with a clear next step. Use ₹ symbol for prices. Avoid hype or exaggerated claims.`,
};

// ─── CUSTOMER SEGMENTS ────────────────────────────────────────────────────────

export const CUSTOMER_SEGMENTS = [
  { segment: 'Local Service Providers', description: 'Plumbers, electricians, contractors needing online presence' },
  { segment: 'Startups',                description: 'Early-stage companies needing websites and basic CRM' },
  { segment: 'SMBs',                    description: 'Growing businesses needing structured lead management' },
  { segment: 'Healthcare Providers',    description: 'Clinics, diagnostic centers, individual practitioners' },
  { segment: 'Real Estate',             description: 'Agents, developers, property management companies' },
  { segment: 'Education',               description: 'Coaching centers, training institutes, academies' },
  { segment: 'Retail',                  description: 'Local shops, e-commerce sellers' },
  { segment: 'B2B Services',            description: 'Consultants, agencies, professional services firms' },
];

// ─── LEAD QUALIFICATION SIGNALS ───────────────────────────────────────────────

export const LEAD_SIGNALS = {
  hot: [
    'Has a clear budget range',
    'Ready to start within 1 month',
    'Business owner or decision maker',
    'Clearly describes a pain point',
    'Came from referral or WhatsApp direct',
    'Responds within hours',
    'Asks for pricing, quotation, or proposal',
  ],
  warm: [
    'Vague about budget',
    'Timeline 1–3 months',
    'Influencer, not final decision maker',
    'Vague problem awareness',
    'Responds within 1 day',
  ],
  cold: [
    'No budget mentioned',
    'Timeline 3+ months or "not sure"',
    'Just browsing / gathering information',
    'Responds in days',
  ],
};

// ─── FOLLOW-UP SEQUENCE ───────────────────────────────────────────────────────

export const FOLLOWUP_SEQUENCE = [
  { day: 0,   touchpoint: 'Same Day',   message: 'Thank you + confirm understanding of requirement' },
  { day: 1,   touchpoint: 'Day 1',      message: 'Share relevant case study or portfolio example' },
  { day: 3,   touchpoint: 'Day 3',      message: '"Still exploring options? Happy to answer any questions."' },
  { day: 7,   touchpoint: 'Day 7',      message: 'Share specific value proposition relevant to their industry' },
  { day: 14,  touchpoint: 'Day 14',     message: 'Limited-time offer or new capability update' },
  { day: 21,  touchpoint: 'Day 21',     message: '"Any updates on your plans?"' },
  { day: 30,  touchpoint: 'Day 30',     message: 'Value-add content (blog post, industry insight)' },
  { day: 90,  touchpoint: 'Quarterly',  message: '"We\'ve released new capabilities. Interested in seeing what\'s new?"' },
];

// ─── EXPORT: CONDENSED SYSTEM PROMPT BLOCK ────────────────────────────────────
// Used directly in the OpenRouter system prompt. Kept to ~1500 tokens.

export function getKnowledgeBaseBlock(): string {
  return `
==================================================
OFFICIAL TRINETRA KNOWLEDGE BASE (SOURCE OF TRUTH)
==================================================
Company: ${COMPANY.brand} (legal entity: ${COMPANY.legal_entity})
Address: ${COMPANY.address}
Phone/WhatsApp: ${COMPANY.phone}
Email: ${COMPANY.email}
Website: ${COMPANY.website}
Hours: ${COMPANY.hours}

MISSION: ${MISSION.trim()}

CORE PROMISE: ${VALUE_PROPOSITION.trim()}

==================================================
OFFICIAL PACKAGE PRICING (USE THESE — DO NOT DEVIATE)
==================================================
1. STARTER PRESENCE — ${PACKAGES.starter.setup} + ${PACKAGES.starter.monthly}
   Best for: ${PACKAGES.starter.best_for}
   Includes: ${PACKAGES.starter.includes.slice(0,5).join(', ')} + more

2. GROWTH ENGINE — ${PACKAGES.growth.setup} + ${PACKAGES.growth.monthly}
   Best for: ${PACKAGES.growth.best_for}
   Includes: Multi-page website, WhatsApp automation, lead capture, follow-up workflows, local SEO, monthly reporting

3. SALES SYSTEM — ${PACKAGES.sales_system.setup} + ${PACKAGES.sales_system.monthly}
   Best for: ${PACKAGES.sales_system.best_for}
   Includes: Full CRM + lead pipeline, appointment booking, Instagram/Facebook automation, monthly optimization

4. BUSINESS OS — ${PACKAGES.business_os.setup} + ${PACKAGES.business_os.monthly}
   Best for: ${PACKAGES.business_os.best_for}
   Includes: Custom software, advanced CRM, dashboards, workflow automation, dedicated support

ADD-ON SERVICES:
• Website Development: ₹14,999–₹1,49,999+ (7-14 day delivery)
• SEO: ₹5,000–₹25,000/month
• Digital Marketing: ₹5,000–₹25,000+/month (ad budget paid by client to Google/Meta)
• Google Business Profile: ₹2,999 setup + ₹999–₹2,999/month management
• Social Media Management: ₹4,999–₹25,000/month

==================================================
INDUSTRIES SERVED
==================================================
Healthcare, Real Estate, Coaching/Education, Local Services, B2B, Retail, Solar, Restaurants, Salons

==================================================
PAYMENT & POLICY
==================================================
• Projects: 50% advance + 50% on completion before go-live
• Monthly: Upfront 30-day cycle, month-to-month, no contracts
• Cancel: 7-day written notice
• Ad budgets (Google/Meta): Paid DIRECTLY by client to platforms — NOT included in Trinetra fees

==================================================
STRICT RULES
==================================================
• NEVER guarantee leads, revenue, or specific Google rankings
• NEVER use pricing different from the official packages above
• ALWAYS mention free 30-min consultation as next step
• NEVER promise delivery in less than 7 days (website) or 10 working days (CRM)
• If user asks for formal quote/proposal/contract → trigger human handoff
`.trim();
}
