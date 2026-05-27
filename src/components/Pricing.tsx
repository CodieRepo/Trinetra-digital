import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's AI automation services.")}`;

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const starterPrice = billing === "annual" ? "₹3,199" : "₹3,999";
  const growthPrice = billing === "annual" ? "₹7,999" : "₹9,999";

  return (
    <section id="pricing" aria-label="Pricing Plans — AI Automation Infrastructure Packages" className="relative overflow-hidden bg-[#F4F2ED] py-20 md:py-28 border-b border-[#E2DDD5]">

      <div className="main-container relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <span className="mixed-headline-eyebrow">
            Pricing & Infrastructure Onboarding
          </span>
          <h2 className="display-lg text-[#18170F] tracking-tight mb-4">
            Professional AI infrastructure onboarding.
          </h2>
          <p className="body-lg text-[#5C5A52] max-w-[580px] mx-auto mb-8">
            Bespoke engineering deployments with continuous maintenance. Turn WhatsApp chats into asset pipelines.
          </p>

          {/* Monthly / Annual Billing Toggle Switch */}
          <div className="inline-flex items-center gap-3 bg-[#EEEAE3] border border-[#E2DDD5] p-1 rounded-lg z-10">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-3 py-1.5 text-xs font-semibold tracking-wide rounded transition-all duration-200 ${
                billing === "monthly"
                  ? "bg-[#FFFFFF] text-[#18170F] shadow-xs"
                  : "text-[#5C5A52] hover:text-[#18170F]"
              }`}
            >
              Billed Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide rounded transition-all duration-200 ${
                billing === "annual"
                  ? "bg-[#FFFFFF] text-[#18170F] shadow-xs"
                  : "text-[#5C5A52] hover:text-[#18170F]"
              }`}
            >
              Billed Annually
              <span className="text-[9px] bg-[#FAF5EF] border border-[#BF7340]/30 text-[#BF7340] px-1 rounded-full uppercase font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto items-stretch mt-12">
          
          {/* Starter Plan */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-between rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-8 shadow-xs hover:shadow-md transition-shadow duration-300 text-left"
          >
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82]">Starter Plan</span>
              
              {/* Distinct Pricing Blocks */}
              <div className="mt-6 space-y-4">
                {/* One-Time Setup */}
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">One-Time Onboarding</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="font-display text-[32px] font-bold text-[#18170F]">₹15,000</span>
                    <span className="text-[10px] text-[#5C5A52] font-semibold uppercase tracking-wider font-interface">setup fee</span>
                  </div>
                  <p className="text-[10.5px] text-[#8C8A82] mt-1 font-mono italic">
                    “Initial System Setup”
                  </p>
                </div>
                
                {/* Divider inside price block */}
                <div className="h-px bg-[#E2DDD5]/60" />
                
                {/* Monthly Infrastructure */}
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#5C5A52]">Monthly Infrastructure</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="font-display text-[26px] font-bold text-[#18170F]">{starterPrice}</span>
                    <span className="text-xs text-[#5C5A52]">/ month</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-[#E2DDD5] my-6" />

              <ul className="space-y-3.5 text-xs text-[#5C5A52]">
                {[
                  "WhatsApp API configuration",
                  "Auto-routing lead parser",
                  "Standard AI qualification (Hinglish support)",
                  "CRM pipeline lead capture",
                  "2,000 active monthly chats included",
                  "Email and chat support"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E]">
                      <Check size={10} />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary-outlined mt-8 w-full text-xs font-bold uppercase tracking-wider h-11 flex items-center justify-center rounded-lg">
              Get Started
            </a>
          </motion.div>

          {/* Growth Plan - Featured Card in Dark Surface (#131210) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col justify-between rounded-xl border border-[#BF7340]/40 bg-[#131210] p-8 shadow-md ring-1 ring-[#BF7340]/25 text-left relative overflow-hidden"
          >
            {/* Shimmer top accent */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340]" />

            <div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#FAF5EF]/60">Growth Plan</span>
                <span className="text-[9px] bg-[#BF7340] text-[#FAF5EF] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles size={8} /> Most Popular
                </span>
              </div>
              
              {/* Distinct Pricing Blocks */}
              <div className="mt-6 space-y-4">
                {/* One-Time Setup */}
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">One-Time Onboarding</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="font-display text-[32px] font-bold text-[#F9F8F5]">₹30,000</span>
                    <span className="text-[10px] text-[#FAF5EF]/60 font-semibold uppercase tracking-wider font-interface">setup fee</span>
                  </div>
                  <p className="text-[10.5px] text-[#BF7340] mt-1 font-mono italic">
                    “Automation Infrastructure Setup”
                  </p>
                </div>
                
                {/* Divider inside price block */}
                <div className="h-px bg-white/10" />
                
                {/* Monthly Infrastructure */}
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#FAF5EF]/60">Monthly Infrastructure</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="font-display text-[26px] font-bold text-[#F9F8F5]">{growthPrice}</span>
                    <span className="text-xs text-[#FAF5EF]/60">/ month</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-white/10 my-6" />

              <ul className="space-y-3.5 text-xs text-[#FAF5EF]/80">
                {[
                  "Advanced custom-trained AI qualifier",
                  "Smart re-engagement sequences (Days 1, 3, 7)",
                  "Visual Kanban CRM dashboards",
                  "Automated demo & visit booking slots",
                  "8,000 active monthly chats included",
                  "Priority whatsapp support",
                  "Bespoke analytics and KPI reports"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E]">
                      <Check size={10} />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary-forest mt-8 w-full text-xs font-bold uppercase tracking-wider bg-[#2A4A3E] text-[#F9F8F5] hover:bg-[#1E3630] border-0 h-11 flex items-center justify-center rounded-lg">
              Start Scaling
            </a>
          </motion.div>

          {/* Enterprise Plan */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col justify-between rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-8 shadow-xs hover:shadow-md transition-shadow duration-300 text-left"
          >
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82]">Enterprise Plan</span>
              
              {/* Distinct Pricing Blocks */}
              <div className="mt-6 space-y-4">
                {/* One-Time Setup */}
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#BF7340]">One-Time Onboarding</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="font-display text-[32px] font-bold text-[#18170F]">₹50,000+</span>
                    <span className="text-[10px] text-[#5C5A52] font-semibold uppercase tracking-wider font-interface">setup fee</span>
                  </div>
                  <p className="text-[10.5px] text-[#8C8A82] mt-1 font-mono italic">
                    “Custom AI Workflow Deployment”
                  </p>
                </div>
                
                {/* Divider inside price block */}
                <div className="h-px bg-[#E2DDD5]/60" />
                
                {/* Monthly Infrastructure */}
                <div>
                  <p className="text-[9.5px] uppercase tracking-wider font-semibold text-[#5C5A52]">Monthly Infrastructure</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="font-display text-[26px] font-bold text-[#18170F]">Custom</span>
                    <span className="text-xs text-[#5C5A52]">/ recurring</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-[#E2DDD5] my-6" />

              <ul className="space-y-3.5 text-xs text-[#5C5A52]">
                {[
                  "Fully custom-built visual SaaS interfaces",
                  "Unlimited multi-channel triggers (Meta, Web, SMS)",
                  "Dedicated hosting instances (low latency)",
                  "Strict enterprise security & SLA support",
                  "Proprietary ERP system hooks",
                  "Dedicated solution architect consult"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E]">
                      <Check size={10} />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a href={`mailto:${EMAIL}`} className="btn-secondary-outlined mt-8 w-full text-xs font-bold uppercase tracking-wider h-11 flex items-center justify-center rounded-lg">
              Consult Architect
            </a>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
