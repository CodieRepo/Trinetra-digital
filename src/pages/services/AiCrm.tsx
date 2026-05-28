import ServicePageTemplate from "./_ServiceTemplate";

export default function AiCrm() {
  return (
    <ServicePageTemplate
      title="AI CRM"
      metaTitle="AI CRM System for Indian Businesses — Self-Updating Lead Pipeline | Trinetra Digital"
      metaDescription="Trinetra's AI CRM automatically extracts lead data from WhatsApp conversations, creates CRM records, and updates your pipeline without manual entry. Built for Indian SMBs."
      canonical="https://trinetradigitalsolution.com/services/ai-crm"
      eyebrow="AI CRM"
      headline="A CRM that feeds itself — no manual data entry, ever"
      subheadline="Trinetra's AI CRM listens to your WhatsApp conversations and automatically extracts customer names, requirements, budgets, and contact details — building a clean, organized pipeline without your team typing a single note."
      features={[
        "Auto-extracts lead name, phone, email, budget, and requirements from chat",
        "Kanban pipeline: Inquiry → Qualified → Demo Booked → Closed",
        "Lead scoring based on buying intent signals from conversation",
        "Integrates with Google Sheets, Notion, or existing CRM tools",
        "Duplicate detection and lead deduplication",
        "Mobile-friendly pipeline dashboard for sales teams",
        "Automated stage updates when leads respond or book",
        "Export leads to CSV or connect to external tools via webhook",
      ]}
      howItWorks={[
        { step: "01", title: "AI Reads Every Conversation", desc: "As WhatsApp messages come in, our AI parses the conversation in real-time for lead data." },
        { step: "02", title: "CRM Record Created Automatically", desc: "A lead card is created in your pipeline with all extracted details — zero manual entry." },
        { step: "03", title: "Pipeline Stays Current", desc: "As leads progress through follow-ups and demos, the CRM stage updates automatically." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "AI CRM",
        "description": "AI-powered CRM that automatically builds and updates your lead pipeline from WhatsApp conversations.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/services/ai-crm",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "Smart Follow-Up", href: "/services/smart-followup" },
        { label: "See Pricing", href: "/pricing" },
      ]}
    />
  );
}
