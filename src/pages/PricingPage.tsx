import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://trinetradigitalsolution.com/pricing",
  "name": "Business Growth Packages & Add-On Pricing — Trinetra Digital Solution",
  "description": "View Trinetra Digital Solution's transparent pricing for Website Development, SEO, Social Media Management, CRM Automation, and Custom Software. Growth packages starting at ₹14,999.",
};

export default function PricingPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Business Growth Packages & Pricing — Trinetra Digital Solution"
        description="View Trinetra Digital Solution's transparent pricing. Growth packages from ₹14,999 setup for websites, SEO, social media, CRM automation and custom software. No hidden fees."
        canonical="https://trinetradigitalsolution.com/pricing"
        schema={SCHEMA}
      />

      {/* Page Hero */}
      <section className="bg-white pt-20 pb-6 md:pt-28 md:pb-10 border-b border-border">
        <div className="main-container text-center max-w-[600px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            Simple, Transparent Pricing
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-ink-1 tracking-tight mt-2 mb-4 font-display font-bold"
          >
            Growth packages &amp; add-on services pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-ink-2 font-medium"
          >
            Transparent pricing across all services. Choose a complete package or individual add-on services — no hidden fees and no unrealistic promises.
          </motion.p>
        </div>
      </section>

      {/* Reuse the custom tabbed Pricing component */}
      <Pricing />

      {/* FAQ Strip */}
      <section className="bg-surface-2 py-16 border-t border-border">
        <div className="main-container max-w-[680px]">
          <h2 className="heading-md text-ink-1 mb-8 text-center font-semibold">Common questions about pricing</h2>
          <div className="flex flex-col gap-6 text-left">
            {[
              { q: "What does the one-time website setup include?", a: "It includes custom wireframing, professional layout design, high-speed coding, secure contact form triggers, basic search engine setups, and complete domain/hosting configurations guidance." },
              { q: "Are advertising budgets included in the pricing?", a: "No. Advertising budgets spent on Google Ads or Meta Ads are paid directly to those respective platforms by the client and are strictly separate and not included in our agency management fees." },
              { q: "How are milestone payments structured?", a: "For custom developments, we bill 50% upfront to commit server staging and initial design resources, and 50% upon final client sign-off, prior to actual live domain launching." },
              { q: "Is there a long-term contract commitment?", a: "No contract locks. Monthly support options operate on simple month-to-month upfront retainer cycles. You can cancel at any point with a 7-day written notice." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-border/80 pb-6">
                <h3 className="text-sm font-semibold text-ink-1 mb-2">{faq.q}</h3>
                <p className="text-sm text-ink-2 font-semibold leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/contact" className="btn-primary-forest text-xs font-semibold tracking-wider uppercase flex h-9 items-center justify-center rounded-lg bg-cta px-6 text-white hover:bg-cta-hover transition-colors cursor-pointer">
              Book Free Consultation — No Commitment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
