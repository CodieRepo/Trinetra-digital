import ServicePageTemplate from "./_ServiceTemplate";

export default function AiChatbots() {
  return (
    <ServicePageTemplate
      title="AI Chatbots"
      metaTitle="AI Chatbot Development for Indian Businesses — WhatsApp & Website Chatbots | Trinetra Digital"
      metaDescription="Custom AI chatbots trained on your business data. Deploy on WhatsApp, your website, or Instagram. Handles FAQs, lead capture, and appointment booking automatically. Built for Indian businesses."
      canonical="https://trinetradigitalsolution.com/services/ai-chatbots"
      eyebrow="AI Chatbots"
      headline="Custom AI chatbots trained on your business — deployed in 7 days"
      subheadline="Trinetra builds AI chatbots that understand your products, services, and customer context. Deploy on WhatsApp, your website, or Instagram to handle FAQs, capture leads, and book appointments — without human intervention."
      features={[
        "Custom-trained on your business documents, FAQs, and product catalogue",
        "Understands Hinglish and regional Indian language patterns",
        "Deploys on WhatsApp Business, website widget, or Instagram DMs",
        "Lead capture: collects name, phone, email, and requirements",
        "Appointment booking integration with your calendar",
        "Escalation logic: hands off to human when query is complex",
        "Continuous improvement through conversation feedback loops",
        "No-code updates — add new FAQs or products without re-training",
      ]}
      howItWorks={[
        { step: "01", title: "Training Data Collection", desc: "We gather your FAQs, product information, pricing, and common customer queries." },
        { step: "02", title: "AI Training & Testing", desc: "We train the chatbot on your data and rigorously test it with real conversation scenarios." },
        { step: "03", title: "Deploy & Monitor", desc: "We deploy on your chosen channels and monitor performance in the first 30 days." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "AI Chatbot Development",
        "description": "Custom AI chatbots trained on business data for Indian companies. Deployed on WhatsApp, websites, and Instagram.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/services/ai-chatbots",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "AI CRM", href: "/services/ai-crm" },
        { label: "See Pricing", href: "/pricing" },
      ]}
    />
  );
}
