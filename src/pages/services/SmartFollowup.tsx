import ServicePageTemplate from "./_ServiceTemplate";

export default function SmartFollowup() {
  return (
    <ServicePageTemplate
      title="Smart Follow-Up"
      metaTitle="Automated Lead Follow-Up Sequences for Indian Businesses | Trinetra Digital"
      metaDescription="Never let a hot lead go cold. Trinetra's Smart Follow-Up sends personalized WhatsApp messages on Day 1, 3, and 7 automatically — and stops as soon as a lead responds. Built for Indian businesses."
      canonical="https://trinetradigitalsolution.com/services/smart-followup"
      eyebrow="Smart Follow-Up"
      headline="Never lose a lead to silence again — automated follow-up sequences"
      subheadline="Most leads don't convert on first contact. Trinetra's intelligent sequence engine sends personalized follow-up messages across Days 1, 3, and 7 — stopping automatically the moment a lead re-engages or books."
      features={[
        "Day 1–7 multi-step WhatsApp follow-up sequence per lead",
        "AI-personalized messages using lead's name and extracted context",
        "Auto-stop when lead replies or schedules an appointment",
        "Custom sequence design based on your business and sales cycle",
        "Hinglish-compatible messaging for regional Indian audiences",
        "Campaign performance tracking: open rates, re-engagement rates",
        "Manual override: sales team can pause or resume any sequence",
        "3x average improvement in re-engagement response rates",
      ]}
      howItWorks={[
        { step: "01", title: "Lead Enters Pipeline", desc: "When a qualified lead doesn't respond for 24 hours, the follow-up sequence activates automatically." },
        { step: "02", title: "Personalized Messages Sent on Schedule", desc: "Pre-designed messages (with the lead's name and context) are sent on Days 1, 3, and 7." },
        { step: "03", title: "Auto-Stop on Re-Engagement", desc: "The moment a lead responds or books, the sequence stops and the lead is handed to your team." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Smart Follow-Up Automation",
        "description": "Automated WhatsApp follow-up sequences for Indian businesses. Personalized Day 1-7 messages that auto-stop on re-engagement.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/services/smart-followup",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "AI CRM", href: "/services/ai-crm" },
        { label: "See Pricing", href: "/pricing" },
      ]}
    />
  );
}
