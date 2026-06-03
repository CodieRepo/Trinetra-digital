import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Plus, ArrowRight } from "lucide-react";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'd like to learn more about Trinetra Digital Solution's packages and pricing.")}`;

type ServiceCategory = "packages" | "addons";

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<ServiceCategory>("packages");

  const packages = [
    {
      name: "Starter Presence",
      bestFor: "Best for local service providers establishing credibility.",
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
      bestFor: "Best for growing businesses wanting structured leads.",
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
      bestFor: "Best for teams looking to automate sales pipeline follow-ups.",
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
      bestFor: "Best for custom databases, dashboards, and app workflows.",
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
    <section id="pricing" aria-label="Pricing Plans — Software and Growth Staged Packages" className="relative overflow-hidden bg-[#F8FAFC] py-24 md:py-32 border-b border-border/80">
      <div className="absolute inset-0 grid-pattern opacity-[0.01] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-4 md:px-10 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="mixed-headline-eyebrow">
            Pricing & Project Packages
          </span>
          <h2 className="display-lg text-ink-1 tracking-tight mb-4 font-display font-bold">
            Transparent pricing. Clear project scope.
          </h2>
          <p className="body-lg text-[#5C5A52] max-w-[580px] mx-auto mb-10 font-medium">
            Choose a solution suited to your current business stage. Honest prices, no hidden charges, no unrealistic claims.
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex items-center gap-1 bg-slate-100/85 border border-slate-200/80 p-1.5 rounded-xl z-10 max-w-full overflow-x-auto shadow-xs backdrop-blur-xs">
            {(["packages", "addons"] as ServiceCategory[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-xs font-semibold tracking-wide rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-white text-slate-900 border border-slate-200/85 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
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
                      className="flex flex-col justify-between rounded-xl border-2 border-accent bg-slate-950 p-6 md:p-8 shadow-md text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-[3px] bg-accent" />
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">{plan.name}</span>
                          <span className="text-[9px] bg-accent text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Sparkles size={8} /> Recommended
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-accent mt-2">{plan.bestFor}</p>
                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-accent font-mono">{plan.setupLabel}</p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="font-display text-[28px] font-bold text-white tracking-tight">{plan.price}</span>
                            </div>
                          </div>
                          <div className="h-px bg-slate-800" />
                          <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 font-mono">Monthly</p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="font-display text-[22px] font-bold text-white tracking-tight">{plan.monthlyPrice}</span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-px bg-slate-800 my-5" />
                        <p className="text-[11px] text-slate-400 mb-6 leading-relaxed font-semibold">{plan.desc}</p>
                        <ul className="space-y-3.5 text-[11.5px] text-slate-300">
                          {plan.features.map((feat, f) => (
                            <li key={f} className="flex items-start gap-3">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent mt-0.5 border border-accent/20">
                                <Check size={10} strokeWidth={3} />
                              </span>
                              <span className="font-semibold">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="mt-8 w-full text-xs font-bold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover transition-colors h-11 flex items-center justify-center rounded-lg shadow-sm">
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
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs hover:shadow-md transition-all duration-300 text-left"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">{plan.name}</span>
                      <p className="text-[11px] font-semibold text-accent mt-2">{plan.bestFor}</p>
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-bold text-accent font-mono">{plan.setupLabel}</p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-display text-[28px] font-bold text-slate-900 tracking-tight">{plan.price}</span>
                          </div>
                        </div>
                        <div className="h-px bg-slate-100" />
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 font-mono">Monthly</p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-display text-[22px] font-bold text-slate-900 tracking-tight">{plan.monthlyPrice}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full h-px bg-slate-100 my-5" />
                      <p className="text-[11px] text-slate-500 mb-6 leading-relaxed font-semibold">{plan.desc}</p>
                      <ul className="space-y-3.5 text-[11.5px] text-slate-600">
                        {plan.features.map((feat, f) => (
                          <li key={f} className="flex items-start gap-3">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] mt-0.5 border border-[#A3E0BA]">
                              <Check size={10} strokeWidth={3} />
                            </span>
                            <span className="font-semibold">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="mt-8 w-full text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors h-11 flex items-center justify-center rounded-lg shadow-xs">
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
              <div key={gi} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Plus size={13} className="text-accent" />
                    <span className="text-[9.5px] uppercase font-bold tracking-widest text-accent font-mono">{group.category}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <span className="text-[11.5px] font-semibold text-slate-800">{item.name}</span>
                        <span className="text-[11px] font-bold text-accent font-mono shrink-0 ml-3">{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors uppercase tracking-wider font-mono">
                  Enquire About {group.category}
                </a>
              </div>
            ))}
          </motion.div>
        )}

        {/* Compliant Disclaimer Box */}
        <div className="mt-12 text-center max-w-[680px] mx-auto p-6 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[10px] leading-relaxed text-slate-500 font-mono font-semibold">
            <strong>Important Notice:</strong> Monthly fees cover ongoing support, maintenance and management services. Advertising budgets spent on Google Ads, Meta Ads (Facebook/Instagram), or other platforms are paid directly to those networks and are <strong>separate and not included</strong> in our fees. We do not guarantee specific business results, rankings, leads or revenue figures. We present capabilities, features and potential service benefits only.
          </p>
        </div>

      </div>
    </section>
  );
}
