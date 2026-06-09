import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, MessageSquare, Phone } from "lucide-react";
import SEO from "../../components/seo/SEO";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://trinetradigitalsolution.com/services/future-solutions",
  "name": "Future Solutions & Innovation Lab — Trinetra Digital Solution",
  "description": "Learn about our next-generation digital and automation solutions currently under development at Trinetra Digital's Innovation Lab.",
};

export default function FutureSolutions() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  const WA_NUMBER = "918810721068";
  const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in learning more about Trinetra Digital's upcoming software and automation modules.")}`;

  return (
    <>
      <SEO
        title="Future Solutions &amp; Innovation Lab — Trinetra Digital Solution"
        description="Learn about our next-generation digital and automation solutions currently under development at Trinetra Digital's Innovation Lab."
        canonical="https://trinetradigitalsolution.com/services/future-solutions"
        schema={SCHEMA}
      />

      {/* Hero Header */}
      <section className="relative bg-surface-2 pt-20 pb-16 md:pt-28 md:pb-24 border-b border-border overflow-hidden">
        {/* Glow orbit */}
        <div className="absolute top-[10%] left-[-10%] w-[350px] h-[350px] bg-gradient-to-tr from-accent/10 to-indigo-300/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="main-container text-center max-w-[700px] relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 text-[9px] bg-accent-light border border-accent/15 text-accent px-3 py-1 rounded-full uppercase font-bold tracking-wider font-interface mb-4"
          >
            <Clock size={10} /> Innovation Lab
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-ink-1 tracking-tight mt-2 mb-6 font-display font-bold"
          >
            Future Solutions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-ink-2 mb-8 font-medium"
          >
            Advanced automation and AI-powered solutions are currently under development and will be announced in the future.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-6 md:p-8 bg-white border border-border/80 rounded-2xl shadow-3xs max-w-[540px] mx-auto text-left"
          >
            <h2 className="text-sm font-bold text-ink-1 mb-2 font-interface">Next-Gen Software in Staging</h2>
            <p className="text-xs text-ink-2 leading-relaxed mb-6 font-semibold">
              Our engineering team is actively developing cutting-edge workflow automations, natural language WhatsApp engines, and intelligent customer support modules. These features will integrate seamlessly with our website and CRM architectures once production-ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-cta px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors cursor-pointer"
              >
                Join Waitlist on WhatsApp <ArrowRight size={13} />
              </a>
              <Link
                to="/services"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-white px-5 text-xs font-semibold text-ink-1 hover:bg-surface-2 transition-colors"
              >
                Explore Active Services
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Active pillars cross-promotion */}
      <section className="bg-surface-2 py-16 border-b border-border">
        <div className="main-container max-w-[800px] text-center">
          <h2 className="heading-md text-ink-1 mb-3">Our Core Operations</h2>
          <p className="text-xs text-ink-2 max-w-[480px] mx-auto mb-10 leading-relaxed font-semibold">
            While our automation modules are in development, we are fully active in deploying high-performance systems for your growth:
          </p>
          <div className="grid gap-6 md:grid-cols-3 text-left">
            <div className="bg-white border border-border/80 p-5 rounded-xl">
              <h3 className="text-xs font-bold text-ink-1 mb-1.5">Website Development</h3>
              <p className="text-[11px] text-ink-2 leading-relaxed mb-3 font-semibold">Custom business websites engineered for speed, responsiveness, and conversion.</p>
              <Link to="/services/website-development" className="text-[10px] font-bold text-accent hover:underline">View details →</Link>
            </div>
            <div className="bg-white border border-border/80 p-5 rounded-xl">
              <h3 className="text-xs font-bold text-ink-1 mb-1.5">CRM Development</h3>
              <p className="text-[11px] text-ink-2 leading-relaxed mb-3 font-semibold">Custom CRM software to visual pipeline, organize lead logs, and align sales.</p>
              <Link to="/services/crm-development" className="text-[10px] font-bold text-accent hover:underline">View details →</Link>
            </div>
            <div className="bg-white border border-border/80 p-5 rounded-xl">
              <h3 className="text-xs font-bold text-ink-1 mb-1.5">Digital Marketing</h3>
              <p className="text-[11px] text-ink-2 leading-relaxed mb-3 font-semibold">Strategic ad campaign setup and local SEO targeting consistent inquiries.</p>
              <Link to="/services/digital-marketing" className="text-[10px] font-bold text-accent hover:underline">View details →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Support Strip */}
      <section className="bg-white py-14">
        <div className="main-container max-w-[600px] text-center">
          <h2 className="heading-sm text-ink-1 mb-2 font-interface font-bold">Have general system requirements?</h2>
          <p className="text-xs text-ink-2 mb-6 font-semibold">Our consulting and architectural staging is fully operational. Reach out to our Gorakhpur office today.</p>
          <div className="flex gap-4 justify-center items-center">
            <Link to="/contact" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
              <MessageSquare size={13} /> Book Consultation
            </Link>
            <span className="text-slate-350">·</span>
            <a href="tel:+918810721068" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
              <Phone size={13} /> +91 88107 21068
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
