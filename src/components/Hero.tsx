import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight, CheckCircle2, MessageSquare, Sparkles, FolderKanban, TrendingUp } from "lucide-react";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's AI automation services.")}`;

export default function Hero() {
  const [pipelineStep, setPipelineStep] = useState(0);

  // Animation cycle loop for the right-side workflow visualization
  useEffect(() => {
    const intervals = [1600, 1800, 1800, 1800, 4000]; // timing for each stage
    let current = 0;
    let timer: ReturnType<typeof setTimeout>;

    const runNext = () => {
      current = (current + 1) % 6; // 0 to 4 steps, 5 is all showing static state
      setPipelineStep(current);
      
      let nextDelay = intervals[current] || 3000;
      if (current === 5) nextDelay = 3500; // wait before resetting

      timer = setTimeout(runNext, nextDelay);
    };

    timer = setTimeout(runNext, 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="main-content"
      aria-label="Hero — Trinetra AI WhatsApp Automation for Indian Businesses"
      className="relative overflow-hidden bg-[#F9F8F5] pt-[100px] pb-16 md:pt-[160px] md:pb-24"
      itemScope
      itemType="https://schema.org/WebPageElement"
    >
      {/* Structural visual quiet backdrop */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(#BF7340 1px, transparent 1px)`,
        backgroundSize: "24px 24px"
      }} />

      <div className="main-container relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left Column (55%) */}
        <div className="flex flex-col text-left">
          {/* Eyebrow Label */}
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mixed-headline-eyebrow"
          >
            AI Infrastructure for Indian Business
          </motion.span>

          {/* Mixed Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="display-xl text-[#18170F] tracking-tight mb-6 font-display"
          >
            Your business runs on <br />
            <span className="italic text-[#BF7340]">conversations</span>. <br />
            We make them work.
          </motion.h1>

          {/* Secondary body explanation */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="body-xl text-[#5C5A52] mb-10 max-w-[620px]"
          >
            Trinetra builds AI-powered automation infrastructure that turns raw WhatsApp chats into qualified pipelines, instant leads, and closed deals—running silently in the background without adding headcount.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-8"
          >
            <a href="#contact" className="btn-primary-forest text-sm font-semibold tracking-wide gap-2 w-full sm:w-auto">
              Book a Free Demo <ArrowUpRight size={16} />
            </a>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-outlined text-sm font-semibold tracking-wide gap-2 w-full sm:w-auto"
            >
              💬 WhatsApp Us <ArrowRight size={16} />
            </a>
            <a
              href={PHONE_TEL}
              className="text-sm font-semibold text-[#BF7340] hover:text-[#A6612E] transition-colors flex items-center gap-1.5"
            >
              📞 Call Now
            </a>
          </motion.div>

          {/* Social Micro-Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-3"
          >
            {/* Minimal harmonized avatar stack */}
            <div className="flex -space-x-2">
              {[
                { text: "R", bg: "bg-[#BF7340]/10 text-[#BF7340]" },
                { text: "A", bg: "bg-[#2A4A3E]/10 text-[#2A4A3E]" },
                { text: "K", bg: "bg-[#18170F]/10 text-[#18170F]" },
                { text: "D", bg: "bg-[#BF7340]/20 text-[#8F5226]" },
              ].map((av, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#F9F8F5] text-[10px] font-semibold ${av.bg}`}
                >
                  {av.text}
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-[#5C5A52] font-interface tracking-[0.02em]">
              Trusted by <span className="font-semibold text-[#18170F]">50+ scaling businesses</span> across India
            </span>
          </motion.div>
        </div>

        {/* Right Column (45%): Premium Workflow Loop — hidden on mobile to keep hero clean */}
        <div className="relative justify-center lg:justify-end hidden sm:flex">
          {/* Card shell simulating structured background */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative w-full max-w-[440px] rounded-2xl border border-[#E2DDD5] bg-[#F4F2ED] p-5 md:p-6 shadow-sm overflow-hidden"
            style={{ minHeight: "380px" }}
          >
            <div className="absolute top-3 left-4 flex gap-1.5 opacity-60">
              <span className="h-2 w-2 rounded-full bg-[#18170F]/10" />
              <span className="h-2 w-2 rounded-full bg-[#18170F]/10" />
              <span className="h-2 w-2 rounded-full bg-[#18170F]/10" />
            </div>
            
            <div className="mb-6 mt-1 flex justify-between items-center border-b border-[#E2DDD5] pb-3">
              <span className="mono-sm text-[#8C8A82] tracking-wider uppercase font-semibold">TRINETRA PIPELINE</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2D6A4F] bg-[#E8F5EE] px-2 py-0.5 rounded-full pulse-success-dot">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2D6A4F]" />
                Live Engine
              </span>
            </div>

            {/* Animation Steps */}
            <div className="relative space-y-4">
              
              {/* Step 1: WhatsApp Inquiry */}
              {pipelineStep >= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-3 shadow-xs"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5EE] text-[#2D6A4F] shrink-0 pulse-success-dot">
                    <MessageSquare size={14} className="fill-[#2D6A4F]/10" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-[#18170F]">WhatsApp Inquiry</span>
                      <span className="text-[9px] text-[#8C8A82] mono-sm">11:02 AM</span>
                    </div>
                    <p className="text-[12px] text-[#5C5A52] mt-0.5 truncate italic">"Hi, looking for real estate lead booking setup on WhatsApp..."</p>
                  </div>
                </motion.div>
              )}

              {/* Connector line 1 */}
              {pipelineStep >= 1 && (
                <div className="flex justify-center h-4 py-0.5">
                  <svg className="w-1.5 h-full" fill="none" viewBox="0 0 6 16">
                    <line x1="3" y1="0" x2="3" y2="16" className="workflow-connector-dash" />
                  </svg>
                </div>
              )}

              {/* Step 2: AI Qualification */}
              {pipelineStep >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl border border-[#BF7340]/30 bg-[#FFFFFF] p-3 shadow-xs ring-1 ring-[#BF7340]/10"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F2E8DC] text-[#BF7340] shrink-0">
                    <Sparkles size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#18170F]">AI Qualification</span>
                    <p className="text-[12px] text-[#BF7340] font-medium mono-sm mt-0.5">
                      Analyzing intent & budget...
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="text-[9px] bg-[#FAF5EF] text-[#BF7340] px-1.5 py-0.5 rounded border border-[#E2DDD5]">Budget Match ✓</span>
                      <span className="text-[9px] bg-[#FAF5EF] text-[#BF7340] px-1.5 py-0.5 rounded border border-[#E2DDD5]">Score: 92/100</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Connector line 2 */}
              {pipelineStep >= 2 && (
                <div className="flex justify-center h-4 py-0.5">
                  <svg className="w-1.5 h-full" fill="none" viewBox="0 0 6 16">
                    <line x1="3" y1="0" x2="3" y2="16" className="workflow-connector-dash" />
                  </svg>
                </div>
              )}

              {/* Step 3: CRM Created */}
              {pipelineStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-3 shadow-xs"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEEAE3] text-[#18170F] shrink-0">
                    <FolderKanban size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#18170F]">Lead Created in CRM</span>
                    <div className="flex items-center justify-between mt-1 text-[12px] text-[#5C5A52]">
                      <span className="font-medium text-[#18170F]">Raja S.</span>
                      <span className="text-[#8C8A82]">Category: Real Estate</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Connector line 3 */}
              {pipelineStep >= 3 && (
                <div className="flex justify-center h-4 py-0.5">
                  <svg className="w-1.5 h-full" fill="none" viewBox="0 0 6 16">
                    <line x1="3" y1="0" x2="3" y2="16" className="workflow-connector-dash" />
                  </svg>
                </div>
              )}

              {/* Step 4: Auto Follow-up */}
              {pipelineStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-3 shadow-xs"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F0ED] text-[#2A4A3E] shrink-0">
                    <CheckCircle2 size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#18170F]">Auto Follow-up Dispatched</span>
                    <p className="text-[11px] text-[#2D6A4F] bg-[#E8F5EE] border border-[#2D6A4F]/10 rounded px-2 py-1 mt-1 font-medium">
                      "Site visit confirmed ✓ Rajasthan Apts"
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Connector line 4 */}
              {pipelineStep >= 4 && (
                <div className="flex justify-center h-4 py-0.5">
                  <svg className="w-1.5 h-full" fill="none" viewBox="0 0 6 16">
                    <line x1="3" y1="0" x2="3" y2="16" className="workflow-connector-dash" />
                  </svg>
                </div>
              )}

              {/* Step 5: Deal Closed */}
              {pipelineStep >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-start gap-3 rounded-xl border border-[#2D6A4F]/20 bg-[#E8F5EE] p-3 shadow-sm"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2D6A4F] text-[#F9F8F5] shrink-0">
                    <TrendingUp size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#2D6A4F]">Pipeline Closed</span>
                    <p className="text-[13px] font-bold text-[#18170F] mt-0.5">₹2.4L revenue logged</p>
                  </div>
                </motion.div>
              )}

            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
