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
    "description": "AI automation, WhatsApp CRM, website development, and digital marketing company in Gorakhpur, Uttar Pradesh. Serving Indian businesses with intelligent operational infrastructure.",
    "url": "https://trinetradigitalsolution.com/gorakhpur",
    "telephone": "+91-9334757759",
    "email": "info@trinetradigitalsolution.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Gorakhpur",
      "addressRegion": "Uttar Pradesh",
      "postalCode": "273001",
      "addressCountry": "IN",
    },
    "geo": { "@type": "GeoCoordinates", "latitude": 26.7606, "longitude": 83.3732 },
    "sameAs": ["https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8", "https://wa.me/919334757759"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "https://trinetradigitalsolution.com/gorakhpur",
    "name": "AI Automation & Digital Marketing in Gorakhpur, UP — Trinetra Digital Solution",
    "description": "Trinetra Digital Solution provides AI automation, WhatsApp CRM, website development, and digital marketing services in Gorakhpur, Uttar Pradesh.",
  },
];

const SERVICES = [
  { label: "WhatsApp Automation", href: "/services/whatsapp-automation", desc: "Automate lead qualification and customer communication on WhatsApp." },
  { label: "AI CRM", href: "/services/ai-crm", desc: "Self-updating CRM that builds from your WhatsApp conversations." },
  { label: "Website Development", href: "/services/website-development", desc: "Fast, SEO-optimized business websites delivered in 7–14 days." },
  { label: "Digital Marketing", href: "/services/digital-marketing", desc: "Google Ads, Meta Ads, and SEO for Gorakhpur businesses." },
  { label: "AI Chatbots", href: "/services/ai-chatbots", desc: "Custom AI chatbots trained on your business, deployed on WhatsApp." },
];

export default function GorakhpurPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="AI Automation & Digital Marketing in Gorakhpur, UP — Trinetra Digital Solution"
        description="Trinetra Digital Solution provides AI WhatsApp automation, CRM systems, website development, and digital marketing for businesses in Gorakhpur, Uttar Pradesh. Book a free consultation today."
        canonical="https://trinetradigitalsolution.com/gorakhpur"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-20 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[740px]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-[#BF7340]" />
            <span className="text-xs font-semibold text-[#BF7340] uppercase tracking-widest">Gorakhpur, Uttar Pradesh</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-lg text-[#18170F] tracking-tight mb-5"
          >
            AI automation and digital growth services for businesses in Gorakhpur
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="body-lg text-[#5C5A52] mb-8"
          >
            Trinetra Digital Solution is a Gorakhpur-based AI automation company helping local businesses across Uttar Pradesh modernize their operations — from WhatsApp lead management to performance digital marketing.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Demo <ArrowRight size={14} />
            </Link>
            <a href="https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors">
              View on Google Maps
            </a>
          </motion.div>
        </div>
      </section>

      {/* Services in Gorakhpur */}
      <section className="bg-[#F4F2ED] py-20 md:py-24 border-b border-[#E2DDD5]" aria-label="Services available in Gorakhpur">
        <div className="main-container">
          <div className="text-center mb-12">
            <h2 className="display-md text-[#18170F] tracking-tight max-w-[520px] mx-auto">
              What we offer businesses in Gorakhpur and UP
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <motion.div key={s.href} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="bg-white border border-[#E2DDD5] rounded-xl p-6 hover:shadow-sm transition-all"
              >
                <h3 className="heading-xs text-[#18170F] mb-2">{s.label}</h3>
                <p className="text-xs text-[#5C5A52] leading-relaxed mb-4">{s.desc}</p>
                <Link to={s.href} className="text-xs font-semibold text-[#BF7340] hover:underline">
                  Learn more →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Local */}
      <section className="bg-[#F9F8F5] py-16 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-[#18170F] mb-6">Why Gorakhpur businesses choose Trinetra</h2>
          <div className="flex flex-col gap-5 body-sm text-[#5C5A52]">
            <p>We understand the Gorakhpur market — the mix of healthcare institutions, educational coaching centres, real estate developers, and local retail businesses that make up the city's commercial fabric.</p>
            <p>Our AI systems are built with Indian business context in mind: Hinglish communication, local seasonal patterns, and the specific lead management challenges faced by Indian SMBs.</p>
            <p>Being based locally means faster onboarding, in-person demos when needed, and genuine understanding of the business environment your team operates in.</p>
          </div>
        </div>
      </section>

      {/* ── Google Maps mini section (local SEO signal) */}
      <LocationMap variant="mini" />

      {/* CTA */}
      <section className="bg-[#F4F2ED] py-14">
        <div className="main-container text-center">
          <h2 className="heading-md text-[#18170F] mb-3">Ready to automate your Gorakhpur business?</h2>
          <p className="body-sm text-[#5C5A52] mb-8 max-w-[480px] mx-auto">
            Book a free 30-minute consultation. We'll show you exactly how AI automation can transform your operations.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
            Book Free Consultation <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
