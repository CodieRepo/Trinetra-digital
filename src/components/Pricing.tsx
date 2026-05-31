import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I am interested in Trinetra Digital Solution's packages.")}`;

type ServiceCategory = "website" | "crm" | "marketing";

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<ServiceCategory>("website");

  const plans = {
    website: [
      {
        name: "Starter Website",
        price: "₹9,999",
        setup: "One-time investment",
        desc: "Ideal for small businesses and service providers establishing their initial online presence.",
        features: [
          "Up to 5 custom pages",
          "100% mobile responsive design",
          "Standard contact form",
          "WhatsApp click-to-chat integration",
          "Basic SEO configuration",
          "High-speed loading optimization",
          "Domain & hosting setup assistance"
        ],
        cta: "Choose Starter",
        popular: false
      },
      {
        name: "Business Website",
        price: "₹19,999",
        setup: "One-time investment",
        desc: "Designed for growing companies requiring detailed product showcases, blogging, and lead capture.",
        features: [
          "Up to 15 custom pages",
          "Premium professional layout",
          "Advanced SEO structure & keywords",
          "Full blog setup & CMS",
          "Interactive lead generation forms",
          "Google Maps & business profile sync",
          "WhatsApp & social integrations",
          "1 month dedicated support"
        ],
        cta: "Choose Business",
        popular: true
      },
      {
        name: "Custom Website",
        price: "₹29,999",
        setup: "Starting from",
        desc: "Bespoke web applications, custom databases, e-commerce stores, and high-performance scaling setups.",
        features: [
          "Custom page count & features",
          "Advanced API & software integrations",
          "E-commerce & payment gateways",
          "Highly scalable headless architecture",
          "Custom workflows & automation ready",
          "Speed-focused CDN configuration",
          "Priority ongoing technical support"
        ],
        cta: "Request Custom Quote",
        popular: false
      }
    ],
    crm: [
      {
        name: "Basic CRM",
        price: "₹24,999",
        setup: "Starting from",
        desc: "Perfect for small business owners transitioning from manual spreadsheets to automated records.",
        features: [
          "Lead management database",
          "Customer details record system",
          "Basic sales pipeline tracking",
          "Follow-up scheduling & logs",
          "Up to 3 team member roles",
          "Secure localized data storage",
          "Email & dashboard support"
        ],
        cta: "Deploy Basic CRM",
        popular: false
      },
      {
        name: "Business CRM",
        price: "₹49,999",
        setup: "Starting from",
        desc: "A comprehensive management operating system built to coordinate teams and analyze performance.",
        features: [
          "Advanced sales pipeline workflows",
          "Detailed team performance tracking",
          "Robust analytics & custom dashboards",
          "Automated follow-up reminders",
          "WhatsApp notifications ready",
          "Up to 15 active team seats",
          "Role-based access controls",
          "Milestone progress tracking"
        ],
        cta: "Deploy Business CRM",
        popular: true
      },
      {
        name: "Enterprise CRM",
        price: "₹99,999",
        setup: "Starting from",
        desc: "A fully bespoke software solution engineered from the ground up to match your unique operations.",
        features: [
          "Fully custom modular architecture",
          "Tailored custom workflows & automation",
          "Unlimited team accounts & roles",
          "Proprietary ERP & software integrations",
          "Dedicated high-speed cloud hosting",
          "Continuous system backups & SLAs",
          "1-on-1 dedicated engineer support"
        ],
        cta: "Consult Architect",
        popular: false
      }
    ],
    marketing: [
      {
        name: "Starter Marketing",
        price: "₹7,999",
        setup: "/ month",
        desc: "Perfect for local businesses seeking consistent visibility and monthly digital growth.",
        features: [
          "Meta Ads setup & management",
          "Google Search Ads basic setup",
          "Lead generation target campaigns",
          "Social media page management",
          "Standard monthly reporting",
          "Basic copy & creative guidance"
        ],
        cta: "Choose Starter",
        popular: false
      },
      {
        name: "Growth Marketing",
        price: "₹14,999",
        setup: "/ month",
        desc: "Designed for ambitious companies targeting rapid market share and scalable lead flow.",
        features: [
          "Comprehensive Meta Ads scale-up",
          "Advanced Google Ads management",
          "Conversion tracking & pixel tuning",
          "Landing page layout optimization",
          "Competitor keyword research",
          "Detailed weekly analytics decks",
          "Creative asset design support",
          "Active budget scaling consulting"
        ],
        cta: "Choose Growth",
        popular: true
      },
      {
        name: "Custom Marketing",
        price: "Custom Quote",
        setup: "Tailored monthly terms",
        desc: "Omnichannel performance marketing and brand scaling engineered for corporate digital expansion.",
        features: [
          "Bespoke marketing strategy",
          "Omnichannel media buying (Google, Meta, YT)",
          "In-depth funnel optimization audit",
          "Advanced conversion API setup",
          "Continuous creative content strategy",
          "Dedicated account team",
          "SLA-driven reporting updates"
        ],
        cta: "Consult Strategist",
        popular: false
      }
    ]
  };

  const getCategoryTitle = (cat: ServiceCategory) => {
    switch (cat) {
      case "website":
        return "Website Development Packages";
      case "crm":
        return "Custom CRM Development Packages";
      case "marketing":
        return "Strategic Digital Marketing Packages";
    }
  };

  const getCategoryDesc = (cat: ServiceCategory) => {
    switch (cat) {
      case "website":
        return "High-performance, modern, and SEO-optimized websites built to convert visitors into qualified leads.";
      case "crm":
        return "Custom business software tailored exactly to your operations, eliminating manual admin overhead.";
      case "marketing":
        return "We help businesses improve their online presence and generate qualified enquiries through strategic digital marketing.";
    }
  };

  return (
    <section id="pricing" aria-label="Transparent Pricing Plans" className="relative overflow-hidden bg-white py-16 md:py-24 border-b border-slate-200">
      <div className="main-container relative z-10 max-w-[1200px] mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-10 max-w-[700px] mx-auto">
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase mb-3 block">
            Simple & Transparent Tiers
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            Transparent pricing, clear scope.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Choose a solution calibrated to your current scale. No hidden surcharges, no artificial limits, and no misleading claims.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl max-w-full overflow-x-auto">
            {(["website", "crm", "marketing"] as ServiceCategory[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-[#2563EB] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "website" ? "Website Development" : tab === "crm" ? "CRM Development" : "Digital Marketing"}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Header text explaining selected category */}
        <div className="text-center mb-8 max-w-[600px] mx-auto">
          <h3 className="text-lg font-bold text-slate-800 mb-1">{getCategoryTitle(activeTab)}</h3>
          <p className="text-xs text-slate-500">{getCategoryDesc(activeTab)}</p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-6 md:grid-cols-3 items-stretch max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {plans[activeTab].map((plan, i) => (
              <motion.div
                key={plan.name + activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-6 md:p-8 transition-all duration-300 relative overflow-hidden ${
                  plan.popular
                    ? "border-[#2563EB] shadow-md ring-1 ring-[#2563EB]/10"
                    : "border-slate-200 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Popular Pill */}
                {plan.popular && (
                  <span className="absolute top-4 right-4 text-[9px] font-extrabold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={8} /> Popular
                  </span>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#64748B] block mb-4">
                    {plan.name}
                  </span>
                  
                  {/* Price Section */}
                  <div className="mt-2 mb-5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
                      {plan.setup}
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {plan.price}
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed mb-6 font-medium">
                    {plan.desc}
                  </p>

                  <div className="w-full h-px bg-slate-100 mb-6" />

                  {/* Features List */}
                  <ul className="space-y-3.5 text-xs text-slate-600">
                    {plan.features.map((feat, f) => (
                      <li key={f} className="flex items-start gap-3">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] mt-0.5">
                          <Check size={10} strokeWidth={3} />
                        </span>
                        <span className="leading-normal">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex h-11 w-full items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      plan.popular
                        ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-xs"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Global Compliant Disclaimers & Info */}
        <div className="mt-12 text-center max-w-[650px] mx-auto p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[11.5px] leading-relaxed text-slate-500 font-medium">
            <strong>Important Notice:</strong> Advertising budgets spent on Google Ads, Meta Ads (Facebook/Instagram), or other ad channels are paid directly to their respective networks and are <strong>separate and not included</strong> in our agency management fees. We prioritize sustainable operational scaling and do not guarantee fixed sales, revenue numbers, or make unrealistic income claims.
          </p>
        </div>

      </div>
    </section>
  );
}
