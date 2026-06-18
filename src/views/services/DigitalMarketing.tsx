import ServicePageTemplate from "./_ServiceTemplate";

export default function DigitalMarketing() {
  return (
    <ServicePageTemplate
      title="Digital Marketing"
      metaTitle="Digital Marketing Services in Gorakhpur, UP — SEO, Google & Meta Ads | Trinetra Digital"
      metaDescription="Performance digital marketing for Indian businesses. Trinetra offers SEO, Google Ads, Meta Ads, and WhatsApp marketing for businesses in Gorakhpur, UP and across India. Get more leads with less spend."
      canonical="https://trinetradigitalsolution.com/services/digital-marketing"
      eyebrow="Digital Marketing"
      headline="Performance marketing for Indian businesses — more leads, less spend"
      subheadline="We combine organic SEO with targeted paid advertising on Google and Meta to generate consistent, qualified leads for your business. Based in Gorakhpur, UP — serving businesses across India."
      features={[
        "Local SEO optimization for Google Maps and organic search",
        "Google Ads (Search + Display) campaign management",
        "Meta Ads (Facebook + Instagram) lead generation campaigns",
        "WhatsApp marketing campaigns using the Business API",
        "Content strategy and keyword research for Indian search behaviour",
        "Monthly reporting with clear ROI metrics",
        "Google Business Profile optimization and management",
        "Competitor analysis and market positioning",
      ]}
      howItWorks={[
        { step: "01", title: "Audit & Strategy", desc: "We audit your current digital presence and build a 90-day growth strategy with clear targets." },
        { step: "02", title: "Campaign Launch", desc: "We set up, launch, and continuously optimize campaigns across Google, Meta, and organic channels." },
        { step: "03", title: "Monitor & Scale", desc: "Monthly reviews with data-driven recommendations. Scale what works, cut what doesn't." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Digital Marketing",
        "description": "Performance digital marketing services for Indian businesses. SEO, Google Ads, Meta Ads, and WhatsApp marketing.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": ["IN-UP", "IN"],
        "url": "https://trinetradigitalsolution.com/services/digital-marketing",
      }}
      relatedLinks={[
        { label: "Website Development", href: "/services/website-development" },
        { label: "WhatsApp Automation", href: "/services/whatsapp-automation" },
        { label: "Gorakhpur Local SEO", href: "/gorakhpur" },
      ]}
    />
  );
}
