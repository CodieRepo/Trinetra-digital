import ServicePageTemplate from "./_ServiceTemplate";

export default function WebsiteDevelopment() {
  return (
    <ServicePageTemplate
      title="Website Development"
      metaTitle="Website Development in Gorakhpur, UP — Fast, SEO-Optimized Sites | Trinetra Digital"
      metaDescription="Professional website development in Gorakhpur, Uttar Pradesh. Trinetra builds fast, SEO-optimized business websites, landing pages, and portfolio sites for Indian businesses. Book a free consultation."
      canonical="https://trinetradigitalsolution.com/services/website-development"
      eyebrow="Website Development"
      headline="Professional websites built for Indian businesses in Gorakhpur and across India"
      subheadline="We design and develop fast, SEO-ready, mobile-first websites that convert visitors into leads. From simple landing pages to complex business websites — built with modern technology and optimized for Google."
      features={[
        "Mobile-first, responsive design optimized for Indian mobile users",
        "Google Core Web Vitals optimized (fast LCP, low CLS)",
        "On-page SEO setup: titles, meta, schema, sitemap, robots.txt",
        "WhatsApp and call CTA integration for instant lead capture",
        "Google Analytics and Search Console configuration",
        "Hosting setup on Vercel, Netlify, or your preferred platform",
        "Custom domain configuration and SSL certificate",
        "Delivered within 7–14 days from design approval",
      ]}
      howItWorks={[
        { step: "01", title: "Discovery Call", desc: "We understand your business, target audience, and goals in a 30-minute call." },
        { step: "02", title: "Design & Build", desc: "We design and develop your website using modern tools. You review and approve at each stage." },
        { step: "03", title: "Launch & Handover", desc: "We launch on your domain, set up analytics, and provide a complete handover with training." },
      ]}
      schema={{
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Website Development",
        "description": "Professional website development for businesses in Gorakhpur and across India. SEO-optimized, fast, mobile-first.",
        "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
        "areaServed": ["IN-UP", "IN"],
        "url": "https://trinetradigitalsolution.com/services/website-development",
      }}
      relatedLinks={[
        { label: "Digital Marketing", href: "/services/digital-marketing" },
        { label: "AI Chatbots", href: "/services/ai-chatbots" },
        { label: "Contact Us", href: "/contact" },
      ]}
    />
  );
}
