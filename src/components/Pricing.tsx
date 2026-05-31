import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's services.")}`;

type ServiceCategory = "website" | "crm" | "marketing";

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<ServiceCategory>("website");

  const plans = {
    website: [
      {
        name: "Starter Website",
        price: "₹9,999",
        setupLabel: "One-Time Investment",
        monthlyPrice: "No Monthly Fee",
        desc: "Ideal for small businesses and service providers establishing their initial online presence.",
        features: [
          "Up to 5 custom pages",
          "100% mobile responsive design",
          "Standard contact form",
          "WhatsApp click-to-chat integration",
          "Basic SEO setup configuration",
          "High-speed loading optimization",
          "Domain & hosting guidance"
        ],
        cta: "Get Started",
        popular: false
      },
      {
        name: "Business Website",
        price: "₹19,999",
        setupLabel: "One-Time Investment",
        monthlyPrice: "No Monthly Fee",
        desc: "Designed for growing companies requiring detailed product showcases, blogging, and lead capture.",
        features: [
          "Up to 15 custom pages",
          "Premium professional design",
          "Advanced SEO structure setup",
          "Full blog setup & CMS",
          "Interactive lead generation forms",
          "Google Maps & business profile",
          "WhatsApp & social integrations",
          "1 month dedicated support"
        ],
        cta: "Choose Business",
        popular: true
      },
      {
        name: "Custom Website",
        price: "Starting ₹29,999",
        setupLabel: "One-Time Investment",
        monthlyPrice: "Scale Architecture",
        desc: "Bespoke web applications, custom databases, e-commerce stores, and high-performance scaling setups.",
        features: [
          "Custom page count & features",
          "Advanced API & software integrations",
          "E-commerce & payment gateways",
          "Highly scalable architecture",
          "Custom workflows & automation ready",
          "Speed-focused CDN configuration",
          "Priority ongoing technical support"
        ],
        cta: "Consult Architect",
        popular: false
      }
    ],
    crm: [
      {
        name: "Basic CRM",
        price: "Starting ₹24,999",
        setupLabel: "One-Time Investment",
        monthlyPrice: "No Monthly Fee",
        desc: "Perfect for small business owners transitioning from manual spreadsheets to automated records.",
        features: [
          "Lead management database",
          "Customer details record system",
          "Basic sales pipeline tracking",
          "Follow-up scheduling & logs",
          "Up to 3 team member roles",
          "Secure data storage ready",
          "Email & dashboard support"
        ],
        cta: "Deploy Basic CRM",
        popular: false
      },
      {
        name: "Business CRM",
        price: "Starting ₹49,999",
        setupLabel: "One-Time Investment",
        monthlyPrice: "No Monthly Fee",
        desc: "A comprehensive management operating system built to coordinate teams and analyze performance.",
        features: [
          "Advanced sales pipeline workflows",
          "Detailed team performance tracking",
          "Robust analytics & custom dashboards",
          "Automated follow-up reminders",
          "WhatsApp notifications ready",
          "Up to 15 active team seats",
          "Role-based access controls",
          "Business automation ready"
        ],
        cta: "Deploy Business CRM",
        popular: true
      },
      {
        name: "Enterprise CRM",
        price: "Starting ₹99,999",
        setupLabel: "One-Time Investment",
        monthlyPrice: "Custom Agreement",
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
        setupLabel: "One-Time Onboarding",
        monthlyPrice: "/ month",
        desc: "Perfect for local businesses seeking consistent visibility and monthly digital growth.",
        features: [
          "Meta Ads setup & management",
          "Google Search Ads basic setup",
          "Lead generation campaigns setup",
          "Social media page management",
          "Standard monthly reporting",
          "Basic copy & creative guidance"
        ],
        cta: "Start Marketing",
        popular: false
      },
      {
        name: "Growth Marketing",
        price: "₹14,999",
        setupLabel: "One-Time Onboarding",
        monthlyPrice: "/ month",
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
        setupLabel: "Milestone Contract",
        monthlyPrice: "Tailored Retainer",
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

  return (
    <section id="pricing" aria-label="Pricing Plans — AI Automation Infrastructure Packages" className="relative overflow-hidden bg-[#F4F2ED] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <span className="mixed-headline-eyebrow">
            Pricing & Project Packages
          </span>
          <h2 className="display-lg text-[#18170F] tracking-tight mb-4">
            Transparent pricing. Clear project scope.
          </h2>
          <p className="body-lg text-[#5C5A52] max-w-[580px] mx-auto mb-8">
            Choose a solution calibrated to your current business scale. Upfront prices with no hidden charges or unrealistic claims.
          </p>

          {/* Interactive tabbed category switcher - Styled exactly in old UI design */}
          <div className="inline-flex items-center gap-2 bg-[#EEEAE3] border border-[#E2DDD5] p-1 rounded-lg z-10 max-w-full overflow-x-auto">
            {(["website", "crm", "marketing"] as ServiceCategory[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold tracking-wide rounded transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#FFFFFF] text-[#18170F] shadow-xs"
                    : "text-[#5C5A52] hover:text-[#18170F]"
                }`}
              >
                {tab === "website" ? "Website Development" : tab === "crm" ? "CRM Development" : "Digital Marketing"}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Pricing Cards Grid - Rendered in original UI style */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto items-stretch mt-10">
          <AnimatePresence mode="wait">
            {plans[activeTab].map((plan, i) => {
              // Card 2 (Popular) gets the classic dark background (#131210) and copper top accent
              if (plan.popular) {
                return (
                  <motion.div
                    key={plan.name + activeTab}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col justify-between rounded-xl border border-[#BF7340]/40 bg-[#131210] p-6 md:p-8 shadow-md ring-1 ring-[#BF7340]/25 text-left relative overflow-hidden"
                  >
                    {/* Shimmer top accent */}
                    <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340]" />

                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#FAF5EF]/60">{plan.name}</span>
                        <span className="text-[9px] bg-[#BF7340] text-[#FAF5EF] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Sparkles size={8} /> Most Popular
                        </span>
                      </div>
                      
                      {/* Pricing Blocks */}
                      <div className="mt-6 space-y-4">
                        <div>
                          <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">{plan.setupLabel}</p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-display text-[32px] font-bold text-[#F9F8F5]">{plan.price}</span>
                          </div>
                        </div>
                        
                        <div className="h-px bg-white/10" />
                        
                        <div>
                          <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#FAF5EF]/60">Recurring Fee</p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-display text-[26px] font-bold text-[#F9F8F5]">{plan.monthlyPrice}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-white/10 my-6" />

                      <ul className="space-y-3.5 text-xs text-[#FAF5EF]/80">
                        {plan.features.map((feat, f) => (
                          <li key={f} className="flex items-start gap-3">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E] mt-0.5">
                              <Check size={10} strokeWidth={3} />
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary-forest mt-8 w-full text-xs font-bold uppercase tracking-wider bg-[#2A4A3E] text-[#F9F8F5] hover:bg-[#1E3630] border-0 h-11 flex items-center justify-center rounded-lg">
                      {plan.cta}
                    </a>
                  </motion.div>
                );
              }

              // Standard Cards (1 and 3) get the clean white background and copper labels
              return (
                <motion.div
                  key={plan.name + activeTab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex flex-col justify-between rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-6 md:p-8 shadow-xs hover:shadow-md transition-shadow duration-300 text-left"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82]">{plan.name}</span>
                    
                    {/* Pricing Blocks */}
                    <div className="mt-6 space-y-4">
                      <div>
                        <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">{plan.setupLabel}</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-display text-[32px] font-bold text-[#18170F]">{plan.price}</span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-[#E2DDD5]/60" />
                      
                      <div>
                        <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#5C5A52]">Recurring Fee</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-display text-[26px] font-bold text-[#18170F]">{plan.monthlyPrice}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-px bg-[#E2DDD5] my-6" />

                    <ul className="space-y-3.5 text-xs text-[#5C5A52]">
                      {plan.features.map((feat, f) => (
                        <li key={f} className="flex items-start gap-3">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E] mt-0.5">
                            <Check size={10} strokeWidth={3} />
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary-outlined mt-8 w-full text-xs font-bold uppercase tracking-wider h-11 flex items-center justify-center rounded-lg">
                    {plan.cta}
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Compliant Disclaimer Box - Old UI Style */}
        <div className="mt-12 text-center max-w-[650px] mx-auto p-5 bg-[#FAF5EF] border border-[#BF7340]/20 rounded-xl">
          <p className="text-[11px] leading-relaxed text-[#5C5A52]">
            <strong>Important Notice:</strong> Advertising budgets spent on Google Ads, Meta Ads (Facebook/Instagram), or other ad platforms are paid directly to those respective networks and are <strong>separate and not included</strong> in our agency management fees. We prioritize sustainable operational scaling and do not guarantee fixed sales, revenue numbers, or make unrealistic income claims.
          </p>
        </div>

      </div>
    </section>
  );
}
