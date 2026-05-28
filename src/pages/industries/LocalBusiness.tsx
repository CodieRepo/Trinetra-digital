import ServicePageTemplate from "../services/_ServiceTemplate";

export default function LocalBusiness() {
  return (
    <ServicePageTemplate
      title="Local Business Automation"
      metaTitle="WhatsApp CRM for Local Businesses India — Automate Customer Support & Leads | Trinetra Digital"
      metaDescription="Automate customer inquiries, review collection, and order status updates for local retail and service businesses via WhatsApp. Trinetra's AI handles customer communication so you can focus on your business."
      canonical="https://trinetradigitalsolution.com/industries/local-business"
      eyebrow="Local Business & Retail"
      headline="Automate customer communication for your local business via WhatsApp"
      subheadline="Whether you run a restaurant, salon, retail store, or local service business — Trinetra's AI handles customer inquiries, shares your catalogue, takes orders, and collects reviews automatically via WhatsApp."
      features={[
        "Instant response to Google Maps and Instagram DM leads",
        "Product catalogue and price list sharing on request",
        "Operating hours, location, and directions dispatch",
        "Order status update automation for service businesses",
        "Google review collection sequences after service completion",
        "Festival and promotional message broadcast campaigns",
        "Customer complaint routing to the right team member",
        "Repeat customer recognition and loyalty messaging",
      ]}
      howItWorks={[
        { step: "01", title: "Customer Messages Your Business", desc: "Whether from Google Maps, Instagram, or saved contact — AI responds within 60 seconds." },
        { step: "02", title: "Query Handled Automatically", desc: "Catalogue, hours, prices, and directions are shared instantly. Orders and bookings are taken." },
        { step: "03", title: "Review & Repeat Purchase", desc: "After service, AI requests a Google review and sends a loyalty/re-engagement message." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Local Business WhatsApp Automation",
        "description": "WhatsApp CRM and automation for local retail and service businesses in India.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/industries/local-business",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "AI Chatbots", href: "/services/ai-chatbots" },
        { label: "Digital Marketing", href: "/services/digital-marketing" },
      ]}
    />
  );
}
