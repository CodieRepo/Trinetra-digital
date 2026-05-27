import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MessageSquare, ShieldCheck, Clock, Layers, Sparkles, Send, Users, Calendar } from "lucide-react";

const TABS = [
  { id: "whatsapp", label: "WhatsApp Automation" },
  { id: "crm", label: "AI Lead CRM" },
  { id: "followup", label: "Smart Follow-Up" },
];

export default function TheSystem() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  return (
    <section id="system" className="relative overflow-hidden bg-[#FAF5EF] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <span className="mixed-headline-eyebrow">
            The Trinetra System
          </span>
          <h2 className="display-lg text-[#18170F] tracking-tight max-w-[720px] mx-auto mb-4">
            One platform. Every conversation. <br />Zero missed opportunities.
          </h2>
          <p className="body-lg text-[#5C5A52] max-w-[540px] mx-auto">
            Built on top of your existing WhatsApp business number. No complex training or heavy software migrations required.
          </p>
        </div>

        {/* Tab Switcher Wrapper */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex gap-1 bg-[#EEEAE3] p-1 rounded-lg border border-[#E2DDD5] z-10">
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
            className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center bg-[#F4F2ED] border border-[#E2DDD5] rounded-2xl p-6 md:p-10 shadow-xs"
          >
            
            {/* Left Column: Description & Bullet Points */}
            <div className="flex flex-col text-left">
              {activeTab === "whatsapp" && (
                <>
                  <span className="mono-sm text-[#BF7340] uppercase tracking-wider font-semibold mb-2">INTELLIGENT ROUTING</span>
                  <h3 className="heading-lg text-[#18170F] mb-4">Instant response, fully automated qualification.</h3>
                  <p className="body-md text-[#5C5A52] mb-6">
                    Our AI instantly replies to incoming WhatsApp inquiries, questions, and advertisements. It scans intent, profiles budgets, and captures email/phone records in seconds.
                  </p>
                  <ul className="space-y-3.5">
                    {[
                      "Replies to leads under 3 minutes, 24/7.",
                      "Qualifies buyer intent and budget automatically.",
                      "Hands off hot leads to representatives with full chat history.",
                      "Custom Indian contextual NLP (handles Hinglish/local terms)."
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
                  <span className="mono-sm text-[#BF7340] uppercase tracking-wider font-semibold mb-2">OPERATIONAL CLARITY</span>
                  <h3 className="heading-lg text-[#18170F] mb-4">A CRM that feeds itself. No manual entry.</h3>
                  <p className="body-md text-[#5C5A52] mb-6">
                    Stop forcing salespeople to type notes. Trinetra extracts lead details straight from active WhatsApp conversations, organizing them into a visual CRM pipeline.
                  </p>
                  <ul className="space-y-3.5">
                    {[
                      "Extracts customer names, requirements, and budgets dynamically.",
                      "Kanban board displays stages (Inquiry -> Qualified -> Booked).",
                      "Score metrics indicate high-converting buyer profiles.",
                      "Instantly pushes qualified data into standard CRM tools if needed."
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

              {activeTab === "followup" && (
                <>
                  <span className="mono-sm text-[#BF7340] uppercase tracking-wider font-semibold mb-2">PREDICTIVE ACTION</span>
                  <h3 className="heading-lg text-[#18170F] mb-4">Nurture pipeline automatically, never forget a lead.</h3>
                  <p className="body-md text-[#5C5A52] mb-6">
                    Our smart sequence scheduler sends personalized WhatsApp nudges over Days 1, 3, and 7 to keep prospects warm, prompt site visits, and coordinate demo scheduling.
                  </p>
                  <ul className="space-y-3.5">
                    {[
                      "Custom scheduling prevents messages from feeling spammy.",
                      "Auto-stops sequences as soon as the customer schedules a call.",
                      "Integrates personalized customer detail fields dynamically.",
                      "Boosts manual re-engagement response rates by 3x."
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
              <div className="w-full max-w-[480px] rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-6 shadow-sm min-h-[320px] flex flex-col justify-center">
                
                {/* Visual 1: WhatsApp Automation Chat Interface */}
                {activeTab === "whatsapp" && (
                  <div className="space-y-4">
                    <span className="mono-sm text-[#8C8A82] block text-center uppercase tracking-widest font-semibold border-b border-[#E2DDD5] pb-2">Conversation Qualified</span>
                    <div className="flex flex-col gap-3 text-xs">
                      {/* Customer block */}
                      <div className="flex justify-start">
                        <div className="bg-[#EEEAE3] text-[#18170F] px-3.5 py-2.5 rounded-2xl rounded-bl-sm max-w-[85%] leading-relaxed">
                          "I want to book an appointment for Dr. Verma this Friday. Do you have slots in the evening?"
                        </div>
                      </div>
                      {/* AI Response block */}
                      <div className="flex justify-end">
                        <div className="bg-[#E8F0ED] border border-[#2A4A3E]/10 text-[#2A4A3E] px-3.5 py-2.5 rounded-2xl rounded-br-sm max-w-[85%] leading-relaxed">
                          <div className="flex items-center gap-1.5 font-bold mb-0.5 text-[10px] text-[#2D6A4F]">
                            <Sparkles size={10} />
                            Trinetra AI
                          </div>
                          "Yes! Dr. Verma has evening slots at 5:30 PM and 6:30 PM. Shall I confirm your spot?"
                        </div>
                      </div>
                      {/* Auto Qualified Badge tag */}
                      <div className="flex justify-center mt-2">
                        <span className="text-[10px] bg-[#F2E8DC] border border-[#BF7340]/25 text-[#BF7340] px-2.5 py-1 rounded-full font-semibold">
                          Intended Action: Appointment Booking Confirmed
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

                {/* Visual 3: Sequences Timeline Grid */}
                {activeTab === "followup" && (
                  <div className="space-y-4">
                    <span className="mono-sm text-[#8C8A82] block text-center uppercase tracking-widest font-semibold border-b border-[#E2DDD5] pb-2">Smart Sequence Map</span>
                    <div className="relative space-y-4 pt-2">
                      {/* Day 1 */}
                      <div className="flex items-center gap-4 text-left">
                        <span className="h-6 w-12 shrink-0 bg-[#E8F0ED] border border-[#2A4A3E]/20 text-[#2A4A3E] text-[10px] font-bold flex items-center justify-center rounded">Day 01</span>
                        <div className="flex-1 bg-[#F4F2ED] border border-[#E2DDD5] rounded p-2 text-[11px] text-[#5C5A52]">
                          <span className="font-semibold text-[#18170F] block mb-0.5">Automated Check-in</span>
                          "Hi {`{name}`}, just checking if you have questions..."
                        </div>
                      </div>
                      
                      {/* Day 3 */}
                      <div className="flex items-center gap-4 text-left">
                        <span className="h-6 w-12 shrink-0 bg-[#F2E8DC] border border-[#BF7340]/20 text-[#BF7340] text-[10px] font-bold flex items-center justify-center rounded">Day 03</span>
                        <div className="flex-1 bg-[#F4F2ED] border border-[#E2DDD5] rounded p-2 text-[11px] text-[#5C5A52]">
                          <span className="font-semibold text-[#18170F] block mb-0.5">Value Trigger</span>
                          "Here is a short video walkthrough of Rajasthan Apts..."
                        </div>
                      </div>

                      {/* Day 7 */}
                      <div className="flex items-center gap-4 text-left">
                        <span className="h-6 w-12 shrink-0 bg-[#EEEAE3] border border-[#8C8A82]/20 text-[#5C5A52] text-[10px] font-bold flex items-center justify-center rounded">Day 07</span>
                        <div className="flex-1 bg-[#F4F2ED] border border-[#E2DDD5] rounded p-2 text-[11px] text-[#5C5A52] opacity-80">
                          <span className="font-semibold text-[#18170F] block mb-0.5">Final Nudge</span>
                          "Closing the slot group for doctor visits..."
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
