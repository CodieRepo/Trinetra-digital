import ServicePageTemplate from "./_ServiceTemplate";

export default function CrmDevelopment() {
  return (
    <ServicePageTemplate
      title="CRM Development"
      metaTitle="CRM Development Services India — Custom Lead & Client Databases | Trinetra Digital"
      metaDescription="We design and build custom business CRM systems for lead and customer management. Eliminate spreadsheets, organize pipelines, and coordinate sales teams with bespoke software."
      canonical="https://trinetradigitalsolution.com/services/crm-development"
      eyebrow="CRM Development"
      headline="Custom CRM systems designed specifically for your business operations"
      subheadline="Ditch manual Excel sheets and disorganized WhatsApp groups. We build secure, custom CRM systems tailored to your unique sales cycle, team structure, and customer data tracking needs."
      features={[
        "Custom lead pipelines: visually track every enquiry from contact to close",
        "Centralized customer records: save contact details, requirements, and logs",
        "Role-based user access: secure controls for sales reps, managers, and owners",
        "Intelligent task scheduling: set follow-up reminders and appointment logs",
        "Dynamic search and filtering: find any customer or transaction in 2 seconds",
        "Custom analytics dashboards: track conversion rates and team performance",
        "Works on mobile and desktop: allow your field team to update leads on the go",
        "Data security: high-performance hosting with secure databases and daily backups",
      ]}
      howItWorks={[
        { step: "01", title: "Workflow Analysis", desc: "We audit your current sales process, spreadsheets, and team layout to map your custom CRM requirements." },
        { step: "02", title: "Custom Development", desc: "We engineer your databases, pipelines, role definitions, and dashboard layouts using secure, modern software frameworks." },
        { step: "03", title: "Team Onboarding", desc: "We deploy the CRM on your domain, migrate any existing data, and train your team for full adoption." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "CRM Development Services",
        "description": "Bespoke CRM systems and lead management software databases built for Indian SMBs and corporate teams.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": "IN",
        "url": "https://trinetradigitalsolution.com/services/crm-development",
      }}
      relatedLinks={[
        { label: "Website Development", href: "/services/website-development" },
        { label: "Digital Marketing", href: "/services/digital-marketing" },
        { label: "See Pricing", href: "/pricing" },
      ]}
    />
  );
}
