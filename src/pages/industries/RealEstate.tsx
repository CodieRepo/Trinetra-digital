import ServicePageTemplate from "../services/_ServiceTemplate";

export default function RealEstate() {
  return (
    <ServicePageTemplate
      title="Real Estate WhatsApp CRM"
      metaTitle="WhatsApp CRM for Real Estate India — AI Lead Qualification for Builders & Agents | Trinetra Digital"
      metaDescription="Qualify high-value real estate leads from WhatsApp automatically. Trinetra's AI CRM captures buyer budget, locality preference, and timeline — and schedules site visits autonomously. Serving India."
      canonical="https://trinetradigitalsolution.com/industries/real-estate"
      eyebrow="Real Estate & Builders"
      headline="Never lose a high-value real estate buyer to slow follow-up again"
      subheadline="Trinetra connects to your WhatsApp Business number and automatically qualifies incoming buyer inquiries — capturing budget, locality preference, and timeline — then schedules site visits without any manual effort from your team."
      features={[
        "Instant response to every property inquiry, 24/7",
        "Budget and locality qualification before site visit scheduling",
        "Automated site visit scheduling with calendar integration",
        "Lead scoring based on buyer seriousness indicators",
        "Media dispatch: floor plans, brochures, project videos via WhatsApp",
        "Multi-project routing based on buyer budget and preference",
        "NRI and out-of-city buyer handling with virtual tour links",
        "Post-visit follow-up sequences to nurture undecided buyers",
      ]}
      howItWorks={[
        { step: "01", title: "Buyer Messages Your Project WhatsApp", desc: "AI responds within 60 seconds with project information and a qualifying question." },
        { step: "02", title: "Budget & Requirement Captured", desc: "The AI extracts budget range, preferred configuration (2BHK, 3BHK), and timeline from the conversation." },
        { step: "03", title: "Site Visit Auto-Booked", desc: "Qualified buyers are offered site visit slots directly in the chat. Your team gets notified with full lead context." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Real Estate WhatsApp CRM",
        "description": "AI WhatsApp CRM for real estate agents and builders in India. Qualifies leads, schedules site visits, and manages buyer follow-up automatically.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/industries/real-estate",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "AI CRM", href: "/services/ai-crm" },
        { label: "Smart Follow-Up", href: "/services/smart-followup" },
      ]}
    />
  );
}
