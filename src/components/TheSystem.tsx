import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Globe, Layout, Layers, Database, ArrowUpRight, ShieldCheck } from "lucide-react";
import LazyVideo from "./LazyVideo";

const TABS = [
  { id: "digital", label: "Digital Presence" },
  { id: "crm", label: "Automation & CRM" },
  { id: "growth", label: "SEO & Growth" },
];

export default function TheSystem() {
  const [activeTab, setActiveTab] = useState("digital");

  return (
    <section id="system" aria-label="Trinetra AI Automation System — WhatsApp Automation, AI CRM, Smart Follow-Up" className="relative overflow-hidden bg-white py-24 md:py-32 border-b border-border/80">
      <div className="absolute inset-0 grid-pattern opacity-[0.01] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-4 md:px-10 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="mixed-headline-eyebrow">
            The Trinetra System
          </span>
          <h2 className="display-lg text-ink-1 tracking-tight max-w-[720px] mx-auto mb-4 font-display font-bold">
            One partner. Every capability. <br />Zero corners cut.
          </h2>
          <p className="body-lg text-ink-2 max-w-[540px] mx-auto font-medium">
            From building your online presence to automating operations and driving growth — we handle every layer of your digital business.
          </p>
        </div>

        {/* ── MOBILE / TABLET VIEW (Clickable Tabs) ── */}
        <div className="block lg:hidden">
          {/* Tab Switcher Wrapper (Toolbar style with horizontal scroll mask) */}
          <div className="relative mb-12 w-full max-w-lg mx-auto">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
            
            <div className="flex overflow-x-auto pb-2 px-6 justify-start sm:justify-center custom-scrollbar">
              <div className="inline-flex gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/80 z-10 shrink-0 shadow-sm backdrop-blur-xs">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-5 py-2.5 text-xs font-semibold tracking-wide rounded-lg transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-white text-slate-900 border border-slate-200/80 shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Content Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="grid gap-8 md:grid-cols-2 md:items-center bg-[#F8FAFC] border border-border/80 rounded-2xl p-6 md:p-10 shadow-xs text-left"
            >
              {/* Left Column: Description & Bullet Points */}
              <div className="flex flex-col space-y-6">
                {activeTab === "digital" && (
                  <>
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase bg-accent-light px-2.5 py-1 rounded border border-accent/15 inline-block">WEBSITE & DIGITAL PRESENCE</span>
                      <h3 className="text-xl font-bold tracking-tight text-ink-1 leading-tight font-display">Professional websites that build credibility and capture inquiries.</h3>
                    </div>
                    <p className="text-xs text-ink-2 leading-relaxed font-semibold">
                      We design and develop mobile-responsive, SEO-ready business websites that establish trust, communicate your services clearly and convert visitors into inquiries 24/7.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Mobile-responsive design across all devices and screen sizes.",
                        "Landing pages, multi-page business sites, e-commerce and custom web apps.",
                        "Integrated contact forms and WhatsApp inquiry buttons.",
                        "SEO-structured to improve local search visibility from day one."
                      ].map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3 text-[11px] font-semibold text-ink-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                            <Check size={11} />
                          </span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === "crm" && (
                  <>
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase bg-accent-light px-2.5 py-1 rounded border border-accent/15 inline-block">AUTOMATION & CRM</span>
                      <h3 className="text-xl font-bold tracking-tight text-ink-1 leading-tight font-display">Automate lead capture, follow-ups and customer management.</h3>
                    </div>
                    <p className="text-xs text-ink-2 leading-relaxed font-semibold">
                      Stop managing leads on spreadsheets and chat logs. We set up CRM systems, WhatsApp automation and follow-up workflows so your team focuses on serving customers, not chasing them.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "WhatsApp, Instagram and Facebook automation flows.",
                        "Lead pipeline management with status tracking.",
                        "Automated follow-up reminders and appointment booking.",
                        "Custom CRM dashboards with team access and reporting."
                      ].map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3 text-[11px] font-semibold text-ink-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                            <Check size={11} />
                          </span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === "growth" && (
                  <>
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase bg-accent-light px-2.5 py-1 rounded border border-accent/15 inline-block">SEO & DIGITAL MARKETING</span>
                      <h3 className="text-xl font-bold tracking-tight text-ink-1 leading-tight font-display">Improve search visibility and build a consistent online presence.</h3>
                    </div>
                    <p className="text-xs text-ink-2 leading-relaxed font-semibold">
                      We work on local SEO, Google Business Profile optimization, social media management and paid advertising to help your business be found by the right people at the right time.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Local SEO and Google Business Profile optimization.",
                        "On-page SEO, technical SEO and content strategy.",
                        "Google Ads and Meta Ads management for qualified inquiries.",
                        "Monthly social media content creation and posting."
                      ].map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3 text-[11px] font-semibold text-ink-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                            <Check size={11} />
                          </span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Right Column: High Fidelity Operational Visual Flow Diagram */}
              <div className="flex items-center justify-center mt-6 md:mt-0">
                <div className="w-full max-w-[400px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-h-[260px] flex flex-col justify-center text-left">
                  {activeTab === "digital" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-1.5 flex items-center justify-between border border-slate-800">
                        <span className="text-slate-400 font-mono text-[9px]">yourwebsite.com</span>
                        <ArrowUpRight size={10} className="text-slate-500" />
                      </div>
                      <LazyVideo src="/build-growth-automate.mp4" className="rounded-lg aspect-video border border-slate-150 shadow-inner" />
                    </div>
                  )}

                  {activeTab === "crm" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-1.5 flex items-center justify-between border border-slate-800">
                        <span className="text-slate-400 font-mono text-[9px]">crm.yourwebsite.com</span>
                        <ArrowUpRight size={10} className="text-slate-500" />
                      </div>
                      <LazyVideo src="/why-tinetra.mp4" className="rounded-lg aspect-video border border-slate-150 shadow-inner" />
                    </div>
                  )}

                  {activeTab === "growth" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-1.5 flex items-center justify-between border border-slate-800">
                        <span className="text-slate-400 font-mono text-[9px]">analytics.yourwebsite.com</span>
                        <ArrowUpRight size={10} className="text-slate-500" />
                      </div>
                      <LazyVideo src="/pricing.mp4" className="rounded-lg aspect-video border border-slate-150 shadow-inner" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── DESKTOP VIEW (Sticky Scroll corridor) ── */}
        <div className="hidden lg:grid grid-cols-[1.1fr_0.9fr] gap-16 items-start relative max-w-6xl mx-auto">
          {/* Left Column: Spaced narrative items triggering tab updates on scroll */}
          <div className="space-y-8 pb-[15vh] w-full">
            {/* Panel 1 */}
            <motion.div
              onViewportEnter={() => setActiveTab("digital")}
              viewport={{ amount: 0.35, margin: "-15% 0px -15% 0px" }}
              className={`transition-all duration-300 py-8 text-left space-y-6 ${
                activeTab === "digital" ? "opacity-100" : "opacity-35"
              }`}
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase bg-accent-light px-2.5 py-1 rounded border border-accent/15 inline-block">WEBSITE & DIGITAL PRESENCE</span>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Professional websites that build credibility and capture inquiries.</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                We design and develop mobile-responsive, SEO-ready business websites that establish trust, communicate your services clearly and convert visitors into inquiries 24/7.
              </p>
              <ul className="space-y-3">
                {[
                  "Mobile-responsive design across all devices and screen sizes.",
                  "Landing pages, multi-page business sites, e-commerce and custom web apps.",
                  "Integrated contact forms and WhatsApp inquiry buttons.",
                  "SEO-structured to improve local search visibility from day one."
                ].map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11px] font-semibold text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                      <Check size={11} />
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Panel 2 */}
            <motion.div
              onViewportEnter={() => setActiveTab("crm")}
              viewport={{ amount: 0.35, margin: "-15% 0px -15% 0px" }}
              className={`transition-all duration-300 py-8 text-left space-y-6 ${
                activeTab === "crm" ? "opacity-100" : "opacity-35"
              }`}
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase bg-accent-light px-2.5 py-1 rounded border border-accent/15 inline-block">AUTOMATION & CRM</span>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Automate lead capture, follow-ups and customer management.</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                Stop managing leads on spreadsheets and chat logs. We set up CRM systems, WhatsApp automation and follow-up workflows so your team focuses on serving customers, not chasing them.
              </p>
              <ul className="space-y-3">
                {[
                  "WhatsApp, Instagram and Facebook automation flows.",
                  "Lead pipeline management with status tracking.",
                  "Automated follow-up reminders and appointment booking.",
                  "Custom CRM dashboards with team access and reporting."
                ].map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11px] font-semibold text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                      <Check size={11} />
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Panel 3 */}
            <motion.div
              onViewportEnter={() => setActiveTab("growth")}
              viewport={{ amount: 0.35, margin: "-15% 0px -15% 0px" }}
              className={`transition-all duration-300 py-8 text-left space-y-6 ${
                activeTab === "growth" ? "opacity-100" : "opacity-35"
              }`}
            >
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase bg-accent-light px-2.5 py-1 rounded border border-accent/15 inline-block">SEO & DIGITAL MARKETING</span>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-display">Improve search visibility and build a consistent online presence.</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                We work on local SEO, Google Business Profile optimization, social media management and paid advertising to help your business be found by the right people at the right time.
              </p>
              <ul className="space-y-3">
                {[
                  "Local SEO and Google Business Profile optimization.",
                  "On-page SEO, technical SEO and content strategy.",
                  "Google Ads and Meta Ads management for qualified inquiries.",
                  "Monthly social media content creation and posting."
                ].map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11px] font-semibold text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                      <Check size={11} />
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right Column: Sticky Mockup Viewer with Cross-Fading Videos */}
          <div className="sticky top-28 py-12 flex items-center justify-center w-full">
            <div className="w-full max-w-[440px] rounded-xl border border-slate-200 bg-white p-6 shadow-md min-h-[300px] flex flex-col justify-center text-left">
              <AnimatePresence mode="wait">
                {activeTab === "digital" && (
                  <motion.div
                    key="digital-vid-d"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <span className="text-[9px] font-mono font-bold text-slate-400 block text-center uppercase tracking-widest border-b border-slate-100 pb-3">Website Preview</span>
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                          <span className="text-slate-400 font-mono text-[9px] tracking-wide">yourwebsite.com</span>
                        </div>
                        <ArrowUpRight size={10} className="text-slate-500" />
                      </div>
                      <LazyVideo src="/build-growth-automate.mp4" className="rounded-lg aspect-video border border-slate-150 shadow-inner" />
                      <div className="flex justify-center mt-1">
                        <span className="text-[9px] font-mono bg-accent-light border border-accent/20 text-accent px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          Mobile Responsive ✓ SEO Ready ✓
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "crm" && (
                  <motion.div
                    key="crm-vid-d"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <span className="text-[9px] font-mono font-bold text-slate-400 block text-center uppercase tracking-widest border-b border-slate-100 pb-3">Automation & CRM</span>
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          <span className="text-slate-400 font-mono text-[9px] tracking-wide">crm.yourwebsite.com</span>
                        </div>
                        <ArrowUpRight size={10} className="text-slate-500" />
                      </div>
                      <LazyVideo src="/why-tinetra.mp4" className="rounded-lg aspect-video border border-slate-150 shadow-inner" />
                      <div className="flex justify-center mt-1">
                        <span className="text-[9px] font-mono bg-accent-light border border-accent/20 text-accent px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          WhatsApp Auto-Alerts Active ✓
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "growth" && (
                  <motion.div
                    key="growth-vid-d"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <span className="text-[9px] font-mono font-bold text-slate-400 block text-center uppercase tracking-widest border-b border-slate-100 pb-3">Growth Dashboard</span>
                    <div className="flex flex-col gap-3">
                      <div className="bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between border border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-slate-400 font-mono text-[9px] tracking-wide">analytics.yourwebsite.com</span>
                        </div>
                        <ArrowUpRight size={10} className="text-slate-500" />
                      </div>
                      <LazyVideo src="/pricing.mp4" className="rounded-lg aspect-video border border-slate-150 shadow-inner" />
                      <div className="flex justify-center mt-1">
                        <span className="text-[9px] font-mono bg-accent-light border border-accent/20 text-accent px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          SEO Crawler Tracked ✓
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
