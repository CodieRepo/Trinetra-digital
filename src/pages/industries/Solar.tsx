import ServicePageTemplate from "../services/_ServiceTemplate";

export default function Solar() {
  return (
    <ServicePageTemplate
      title="Solar Business Automation"
      metaTitle="AI Automation for Solar Businesses India — Lead Qualification & Survey Scheduling | Trinetra Digital"
      metaDescription="Automate solar panel inquiry qualification, site survey scheduling, and customer follow-up via WhatsApp. Trinetra's AI collects roof metrics and location data automatically for solar companies in India."
      canonical="https://trinetradigitalsolution.com/industries/solar"
      eyebrow="Solar & EPC Contractors"
      headline="Qualify solar leads and schedule site surveys automatically via WhatsApp"
      subheadline="Solar companies deal with high inbound interest but low conversion due to slow qualification. Trinetra's AI collects roof area, electricity bill, and location data from WhatsApp inquiries — and schedules engineer site surveys automatically."
      features={[
        "Automated response to solar panel and EPC project inquiries",
        "Roof area, bill amount, and location data collection via chat",
        "Automated ROI and savings estimate sharing based on inputs",
        "Site survey scheduling with engineering team calendar integration",
        "Government subsidy information dispatch (PM Surya Ghar etc.)",
        "Follow-up sequence for leads who didn't schedule a survey",
        "Financing and EMI option information delivery",
        "Post-installation customer feedback and referral sequences",
      ]}
      howItWorks={[
        { step: "01", title: "Lead Inquires About Solar", desc: "AI responds instantly and asks for monthly bill amount, roof ownership, and address." },
        { step: "02", title: "Qualification & Estimate Shared", desc: "Based on inputs, AI shares estimated system size, cost, and savings calculation." },
        { step: "03", title: "Site Survey Auto-Booked", desc: "Interested leads are offered site survey slots. Engineer receives lead details automatically." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Solar Business WhatsApp Automation",
        "description": "AI automation for solar businesses in India. Qualifies leads, collects site data, and schedules surveys via WhatsApp.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/industries/solar",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "Smart Follow-Up", href: "/services/smart-followup" },
        { label: "See Pricing", href: "/pricing" },
      ]}
    />
  );
}
