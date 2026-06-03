import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Plus } from "lucide-react";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'd like to learn more about Trinetra Digital Solution's packages and pricing.")}`;

type ServiceCategory = "packages" | "addons";

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<ServiceCategory>("packages");

  const packages = [
    {
      name: "Starter Presence",
      price: "₹14,999",
      setupLabel: "One-Time Setup",
      monthlyPrice: "₹2,999/month",
      desc: "Ideal for local businesses and service providers establishing their initial digital presence and online credibility.",
      features: [
        "Professional Landing Page Website",
        "Mobile Optimization",
        "WhatsApp Integration",
        "Lead Inquiry Form",
        "Google Business Profile Assistance",
        "Social Media Profile Setup",
        "8 Social Media Posts Per Month",
        "Monthly Support"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Growth Engine",
      price: "₹29,999",
      setupLabel: "One-Time Setup",
      monthlyPrice: "₹5,999/month",
      desc: "For growing businesses that need a professional website, lead capture system and structured online visibility.",
      features: [
        "Multi-Page Business Website",
        "Local SEO Foundation Setup",
        "Google Business Profile Optimization",
        "Lead Capture System",
        "WhatsApp Lead Automation",
        "Auto Reply Configuration",
        "Follow-Up Workflow Setup",
        "15 Social Media Posts Per Month",
        "Monthly Reporting",
        "Technical Maintenance"
      ],
      cta: "Choose Growth Engine",
      popular: true
    },
    {
      name: "Sales System",
      price: "₹59,999",
      setupLabel: "One-Time Setup",
      monthlyPrice: "₹9,999/month",
      desc: "A complete lead management and automation system for businesses ready to streamline their sales operations.",
      features: [
        "CRM Setup & Lead Pipeline",
        "WhatsApp Automation",
        "Instagram Automation",
        "Facebook Automation",
        "Appointment Booking System",
        "Lead Reminder Automation",
        "20 Social Media Posts Per Month",
        "Monthly Optimization Review"
      ],
      cta: "Choose Sales System",
      popular: false
    },
    {
      name: "Business OS",
      price: "₹1,49,999+",
      setupLabel: "One-Time Investment",
      monthlyPrice: "₹19,999+/month",
      desc: "A fully custom business operating system with advanced software, dashboards and end-to-end workflow automation.",
      features: [
        "Custom Business Software",
        "Advanced CRM & Pipeline",
        "Dashboard Development",
        "Business Workflow Automation",
        "Reporting & Analytics Systems",
        "SEO & Content Support",
        "Custom Third-Party Integrations",
        "Dedicated Support"
      ],
      cta: "Book Consultation",
      popular: false
    }
  ];

  const addonGroups = [
    {
      category: "Website Development",
      items: [
        { name: "Landing Page Website", price: "₹14,999" },
        { name: "Business Website", price: "₹29,999" },
        { name: "Premium Business Website", price: "₹49,999" },
        { name: "Custom Web Application", price: "₹75,000+" },
      ]
    },
    {
      category: "SEO",
      items: [
        { name: "Local SEO", price: "₹7,999/month" },
        { name: "Business SEO", price: "₹14,999/month" },
        { name: "Advanced SEO", price: "₹24,999/month" },
      ]
    },
    {
      category: "Social Media Management",
      items: [
        { name: "Social Presence", price: "₹5,999/month" },
        { name: "Growth Social", price: "₹9,999/month" },
        { name: "Premium Social", price: "₹14,999/month" },
      ]
    },
    {
      category: "Ads Management",
      items: [
        { name: "Starter Ads Management", price: "₹7,999/month" },
        { name: "Growth Ads Management", price: "₹14,999/month" },
        { name: "Scale Ads Management", price: "₹24,999/month" },
      ]
    },
    {
      category: "Automation",
      items: [
        { name: "WhatsApp Automation", price: "₹14,999 Setup" },
        { name: "Business Automation", price: "₹34,999 Setup" },
        { name: "AI Sales Assistant", price: "₹59,999 Setup" },
      ]
    },
    {
      category: "Custom Software",
      items: [
        { name: "Small Business System", price: "₹49,999+" },
        { name: "Business Management Software", price: "₹1,49,999+" },
        { name: "Enterprise Solution", price: "Custom Quote" },
      ]
    },
  ];

  return (
    <section id="pricing" aria-label="Pricing Plans — Software and Growth Staged Packages" className="relative overflow-hidden bg-[#F4F2ED] py-20 md:py-28 border-b border-[#E2DDD5]">
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
            Choose a solution suited to your current business stage. Honest prices, no hidden charges, no unrealistic claims.
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex items-center gap-2 bg-[#EEEAE3] border border-[#E2DDD5] p-1 rounded-lg z-10 max-w-full overflow-x-auto">
            {(["packages", "addons"] as ServiceCategory[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-semibold tracking-wide rounded transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-[#FFFFFF] text-[#18170F] shadow-xs"
                    : "text-[#5C5A52] hover:text-[#18170F]"
                }`}
              >
                {tab === "packages" ? "Growth Packages" : "Add-On Services"}
              </button>
            ))}
          </div>
        </div>

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto items-stretch mt-10">
            <AnimatePresence mode="wait">
              {packages.map((plan, i) => {
                if (plan.popular) {
                  return (
                    <motion.div
                      key={plan.name}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col justify-between rounded-xl border border-[#BF7340]/40 bg-[#131210] p-6 md:p-8 shadow-md ring-1 ring-[#BF7340]/25 text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340]" />
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FAF5EF]/60">{plan.name}</span>
                          <span className="text-[9px] bg-[#BF7340] text-[#FAF5EF] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Sparkles size={8} /> Most Popular
                          </span>
                        </div>
                        <div className="mt-6 space-y-4">
                          <div>
                            <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">{plan.setupLabel}</p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="font-display text-[28px] font-bold text-[#F9F8F5]">{plan.price}</span>
                            </div>
                          </div>
                          <div className="h-px bg-white/10" />
                          <div>
                            <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#FAF5EF]/60">Monthly</p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="font-display text-[22px] font-bold text-[#F9F8F5]">{plan.monthlyPrice}</span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-px bg-white/10 my-5" />
                        <p className="text-[11px] text-[#FAF5EF]/50 mb-4 leading-relaxed">{plan.desc}</p>
                        <ul className="space-y-3 text-xs text-[#FAF5EF]/80">
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
                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex flex-col justify-between rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-6 md:p-8 shadow-xs hover:shadow-md transition-shadow duration-300 text-left"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82]">{plan.name}</span>
                      <div className="mt-6 space-y-4">
                        <div>
                          <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">{plan.setupLabel}</p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-display text-[28px] font-bold text-[#18170F]">{plan.price}</span>
                          </div>
                        </div>
                        <div className="h-px bg-[#E2DDD5]/60" />
                        <div>
                          <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#5C5A52]">Monthly</p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-display text-[22px] font-bold text-[#18170F]">{plan.monthlyPrice}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full h-px bg-[#E2DDD5] my-5" />
                      <p className="text-[11px] text-[#5C5A52] mb-4 leading-relaxed">{plan.desc}</p>
                      <ul className="space-y-3 text-xs text-[#5C5A52]">
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
        )}

        {/* Add-Ons Tab */}
        {activeTab === "addons" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
          >
            {addonGroups.map((group, gi) => (
              <div key={gi} className="bg-white border border-[#E2DDD5] rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Plus size={14} className="text-[#BF7340]" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#BF7340]">{group.category}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.items.map((item, ii) => (
                    <div key={ii} className="flex items-center justify-between border-b border-[#F4F2ED] pb-2 last:border-0 last:pb-0">
                      <span className="text-xs font-medium text-[#18170F]">{item.name}</span>
                      <span className="text-xs font-bold text-[#BF7340] shrink-0 ml-3">{item.price}</span>
                    </div>
                  ))}
                </div>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 h-9 rounded-lg border border-[#E2DDD5] bg-[#F4F2ED] text-xs font-semibold text-[#18170F] hover:bg-[#EEEAE3] transition-colors">
                  Enquire About {group.category}
                </a>
              </div>
            ))}
          </motion.div>
        )}

        {/* Compliant Disclaimer Box */}
        <div className="mt-8 text-center max-w-[650px] mx-auto p-5 bg-[#FAF5EF] border border-[#BF7340]/20 rounded-xl">
          <p className="text-[11px] leading-relaxed text-[#5C5A52]">
            <strong>Important Notice:</strong> Monthly fees cover ongoing support, maintenance and management services. Advertising budgets spent on Google Ads, Meta Ads (Facebook/Instagram), or other platforms are paid directly to those networks and are <strong>separate and not included</strong> in our fees. We do not guarantee specific business results, rankings, leads or revenue figures. We present capabilities, features and potential service benefits only.
          </p>
        </div>

      </div>
    </section>
  );
}
