import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import SEO from "../components/seo/SEO";
import LocationMap from "../components/LocationMap";

const SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://trinetradigitalsolution.com/#localbusiness",
    "name": "Trinetra Digital Solution",
    "description": "Custom website development, bespoke CRM solutions, and performance digital marketing agency in Gorakhpur, Uttar Pradesh. Serving Indian businesses with professional software infrastructure.",
    "url": "https://trinetradigitalsolution.com/gorakhpur",
    "telephone": "+91-8810721068",
    "email": "info@trinetradigitalsolution.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Gorakhpur",
      "addressRegion": "Uttar Pradesh",
      "postalCode": "273001",
      "addressCountry": "IN",
    },
    "geo": { "@type": "GeoCoordinates", "latitude": 26.7606, "longitude": 83.3732 },
    "sameAs": ["https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8", "https://wa.me/918810721068"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "https://trinetradigitalsolution.com/gorakhpur",
    "name": "Website Development & Custom CRM in Gorakhpur, UP — Trinetra Digital Solution",
    "description": "Trinetra Digital Solution provides custom website development, secure business CRM systems, and performance digital marketing services in Gorakhpur, Uttar Pradesh.",
  },
];

const SERVICES = [
  { label: "Website Development", href: "/services/website-development", desc: "Fast, SEO-optimized business websites delivered in 7–14 days." },
  { label: "CRM Development", href: "/services/crm-development", desc: "Custom lead tracking pipelines and secure business databases." },
  { label: "Digital Marketing", href: "/services/digital-marketing", desc: "Google Ads, Meta Ads, and search SEO for Gorakhpur businesses." },
  { label: "Future Solutions", href: "/services/future-solutions", desc: "Advanced software workflows and automation currently in development." },
];

export default function GorakhpurPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Website Development & Custom CRM in Gorakhpur, UP — Trinetra Digital Solution"
        description="Trinetra Digital Solution provides custom website development, secure CRM databases, and performance digital marketing for businesses in Gorakhpur, Uttar Pradesh. Book a free consultation today."
        canonical="https://trinetradigitalsolution.com/gorakhpur"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="bg-white pt-20 pb-16 md:pt-28 md:pb-20 border-b border-border">
        <div className="main-container max-w-[740px]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Gorakhpur, Uttar Pradesh</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-lg text-ink-1 tracking-tight mb-5 font-display font-bold"
          >
            Custom website development, CRM solutions, and digital growth services in Gorakhpur
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="body-lg text-ink-2 mb-8"
          >
            Trinetra Digital Solution is a Gorakhpur-based technology agency helping local businesses across Uttar Pradesh modernize their operations — from custom website development to secure CRM systems and performance digital marketing.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors cursor-pointer">
              Book Free Demo <ArrowRight size={14} />
            </Link>
            <a href="https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 rounded-lg border border-border bg-white px-6 text-xs font-semibold text-ink-1 hover:bg-surface-2 transition-colors">
              View on Google Maps
            </a>
          </motion.div>
        </div>
      </section>

      {/* Services in Gorakhpur */}
      <section className="bg-surface-2 py-20 md:py-24 border-b border-border" aria-label="Services available in Gorakhpur">
        <div className="main-container">
          <div className="text-center mb-12">
            <h2 className="display-md text-ink-1 tracking-tight max-w-[520px] mx-auto font-display font-bold">
              What we offer businesses in Gorakhpur and UP
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <motion.div key={s.href} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="bg-white border border-border/80 rounded-xl p-6 hover:shadow-sm transition-all"
              >
                <h3 className="heading-xs text-ink-1 mb-2 font-semibold">{s.label}</h3>
                <p className="text-xs text-ink-2 leading-relaxed mb-4 font-semibold">{s.desc}</p>
                <Link to={s.href} className="text-xs font-semibold text-accent hover:underline">
                  Learn more →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Local */}
      <section className="bg-white py-16 border-b border-border">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-ink-1 mb-6 font-semibold">Why Gorakhpur businesses choose Trinetra</h2>
          <div className="flex flex-col gap-5 body-sm text-ink-2 font-semibold leading-relaxed">
            <p>We understand the Gorakhpur market — the mix of healthcare institutions, educational coaching centres, real estate developers, and local retail businesses that make up the city's commercial fabric.</p>
            <p>Our software systems are built with Indian business context in mind: intuitive user interfaces, local seasonal patterns, and the specific lead management challenges faced by Indian SMBs.</p>
            <p>Being based locally means faster onboarding, in-person demos when needed, and genuine understanding of the business environment your team operates in.</p>
          </div>
        </div>
      </section>

      {/* ── Google Maps mini section (local SEO signal) */}
      <LocationMap variant="mini" />

      {/* CTA */}
      <section className="bg-surface-2 py-14">
        <div className="main-container text-center">
          <h2 className="heading-md text-ink-1 mb-3 font-semibold">Ready to grow your Gorakhpur business?</h2>
          <p className="body-sm text-ink-2 mb-8 max-w-[480px] mx-auto font-medium">
            Book a free 30-minute consultation. We'll show you exactly how custom websites and software can transform your operations.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors cursor-pointer">
            Book Free Consultation <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
