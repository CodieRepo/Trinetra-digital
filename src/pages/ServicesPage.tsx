import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Globe, Database, BarChart2, Clock, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";

const SERVICES = [
  {
    icon: <Globe size={22} />,
    title: "Website Development",
    description: "Professional, mobile-responsive websites designed to establish your online presence, build credibility and convert visitors into inquiries — from landing pages to full business websites and e-commerce stores.",
    href: "/services/website-development",
    tag: null
  },
  {
    icon: <Database size={22} />,
    title: "SEO & Digital Marketing",
    description: "Improve your search visibility through local SEO, on-page optimization, Google Business Profile management, Google Ads and Meta Ads — helping your business get found by people actively searching for your services.",
    href: "/services/digital-marketing",
    tag: null
  },
  {
    icon: <BarChart2 size={22} />,
    title: "Social Media Management",
    description: "Consistent content creation, social media posting and community engagement across Instagram, Facebook and other platforms to build brand awareness and maintain an active professional presence.",
    href: "/services/digital-marketing",
    tag: null
  },
  {
    icon: <Clock size={22} />,
    title: "Automation & CRM",
    description: "WhatsApp automation, lead capture systems, follow-up workflows, appointment booking and CRM setup — helping your business manage customer communication more efficiently and reduce manual workload.",
    href: "/services/crm-development",
    tag: "Highly Requested"
  },
  {
    icon: <Globe size={22} />,
    title: "Custom Software Development",
    description: "Tailored CRM systems, dashboards, ERP modules, inventory management systems, booking platforms and workflow automation tools built specifically for your business requirements.",
    href: "/services/crm-development",
    tag: null
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Website Development, SEO, Social Media, CRM Automation & Custom Software",
  "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
  "areaServed": "IN",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Trinetra Digital Solution Services Catalog",
    "itemListElement": SERVICES.map((s) => ({
      "@type": "Offer",
      "name": s.title,
      "description": s.description,
      "url": `https://trinetradigitalsolution.com${s.href}`,
    })),
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }),
};

export default function ServicesPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Our Services — Website, SEO, Social Media, Automation & Software — Trinetra Digital Solution"
        description="Explore Trinetra Digital Solution's complete services: Website Development, SEO & Digital Marketing, Social Media Management, Automation & CRM, and Custom Software Development for Indian businesses."
        canonical="https://trinetradigitalsolution.com/services"
        schema={SCHEMA}
      />

      {/* Hero Header - Old UI Style */}
      <section className="relative bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-20 border-b border-[#E2DDD5]">
        <div className="main-container text-center">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            What We Build
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight max-w-[680px] mx-auto mb-5 mt-2"
          >
            Complete digital &amp; software solutions for growing businesses
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] max-w-[520px] mx-auto mb-8 font-medium"
          >
            From your first website to a complete business operating system — we build, grow, automate and scale businesses through practical digital solutions with clear processes and honest pricing.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="btn-primary-forest text-xs font-semibold tracking-wider uppercase flex h-9 items-center justify-center rounded-lg bg-[#2A4A3E] px-6 text-[#F9F8F5] transition-all hover:bg-[#1E3630]">
              Book Consultation <ArrowRight size={14} />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 h-9 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors">
              See Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Services Grid - Old UI Style */}
      <section className="bg-[#F4F2ED] py-20 md:py-28" aria-label="All Services">
        <div className="main-container max-w-[1200px] mx-auto px-4 space-y-12">
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.href}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="group relative flex flex-col justify-between bg-white border border-[#E2DDD5] rounded-2xl p-8 hover:shadow-md transition-all duration-300 overflow-hidden text-left"
                style={{ minHeight: "280px" }}
              >
                {/* Top accent line on hover */}
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                {service.tag && (
                  <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest bg-[#FAF5EF] text-[#BF7340] border border-[#E2DDD5] px-2.5 py-1 rounded-full">
                    {service.tag}
                  </span>
                )}

                <div>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAF5EF] text-[#BF7340] border border-[#E2DDD5]">
                    {service.icon}
                  </div>
                  <h2 className="heading-sm text-[#18170F] mb-3">{service.title}</h2>
                  <p className="body-sm text-[#5C5A52] leading-relaxed font-semibold">{service.description}</p>
                </div>

                <Link
                  to="/contact"
                  className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#8C8A82] group-hover:text-[#BF7340] transition-colors"
                >
                  Request Consultation <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Coming Soon Block - Classic Card design */}
          <div className="max-w-4xl mx-auto bg-white border border-[#E2DDD5] p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between text-left gap-6 shadow-3xs mt-12">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] bg-[#FAF5EF] border border-[#BF7340]/30 text-[#BF7340] px-2 py-0.5 rounded-full uppercase font-bold">
                <Clock size={10} /> Future Solutions (Coming Soon)
              </span>
              <h3 className="text-sm font-bold text-[#18170F] mt-1">Staging Innovation Lab</h3>
              <p className="text-xs text-[#5C5A52] leading-relaxed font-semibold max-w-xl">
                Advanced automation and AI-powered solutions are currently under development and will be announced in the future.
              </p>
            </div>
            <div className="shrink-0">
              <span className="text-xs font-bold text-[#8C8A82] uppercase tracking-widest border border-[#E2DDD5] bg-[#F4F2ED] rounded-lg px-4 py-2">
                Dev Stage
              </span>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
