import ServicePageTemplate from "../services/_ServiceTemplate";

export default function Healthcare() {
  return (
    <ServicePageTemplate
      title="Healthcare WhatsApp Automation"
      metaTitle="WhatsApp Automation for Healthcare & Clinics India — OPD Booking AI | Trinetra Digital"
      metaDescription="Automate OPD appointment booking, patient follow-ups, and report dispatch for clinics and hospitals via WhatsApp. Trinetra's AI handles patient communication 24/7 across India."
      canonical="https://trinetradigitalsolution.com/industries/healthcare"
      eyebrow="Healthcare & Clinics"
      headline="Automate OPD booking and patient communication for clinics and hospitals"
      subheadline="Trinetra's AI automation handles incoming patient WhatsApp queries, books appointments, sends reminders, dispatches reports, and manages follow-up care communication — so your staff focuses on patients, not messages."
      features={[
        "Automated OPD and specialist appointment booking via WhatsApp",
        "Patient intake form collection before the consultation",
        "Appointment reminders 24 hours and 2 hours before slot",
        "Lab report and prescription dispatch via WhatsApp",
        "Post-visit feedback collection automatically",
        "Emergency escalation to on-call staff for urgent cases",
        "Multi-doctor, multi-department routing based on query type",
        "Patient follow-up sequences for chronic condition management",
      ]}
      howItWorks={[
        { step: "01", title: "Patient Messages Your WhatsApp", desc: "Patient sends 'I need an appointment' — AI responds within 60 seconds, any time of day." },
        { step: "02", title: "AI Books the Appointment", desc: "The AI asks for patient details, preferred doctor, and time slot — then confirms the booking instantly." },
        { step: "03", title: "Automated Reminders & Follow-Up", desc: "Reminders go out automatically before the appointment. Follow-up messages sent after the visit." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Healthcare WhatsApp Automation",
        "description": "AI WhatsApp automation for clinics and hospitals in India. Automates OPD booking, patient follow-up, and report dispatch.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/industries/healthcare",
      }}
      relatedLinks={[
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "AI Chatbots", href: "/services/ai-chatbots" },
        { label: "Smart Follow-Up", href: "/services/smart-followup" },
      ]}
    />
  );
}
