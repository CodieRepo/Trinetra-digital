import { useRef } from "react";
import { AlertCircle, CheckCircle, Smartphone, Kanban, Clock, ChevronsLeftRight } from "lucide-react";
import { gsap, useGSAP } from "../lib/gsap";

export default function TheProblem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Timeline for the before/after sliding wipe
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=150%", // Pins for 1.5x viewport height
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    });

    // Animate the clip-path of the overlay solution layer (wipes left to right)
    tl.to(wipeRef.current, {
      clipPath: "inset(0 0% 0 0)",
      ease: "none",
    });

    // Move the glowing visual handle in sync with the wipe
    tl.to(handleRef.current, {
      left: "100%",
      ease: "none",
    }, 0); // Start at the same time

  }, { scope: containerRef });

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-[#090808] border-b border-border select-none"
    >
      {/* ── BACKGROUND MESH UNDERLAY ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(var(--color-accent) 1px, transparent 1px)`,
        backgroundSize: "32px 32px"
      }} />

      {/* ── LAYERS: BEFORE & AFTER ── */}
      <div className="relative w-full h-full">
        
        {/* Layer A (Before - Manual Ops / Chaos) */}
        <div className="absolute inset-0 w-full h-full bg-[#0a0909] flex items-center">
          <div className="max-w-[1280px] mx-auto w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content (Chaos Text) */}
            <div className="lg:col-span-6 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/20 border border-red-900/30 rounded-full text-red-400 font-mono text-[10px] uppercase tracking-wider">
                <AlertCircle size={10} /> The Friction of Manual Ops
              </div>
              <h2 className="font-editorial text-[clamp(34px,5vw,60px)] italic text-red-200/90 font-light leading-none">
                Operating in the dark.
              </h2>
              <p className="body-md text-ink-3 max-w-lg">
                Leads fall through the cracks, response times drag by hours, and pipelines run entirely on guesswork. A fragmented system is silently bottlenecking your business growth.
              </p>
              
              {/* Friction metrics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <span className="font-mono text-xs text-red-400/80 uppercase tracking-wide">Avg Response Time</span>
                  <p className="font-display text-xl font-light text-ink-2 mt-1">4.5 Hours</p>
                </div>
                <div>
                  <span className="font-mono text-xs text-red-400/80 uppercase tracking-wide">Lead Leakage</span>
                  <p className="font-display text-xl font-light text-ink-2 mt-1">Up to 35%</p>
                </div>
              </div>
            </div>

            {/* Right Content (Chaos Mock Interface) */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[420px] bg-red-950/5 border border-red-950/20 rounded-2xl p-5 space-y-4 opacity-75 grayscale-[20%]">
                <div className="flex justify-between items-center pb-3 border-b border-red-950/30">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-mono text-[10px] text-red-400 uppercase tracking-wider">Chaotic Inbox</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400/60">32 MISSED LEADS</span>
                </div>
                
                {/* Simulated chaotic lead nodes */}
                <div className="space-y-3">
                  {[
                    { name: "Rahul Kumar (Delhi)", status: "Lead Cold", time: "4 hours ago", msg: "Hi, I need quotation for website development..." },
                    { name: "Sunil Verma (Mumbai)", status: "Forgotten", time: "1 day ago", msg: "Is there any starter plan available?" },
                    { name: "Ananya Sharma (Gorakhpur)", status: "No Callback", time: "2 days ago", msg: "I booked a consultation but no one called." }
                  ].map((lead, idx) => (
                    <div key={idx} className="bg-red-950/10 border border-red-950/30 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-red-200">{lead.name}</span>
                        <span className="text-[9px] font-mono text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/30">{lead.status}</span>
                      </div>
                      <p className="text-[11px] text-red-300/60 truncate italic">"{lead.msg}"</p>
                      <div className="text-[9px] font-mono text-red-400/40 flex items-center gap-1">
                        <Clock size={10} /> {lead.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Layer B (After - Trinetra OS / Automated Order) */}
        {/* Wiped container overlaid on top, starts clip-path inset fully on the right side */}
        <div
          ref={wipeRef}
          className="absolute inset-0 w-full h-full bg-[#070606] flex items-center z-10"
          style={{ clipPath: "inset(0 100% 0 0)" }}
        >
          <div className="max-w-[1280px] mx-auto w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content (Solution Text) */}
            <div className="lg:col-span-6 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/20 border border-emerald-900/30 rounded-full text-emerald-400 font-mono text-[10px] uppercase tracking-wider">
                <CheckCircle size={10} /> The Efficiency of Trinetra OS
              </div>
              <h2 className="font-editorial text-[clamp(34px,5vw,60px)] italic text-accent font-light leading-none">
                Pioneering total control.
              </h2>
              <p className="body-md text-ink-3 max-w-lg">
                Convert traffic to qualified leads automatically. Run instant auto-replies on WhatsApp, sync queries directly to a smart pipeline, and schedule appointments on autopilot.
              </p>
              
              {/* Performance metrics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <span className="font-mono text-xs text-accent uppercase tracking-wide">Avg Response Time</span>
                  <p className="font-display text-xl font-light text-ink-1 mt-1 text-accent">2 Seconds</p>
                </div>
                <div>
                  <span className="font-mono text-xs text-accent uppercase tracking-wide">Pipeline Conversions</span>
                  <p className="font-display text-xl font-light text-ink-1 mt-1 text-accent">Up to 98%</p>
                </div>
              </div>
            </div>

            {/* Right Content (Automated Mock Interface) */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[420px] bg-[#111010] border border-border rounded-2xl p-5 space-y-4 shadow-[0_0_40px_rgba(194,109,92,0.06)]">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                    <span className="font-mono text-[10px] text-accent uppercase tracking-wider">Trinetra Automations</span>
                  </div>
                  <span className="text-[10px] font-mono text-accent/60">ACTIVE WORKFLOWS</span>
                </div>
                
                {/* Simulated clean, automated nodes */}
                <div className="space-y-3">
                  {[
                    { name: "Rahul Kumar (Delhi)", status: "Auto-Replied", time: "Just now", badge: "bg-accent/15 text-accent border-accent/20", icon: <Smartphone size={11} /> },
                    { name: "Sunil Verma (Mumbai)", status: "AI Nurture", time: "10m ago", badge: "bg-purple-950/20 text-purple-400 border-purple-900/30", icon: <Clock size={11} /> },
                    { name: "Ananya Sharma (Gorakhpur)", status: "Meeting Booked", time: "1h ago", badge: "bg-emerald-950/20 text-emerald-400 border-emerald-900/30", icon: <Kanban size={11} /> }
                  ].map((lead, idx) => (
                    <div key={idx} className="bg-[#181717] border border-border rounded-xl p-3.5 space-y-2 hover:border-accent/30 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-ink-1">{lead.name}</span>
                        <span className={`text-[9px] font-mono flex items-center gap-1 px-2 py-0.5 rounded border ${lead.badge}`}>
                          {lead.icon} {lead.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-2 truncate leading-relaxed">Synced dynamically to Central CRM Dashboard.</p>
                      <div className="text-[9px] font-mono text-ink-3 flex items-center gap-1">
                        <Clock size={10} /> {lead.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── SLIDER DIVIDING HANDLE ── */}
        <div
          ref={handleRef}
          className="absolute top-0 bottom-0 w-px bg-accent/30 z-20 pointer-events-none flex items-center justify-center"
          style={{ left: "0%" }}
        >
          {/* Glowing cursor center notch */}
          <div className="h-10 w-10 rounded-full bg-[#111010] border border-accent/30 shadow-[0_0_20px_rgba(194,109,92,0.25)] flex items-center justify-center text-accent">
            <ChevronsLeftRight size={14} className="animate-pulse" />
          </div>
        </div>

      </div>
    </section>
  );
}
