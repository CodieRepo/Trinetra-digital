import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://trinetradigitalsolution.com/pricing",
  "name": "AI Automation Pricing Plans — Trinetra Digital Solution",
  "description": "View Trinetra Digital Solution's pricing plans for AI WhatsApp automation and CRM infrastructure. Starter from ₹15,000 setup. Growth and Enterprise plans available.",
};

export default function PricingPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="AI Automation Pricing Plans — Trinetra Digital Solution | Starting ₹15,000"
        description="View Trinetra Digital Solution's pricing plans for AI WhatsApp automation, CRM infrastructure, and business automation. Starter from ₹15,000 setup + ₹3,199/mo. Free demo available."
        canonical="https://trinetradigitalsolution.com/pricing"
        schema={SCHEMA}
      />

      {/* Page Hero */}
      <section className="bg-[#F9F8F5] pt-20 pb-6 md:pt-28 md:pb-10 border-b border-[#E2DDD5]">
        <div className="main-container text-center max-w-[600px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            Simple, Transparent Pricing
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight mt-2 mb-4"
          >
            AI automation infrastructure pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52]"
          >
            No hidden fees. One-time onboarding + a flat monthly fee. Cancel anytime.
          </motion.p>
        </div>
      </section>

      {/* Reuse the existing Pricing component */}
      <Pricing />

      {/* FAQ Strip */}
      <section className="bg-[#F9F8F5] py-16 border-t border-[#E2DDD5]">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-[#18170F] mb-8 text-center">Common questions about pricing</h2>
          <div className="flex flex-col gap-6">
            {[
              { q: "What does the one-time setup fee include?", a: "It includes WhatsApp API configuration, AI qualifier training on your business data, CRM pipeline setup, and a go-live guarantee within 7 days." },
              { q: "Is there a contract or lock-in?", a: "No lock-in. Our month-to-month plans can be cancelled anytime. We keep clients through results, not contracts." },
              { q: "What happens if I exceed my monthly chat limit?", a: "We'll notify you when you're approaching your limit and offer a simple top-up or plan upgrade. No service interruption." },
              { q: "Can I start with Starter and upgrade later?", a: "Absolutely. Most clients start with Starter and upgrade to Growth within 60 days once they see results." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-[#E2DDD5] pb-6">
                <h3 className="text-sm font-semibold text-[#18170F] mb-2">{faq.q}</h3>
                <p className="text-sm text-[#5C5A52]">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Demo — No Commitment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
