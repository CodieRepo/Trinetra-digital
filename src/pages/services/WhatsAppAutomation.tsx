import ServicePageTemplate from "./_ServiceTemplate";

export default function WhatsAppAutomation() {
  return (
    <ServicePageTemplate
      title="WhatsApp Automation"
      metaTitle="WhatsApp Automation for Indian Businesses — AI Lead Qualification | Trinetra Digital"
      metaDescription="Automate your WhatsApp Business with Trinetra's AI. Reply to every lead in under 3 minutes, qualify intent and budget automatically, and route hot leads to your sales team. Based in Gorakhpur, serving India."
      canonical="https://trinetradigitalsolution.com/services/whatsapp-automation"
      eyebrow="WhatsApp Automation"
      headline="Respond to every lead in under 3 minutes — automatically, 24/7"
      subheadline="Trinetra connects to your existing WhatsApp Business number and deploys an AI layer that instantly replies, qualifies intent and budget, and hands off hot leads to your team with full context."
      features={[
        "AI auto-replies to new inquiries within 60 seconds, day or night",
        "Natural language understanding of Hinglish and Indian regional context",
        "Intent qualification — separates serious buyers from casual browsers",
        "Budget and requirement extraction directly from chat",
        "Intelligent handoff to human agents with full conversation history",
        "Customizable reply templates for your specific business context",
        "Works with your existing WhatsApp Business number — no migration needed",
        "2,000–8,000 active conversations per month depending on plan",
      ]}
      howItWorks={[
        { step: "01", title: "Connect Your Number", desc: "We link your WhatsApp Business API to Trinetra's AI infrastructure. Takes 24–48 hours." },
        { step: "02", title: "Train the AI on Your Business", desc: "We feed your product catalogue, FAQs, pricing, and business context to the AI qualifier." },
        { step: "03", title: "Go Live — Leads Flow Automatically", desc: "Every incoming message is handled by AI. Qualified leads are flagged and handed to your team." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "WhatsApp Automation",
        "description": "AI-powered WhatsApp automation for Indian businesses. Automatically reply, qualify, and route leads 24/7.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/services/whatsapp-automation",
      }}
      relatedLinks={[
        { label: "AI CRM", href: "/services/ai-crm" },
        { label: "Smart Follow-Up", href: "/services/smart-followup" },
        { label: "AI Chatbots", href: "/services/ai-chatbots" },
      ]}
    />
  );
}
