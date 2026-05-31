import { useEffect } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";

export default function PricingPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Transparent Services Pricing Plans — Trinetra Digital Solution"
        description="View our transparent pricing schedules for Website Development, CRM software development, and Digital Marketing campaigns in Indian Rupees."
        canonical="https://trinetradigitalsolution.com/pricing"
      />

      {/* Page Hero */}
      <section className="bg-white pt-20 pb-8 md:pt-24 md:pb-12 border-b border-slate-200">
        <div className="main-container text-center max-w-[650px] mx-auto px-4">
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-3">
            Financial Transparency
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
            Transparent pricing schedules
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-[500px] mx-auto font-medium">
            Clear project milestones, flat retainers, and upfront scope parameters. We operate with absolute corporate integrity—no hidden surcharges or surprise billing.
          </p>
        </div>
      </section>

      {/* Interactive tabbed Pricing component */}
      <Pricing />

      {/* Pricing FAQs Strip */}
      <section className="bg-slate-50 py-16 md:py-20 border-t border-slate-200">
        <div className="main-container max-w-[760px] mx-auto px-4 text-left">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-2">Pricing FAQ</span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Common pricing & scope questions</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                q: "What does the one-time website setup include?",
                a: "It includes custom wireframing, professional light-theme design, high-speed LCP coding, secure contact form triggers, basic search engine setup, and comprehensive domain and hosting configurations support."
              },
              {
                q: "Are advertising platform budgets included in pricing?",
                a: "No. Budgets spent on advertising space on Meta Ads (Facebook/Instagram), Google Ads, or other channels are paid directly by you to those platform dashboards and are strictly separate from agency retainers."
              },
              {
                q: "How are milestone payments structured?",
                a: "For custom developments, we bill 50% upfront to commit server staging and initial design resources, and 50% upon final client sign-off, prior to actual live domain launching."
              },
              {
                q: "Is there a long-term contract commitment?",
                a: "No contract locks. Monthly support options, such as digital marketing campaigns management, operate on simple month-to-month upfront retainer cycles. You can cancel at any point with a 7-day written notice."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-3xs flex gap-3.5">
                <div className="h-6 w-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2 leading-snug">{faq.q}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
            >
              Request Free Consultation Proposal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
