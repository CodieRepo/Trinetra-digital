import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import SEO from "../components/seo/SEO";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://trinetradigitalsolution.com/uttar-pradesh",
  "name": "Website Development & CRM Services in Uttar Pradesh — Trinetra Digital Solution",
  "description": "Trinetra Digital Solution provides custom websites, CRM systems, and digital marketing for businesses across Uttar Pradesh including Gorakhpur, Lucknow, Varanasi, Kanpur, and Agra.",
};

const UP_CITIES = ["Gorakhpur", "Lucknow", "Varanasi", "Kanpur", "Agra", "Allahabad", "Meerut", "Noida", "Ghaziabad", "Mathura"];

export default function UttarPradeshPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Website Development & CRM Services in Uttar Pradesh — Trinetra Digital Solution"
        description="Trinetra Digital Solution provides custom website development, secure CRM systems, and digital marketing for businesses across Uttar Pradesh — Gorakhpur, Lucknow, Varanasi, Kanpur and more."
        canonical="https://trinetradigitalsolution.com/uttar-pradesh"
        schema={SCHEMA}
      />

      <section className="bg-white pt-20 pb-16 md:pt-28 md:pb-20 border-b border-border">
        <div className="main-container max-w-[740px]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">Uttar Pradesh, India</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-lg text-ink-1 tracking-tight mb-5 font-display font-bold"
          >
            Website development, custom CRM, and digital marketing across Uttar Pradesh
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="body-lg text-ink-2 mb-8"
          >
            Trinetra Digital Solution is based in Gorakhpur, UP and serves businesses across Uttar Pradesh with custom website development, secure CRM databases, and performance digital marketing — all implemented remotely with full support.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors cursor-pointer">
              Book Free Demo <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 h-11 rounded-lg border border-border bg-white px-6 text-xs font-semibold text-ink-1 hover:bg-surface-2 transition-colors">
              Our Services
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Cities */}
      <section className="bg-surface-2 py-16 border-b border-border">
        <div className="main-container">
          <h2 className="heading-md text-ink-1 mb-8 text-center font-semibold">Cities we serve in Uttar Pradesh</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {UP_CITIES.map((city) => (
              <span key={city} className="text-xs font-semibold text-ink-2 border border-border/80 bg-white px-4 py-2 rounded-full font-mono">
                {city}
              </span>
            ))}
            <span className="text-xs font-semibold text-accent border border-accent/20 bg-accent-light px-4 py-2 rounded-full font-mono">
              + All of UP (Remote)
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16 border-b border-border">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-ink-1 mb-6 font-semibold">Helping UP businesses grow with digital systems</h2>
          <div className="flex flex-col gap-4 body-sm text-ink-2 font-semibold leading-relaxed">
            <p>Uttar Pradesh is India's most populous state with a rapidly growing SMB ecosystem — from healthcare networks in Gorakhpur and Varanasi, to real estate developers in Lucknow and Noida, to coaching institutes serving millions of students across the state.</p>
            <p>Trinetra Digital Solution brings custom software and digital growth systems to UP businesses of all sizes. Our website development, custom CRM databases, and performance digital marketing are delivered entirely remotely — making us accessible to businesses in any city or district across the state.</p>
            <p>All implementations include Hindi and Hinglish support, ensuring our AI communicates naturally with your local customers.</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-2 py-14">
        <div className="main-container text-center">
          <h2 className="heading-md text-ink-1 mb-3 font-semibold">Start your digital growth journey in UP</h2>
          <p className="body-sm text-ink-2 mb-8 max-w-[480px] mx-auto font-medium">
            Book a free consultation — we'll audit your current digital footprint and show you exactly where custom websites, CRM systems, and ads management add the most value.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors cursor-pointer">
            Book Free Consultation <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
