import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STAGES = [
  { label: "New Leads", value: 47, color: "from-cyan-400 to-cyan-300", pct: 95 },
  { label: "AI Qualified", value: 29, color: "from-blue-400 to-cyan-400", pct: 62 },
  { label: "Demo Scheduled", value: 14, color: "from-indigo-400 to-blue-400", pct: 30 },
  { label: "Won", value: 7, color: "from-emerald-400 to-cyan-400", pct: 15 },
];

const MESSAGES = [
  { from: "lead", text: "Hi, I need automation for leads from Instagram and website forms." },
  { from: "ai", text: "Great! I've analyzed your requirements. AI qualifier is live — sending the best plan and a demo slot now." },
  { from: "lead", text: "Perfect. Please share pricing and next steps." },
  { from: "ai", text: "Done! I've sent the Growth plan details. Your demo is scheduled for tomorrow at 11am." },
];

const NOTIFICATIONS = [
  { id: 1, title: "New lead qualified", detail: "Priya M. — Score 94 · Instagram Ad", time: "just now" },
  { id: 2, title: "WhatsApp delivered", detail: "Demo invite sent to Rahul K.", time: "2m ago" },
  { id: 3, title: "Pipeline updated", detail: "3 leads moved to Qualified", time: "5m ago" },
];

function LiveSparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const w = 120, h = 36;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28 overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke="rgba(34,211,238,0.8)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill="url(#sparkFill)"
        stroke="none"
      />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typing, setTyping] = useState(false);
  const [activeNotif, setActiveNotif] = useState(0);
  const [pipelineVisible, setPipelineVisible] = useState(false);

  // Animate messages in sequence
  useEffect(() => {
    if (visibleMessages >= MESSAGES.length) return;
    const delay = visibleMessages === 0 ? 1200 : MESSAGES[visibleMessages - 1].from === "lead" ? 900 : 1800;
    const timer1 = setTimeout(() => {
      if (MESSAGES[visibleMessages]?.from === "ai") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setVisibleMessages((v) => v + 1);
        }, 1400);
      } else {
        setVisibleMessages((v) => v + 1);
      }
    }, delay);
    return () => clearTimeout(timer1);
  }, [visibleMessages]);

  // Cycle notifications
  useEffect(() => {
    const interval = setInterval(() => setActiveNotif((n) => (n + 1) % NOTIFICATIONS.length), 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="dashboard" className="relative overflow-hidden py-28">
      {/* Ambient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(34,211,238,0.05),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="section-line mb-16" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center"
        >
          <p className="mb-3 text-xs tracking-[0.25em] text-cyan-400/80">LIVE PREVIEW</p>
          <h2 className="mx-auto max-w-3xl text-3xl font-medium tracking-tight text-white md:text-5xl">
            CRM Command Center
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
            A unified surface combining WhatsApp conversations, AI scoring, pipeline tracking, and automation control.
          </p>
        </motion.div>

        {/* ── Dashboard shell ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0, transition: { duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] } }}
          onViewportEnter={() => setPipelineVisible(true)}
          viewport={{ once: true, amount: 0.2 }}
          className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b1624] to-[#070d18] shadow-[0_0_80px_rgba(34,211,238,0.06)]"
        >
          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
              </div>
              <span className="text-xs text-slate-400">Trinetra CRM Workspace</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                23 automations running
              </span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[240px_1fr_300px]">
            {/* ── Sidebar ──────────────────────────── */}
            <div className="border-b border-r border-white/8 p-4 lg:border-b-0">
              <p className="mb-3 text-[10px] tracking-[0.2em] text-slate-500">PIPELINE</p>
              <div className="space-y-2">
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-300">{stage.label}</span>
                      <span className="font-semibold text-white">{stage.value}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={pipelineVisible ? { scaleX: 1 } : {}}
                        transition={{ duration: 1, delay: i * 0.15 + 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "left" }}
                        className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                        data-pct={stage.pct}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Score */}
              <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/8 p-3">
                <p className="text-[10px] tracking-[0.15em] text-cyan-400/70 mb-2">AI QUALIFICATION</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-semibold text-white">91</p>
                  <p className="mb-0.5 text-xs text-cyan-300">/ 100</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">Intent: High · Budget: ✓</p>
              </div>

              {/* Live notification */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] tracking-[0.15em] text-slate-500">LIVE ACTIVITY</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeNotif}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-xl border border-white/10 bg-white/4 p-3 text-xs"
                  >
                    <p className="font-medium text-white">{NOTIFICATIONS[activeNotif].title}</p>
                    <p className="mt-0.5 text-slate-400">{NOTIFICATIONS[activeNotif].detail}</p>
                    <p className="mt-1.5 text-slate-600">{NOTIFICATIONS[activeNotif].time}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── Chat panel ───────────────────────── */}
            <div className="flex flex-col border-b border-white/8 lg:border-b-0">
              <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/20">
                  <svg viewBox="0 0 24 24" fill="#25D366" className="h-4 w-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Priya Mehta</p>
                  <p className="text-[10px] text-slate-500">WhatsApp · AI Agent active</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-2.5 py-1 text-[10px] text-cyan-300">
                  <span className="relative flex h-1 w-1">
                    <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-1 w-1 rounded-full bg-cyan-400" />
                  </span>
                  AI Active
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
                <AnimatePresence>
                  {MESSAGES.slice(0, visibleMessages).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex ${msg.from === "ai" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                          msg.from === "ai"
                            ? "rounded-br-sm bg-cyan-500/20 text-cyan-50"
                            : "rounded-bl-sm bg-white/10 text-slate-100"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {typing && (
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-br-sm bg-cyan-500/20">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right analytics panel ─────────────── */}
            <div className="border-l border-white/8 p-4">
              <p className="mb-4 text-[10px] tracking-[0.2em] text-slate-500">ANALYTICS</p>

              {/* Sparklines */}
              <div className="space-y-4">
                {[
                  { label: "Leads Today", value: "47", delta: "+18%", data: [12, 18, 15, 22, 28, 31, 47] },
                  { label: "Conversion Rate", value: "38%", delta: "+4%", data: [28, 30, 33, 35, 34, 37, 38] },
                  { label: "Avg Response", value: "22s", delta: "-68%", data: [65, 52, 44, 38, 30, 25, 22] },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <div>
                      <p className="text-[10px] text-slate-500">{metric.label}</p>
                      <p className="mt-0.5 text-lg font-semibold text-white">{metric.value}</p>
                      <p className="text-[10px] text-emerald-400">{metric.delta}</p>
                    </div>
                    <LiveSparkline values={metric.data} />
                  </div>
                ))}
              </div>

              {/* Automation tasks */}
              <p className="mb-2 mt-5 text-[10px] tracking-[0.2em] text-slate-500">ACTIVE AUTOMATIONS</p>
              <div className="space-y-1.5">
                {[
                  "Lead capture → Instagram",
                  "AI score → Route → CRM",
                  "WhatsApp followup D1",
                  "Nurture seq. Day 3",
                ].map((task) => (
                  <div key={task} className="flex items-center gap-2 rounded-lg border border-white/8 px-2.5 py-1.5 text-[11px] text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    {task}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
