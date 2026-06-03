import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

const TABS = [
  { id: "digital", label: "Digital Presence" },
  { id: "crm", label: "Automation & CRM" },
  { id: "growth", label: "SEO & Growth" },
];

export default function TheSystem() {
  const [activeTab, setActiveTab] = useState("digital");

  return (
    <section id="system" aria-label="Trinetra AI Automation System — WhatsApp Automation, AI CRM, Smart Follow-Up" className="relative overflow-hidden bg-[#FAF5EF] py-20 md:py-28 border-b border-[#E2DDD5]">

      <div className="main-container relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <span className="mixed-headline-eyebrow">
            The Trinetra System
          </span>
          <h2 className="display-lg text-[#18170F] tracking-tight max-w-[720px] mx-auto mb-4">
            One partner. Every capability. <br />Zero corners cut.
          </h2>
          <p className="body-lg text-[#5C5A52] max-w-[540px] mx-auto">
            From building your online presence to automating operations and driving growth — we handle every layer of your digital business.
          </p>
        </div>

        {/* Tab Switcher Wrapper */}
        <div className="flex justify-center mb-10 overflow-x-auto pb-1">
          <div className="inline-flex gap-1 bg-[#EEEAE3] p-1 rounded-lg border border-[#E2DDD5] z-10 shrink-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-semibold tracking-wide rounded transition-all duration-200 ${
                    isActive
                      ? "bg-[#FFFFFF] text-[#18170F] shadow-sm"
                      : "text-[#5C5A52] hover:text-[#18170F]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
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
            className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center bg-[#F4F2ED] border border-[#E2DDD5] rounded-2xl p-5 md:p-8 lg:p-10 shadow-xs"
          >
            
            {/* Left Column: Description & Bullet Points */}
            <div className="flex flex-col text-left">
              {activeTab === "digital" && (
                <>
                  <span className="mono-sm text-[#BF7340] uppercase tracking-wider font-semibold mb-2">WEBSITE & DIGITAL PRESENCE</span>
                  <h3 className="heading-lg text-[#18170F] mb-4">Professional websites that build credibility and capture inquiries.</h3>
                  <p className="body-md text-[#5C5A52] mb-6">
                    We design and develop mobile-responsive, SEO-ready business websites that establish trust, communicate your services clearly and convert visitors into inquiries 24/7.
                  </p>
                  <ul className="space-y-3.5">
                    {[
                      "Mobile-responsive design across all devices and screen sizes.",
                      "Landing pages, multi-page business sites, e-commerce and custom web apps.",
                      "Integrated contact forms and WhatsApp inquiry buttons.",
                      "SEO-structured to improve local search visibility from day one."
                    ].map((bullet, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E]">
                          <Check size={12} />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {activeTab === "crm" && (
                <>
                  <span className="mono-sm text-[#BF7340] uppercase tracking-wider font-semibold mb-2">AUTOMATION & CRM</span>
                  <h3 className="heading-lg text-[#18170F] mb-4">Automate lead capture, follow-ups and customer management.</h3>
                  <p className="body-md text-[#5C5A52] mb-6">
                    Stop managing leads on spreadsheets and chat logs. We set up CRM systems, WhatsApp automation and follow-up workflows so your team focuses on serving customers, not chasing them.
                  </p>
                  <ul className="space-y-3.5">
                    {[
                      "WhatsApp, Instagram and Facebook automation flows.",
                      "Lead pipeline management with status tracking.",
                      "Automated follow-up reminders and appointment booking.",
                      "Custom CRM dashboards with team access and reporting."
                    ].map((bullet, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E]">
                          <Check size={12} />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {activeTab === "growth" && (
                <>
                  <span className="mono-sm text-[#BF7340] uppercase tracking-wider font-semibold mb-2">SEO & DIGITAL MARKETING</span>
                  <h3 className="heading-lg text-[#18170F] mb-4">Improve search visibility and build a consistent online presence.</h3>
                  <p className="body-md text-[#5C5A52] mb-6">
                    We work on local SEO, Google Business Profile optimization, social media management and paid advertising to help your business be found by the right people at the right time.
                  </p>
                  <ul className="space-y-3.5">
                    {[
                      "Local SEO and Google Business Profile optimization.",
                      "On-page SEO, technical SEO and content strategy.",
                      "Google Ads and Meta Ads management for qualified inquiries.",
                      "Monthly social media content creation and posting."
                    ].map((bullet, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E]">
                          <Check size={12} />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Right Column: High Fidelity Operational Visual Flow Diagram */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-[480px] rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-4 md:p-6 shadow-sm min-h-[260px] flex flex-col justify-center">
                
                {/* Visual 1: Website & Digital Presence */}
                {activeTab === "digital" && (
                  <div className="space-y-4">
                    <span className="mono-sm text-[#8C8A82] block text-center uppercase tracking-widest font-semibold border-b border-[#E2DDD5] pb-2">Website Preview</span>
                    <div className="flex flex-col gap-3 text-xs">
                      <div className="bg-[#18170F] rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#2D6A4F]" />
                        <span className="text-[#FAF5EF]/60 mono-sm text-[10px]">yourwebsite.com</span>
                      </div>
                      <div className="bg-[#F4F2ED] rounded-lg p-3 border border-[#E2DDD5]">
                        <div className="h-1.5 w-20 bg-[#BF7340]/40 rounded mb-2" />
                        <div className="h-2.5 w-36 bg-[#18170F]/20 rounded mb-3" />
                        <div className="h-1 w-28 bg-[#5C5A52]/20 rounded mb-1" />
                        <div className="h-1 w-24 bg-[#5C5A52]/20 rounded mb-3" />
                        <div className="flex gap-2">
                          <div className="h-7 w-24 bg-[#2A4A3E] rounded-md" />
                          <div className="h-7 w-20 bg-transparent border border-[#E2DDD5] rounded-md" />
                        </div>
                      </div>
                      <div className="flex justify-center mt-1">
                        <span className="text-[10px] bg-[#F2E8DC] border border-[#BF7340]/25 text-[#BF7340] px-2.5 py-1 rounded-full font-semibold">
                          Mobile Responsive ✓ SEO Ready ✓
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual 2: Kanban Pipeline Cards */}
                {activeTab === "crm" && (
                  <div className="space-y-4">
                    <span className="mono-sm text-[#8C8A82] block text-center uppercase tracking-widest font-semibold border-b border-[#E2DDD5] pb-2">Kanban Pipelines</span>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      {/* Stage 1: Qualified */}
                      <div className="rounded-lg bg-[#F4F2ED] border border-[#E2DDD5] p-3">
                        <span className="text-[10px] text-[#8C8A82] uppercase font-bold tracking-wider">Qualified Leads</span>
                        <div className="mt-2 bg-[#FFFFFF] border border-[#E2DDD5] rounded p-2.5 shadow-xs">
                          <p className="text-xs font-semibold text-[#18170F]">Ananya Mishra</p>
                          <p className="text-[10px] text-[#5C5A52] mt-0.5">Budget: 1.5Cr+</p>
                          <span className="inline-block text-[8px] bg-[#E8F5EE] text-[#2D6A4F] font-bold px-1.5 py-0.5 rounded mt-1.5 uppercase">Real Estate</span>
                        </div>
                      </div>
                      
                      {/* Stage 2: Action Pending */}
                      <div className="rounded-lg bg-[#F4F2ED] border border-[#E2DDD5] p-3">
                        <span className="text-[10px] text-[#8C8A82] uppercase font-bold tracking-wider">Booked Demos</span>
                        <div className="mt-2 bg-[#FFFFFF] border border-[#BF7340]/20 rounded p-2.5 shadow-xs ring-1 ring-[#BF7340]/10">
                          <p className="text-xs font-semibold text-[#18170F]">Kabir Singh</p>
                          <p className="text-[10px] text-[#5C5A52] mt-0.5">Fri · 11:30 AM</p>
                          <span className="inline-block text-[8px] bg-[#F2E8DC] text-[#BF7340] font-bold px-1.5 py-0.5 rounded mt-1.5 uppercase">Coaching</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual 3: SEO & Growth */}
                {activeTab === "growth" && (
                  <div className="space-y-4">
                    <span className="mono-sm text-[#8C8A82] block text-center uppercase tracking-widest font-semibold border-b border-[#E2DDD5] pb-2">Growth Dashboard</span>
                    <div className="relative space-y-3 pt-2">
                      <div className="flex items-center gap-3 text-left">
                        <span className="h-6 w-20 shrink-0 bg-[#E8F0ED] border border-[#2A4A3E]/20 text-[#2A4A3E] text-[10px] font-bold flex items-center justify-center rounded">Local SEO</span>
                        <div className="flex-1 bg-[#F4F2ED] border border-[#E2DDD5] rounded p-2 text-[11px] text-[#5C5A52]">
                          <span className="font-semibold text-[#18170F] block mb-0.5">Google Profile Optimized</span>
                          Maps visibility improved
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-left">
                        <span className="h-6 w-20 shrink-0 bg-[#F2E8DC] border border-[#BF7340]/20 text-[#BF7340] text-[10px] font-bold flex items-center justify-center rounded">Social</span>
                        <div className="flex-1 bg-[#F4F2ED] border border-[#E2DDD5] rounded p-2 text-[11px] text-[#5C5A52]">
                          <span className="font-semibold text-[#18170F] block mb-0.5">15 Posts This Month</span>
                          Consistent brand presence
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-left">
                        <span className="h-6 w-20 shrink-0 bg-[#EEEAE3] border border-[#8C8A82]/20 text-[#5C5A52] text-[10px] font-bold flex items-center justify-center rounded">Ads</span>
                        <div className="flex-1 bg-[#F4F2ED] border border-[#E2DDD5] rounded p-2 text-[11px] text-[#5C5A52]">
                          <span className="font-semibold text-[#18170F] block mb-0.5">Campaign Active</span>
                          Targeted reach improving
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
