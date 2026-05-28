import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import SEO from "../components/seo/SEO";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://trinetradigitalsolution.com/uttar-pradesh",
  "name": "Business Automation Services in Uttar Pradesh — Trinetra Digital Solution",
  "description": "Trinetra Digital Solution provides AI WhatsApp automation, CRM systems, and digital marketing for businesses across Uttar Pradesh including Gorakhpur, Lucknow, Varanasi, Kanpur, and Agra.",
};

const UP_CITIES = ["Gorakhpur", "Lucknow", "Varanasi", "Kanpur", "Agra", "Allahabad", "Meerut", "Noida", "Ghaziabad", "Mathura"];

export default function UttarPradeshPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Business Automation Services in Uttar Pradesh — AI & WhatsApp CRM | Trinetra Digital"
        description="Trinetra Digital Solution provides AI WhatsApp automation, CRM systems, website development, and digital marketing for businesses across Uttar Pradesh — Gorakhpur, Lucknow, Varanasi, Kanpur and more."
        canonical="https://trinetradigitalsolution.com/uttar-pradesh"
        schema={SCHEMA}
      />

      <section className="bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-20 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[740px]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-[#BF7340]" />
            <span className="text-xs font-semibold text-[#BF7340] uppercase tracking-widest">Uttar Pradesh, India</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-lg text-[#18170F] tracking-tight mb-5"
          >
            AI automation and digital marketing for businesses across Uttar Pradesh
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="body-lg text-[#5C5A52] mb-8"
          >
            Trinetra Digital Solution is based in Gorakhpur, UP and serves businesses across Uttar Pradesh with AI-powered WhatsApp automation, CRM infrastructure, and performance digital marketing — all implemented remotely with full support.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Demo <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 h-11 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors">
              Our Services
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Cities */}
      <section className="bg-[#F4F2ED] py-16 border-b border-[#E2DDD5]">
        <div className="main-container">
          <h2 className="heading-md text-[#18170F] mb-8 text-center">Cities we serve in Uttar Pradesh</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {UP_CITIES.map((city) => (
              <span key={city} className="text-xs font-semibold text-[#5C5A52] border border-[#E2DDD5] bg-white px-4 py-2 rounded-full">
                {city}
              </span>
            ))}
            <span className="text-xs font-semibold text-[#BF7340] border border-[#BF7340]/20 bg-[#F2E8DC] px-4 py-2 rounded-full">
              + All of UP (Remote)
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#F9F8F5] py-16 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-[#18170F] mb-6">Helping UP businesses grow with AI automation</h2>
          <div className="flex flex-col gap-4 body-sm text-[#5C5A52]">
            <p>Uttar Pradesh is India's most populous state with a rapidly growing SMB ecosystem — from healthcare networks in Gorakhpur and Varanasi, to real estate developers in Lucknow and Noida, to coaching institutes serving millions of students across the state.</p>
            <p>Trinetra Digital Solution brings enterprise-grade AI automation to UP businesses of all sizes. Our WhatsApp automation, AI CRM, and digital marketing services are delivered entirely remotely — making us accessible to businesses in any city or district across the state.</p>
            <p>All implementations include Hindi and Hinglish support, ensuring our AI communicates naturally with your local customers.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#F4F2ED] py-14">
        <div className="main-container text-center">
          <h2 className="heading-md text-[#18170F] mb-3">Start your automation journey in UP</h2>
          <p className="body-sm text-[#5C5A52] mb-8 max-w-[480px] mx-auto">
            Book a free consultation — we'll audit your current customer communication and show you exactly where automation adds the most value.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
            Book Free Consultation <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
