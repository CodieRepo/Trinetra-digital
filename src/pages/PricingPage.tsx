import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://trinetradigitalsolution.com/pricing",
  "name": "Services Pricing Plans — Trinetra Digital Solution",
  "description": "View Trinetra Digital Solution's pricing plans for Website Development, CRM infrastructure, and performance digital marketing in Indian Rupees.",
};

export default function PricingPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Services Pricing Plans — Trinetra Digital Solution"
        description="View Trinetra Digital Solution's pricing plans for Website Development, CRM software systems, and digital marketing. Starter plans in Indian Rupees ₹."
        canonical="https://trinetradigitalsolution.com/pricing"
        schema={SCHEMA}
      />

      {/* Page Hero - Original UI Style */}
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
            Software &amp; growth packages pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52]"
          >
            No hidden fees. Flat project milestones or upfront monthly retainers. Absolute integrity.
          </motion.p>
        </div>
      </section>

      {/* Reuse the custom tabbed Pricing component (updated to old UI style) */}
      <Pricing />

      {/* FAQ Strip - Original UI Style */}
      <section className="bg-[#F9F8F5] py-16 border-t border-[#E2DDD5]">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-[#18170F] mb-8 text-center">Common questions about pricing</h2>
          <div className="flex flex-col gap-6 text-left">
            {[
              { q: "What does the one-time website setup include?", a: "It includes custom wireframing, professional layout design, high-speed coding, secure contact form triggers, basic search engine setups, and complete domain/hosting configurations guidance." },
              { q: "Are advertising budgets included in the pricing?", a: "No. Advertising budgets spent on Google Ads or Meta Ads are paid directly to those respective platforms by the client and are strictly separate and not included in our agency management fees." },
              { q: "How are milestone payments structured?", a: "For custom developments, we bill 50% upfront to commit server staging and initial design resources, and 50% upon final client sign-off, prior to actual live domain launching." },
              { q: "Is there a long-term contract commitment?", a: "No contract locks. Monthly support options operate on simple month-to-month upfront retainer cycles. You can cancel at any point with a 7-day written notice." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-[#E2DDD5] pb-6">
                <h3 className="text-sm font-semibold text-[#18170F] mb-2">{faq.q}</h3>
                <p className="text-sm text-[#5C5A52]">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/contact" className="btn-primary-forest text-xs font-semibold tracking-wider uppercase flex h-9 items-center justify-center rounded-lg bg-[#2A4A3E] px-6 text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Consultation — No Commitment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
