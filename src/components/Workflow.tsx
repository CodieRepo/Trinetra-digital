import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const NODES = [
  {
    id: "sources",
    label: "Lead Sources",
    sublabel: "Instagram · Facebook · Web",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
      </svg>
    ),
    col: 0,
  },
  {
    id: "qualify",
    label: "AI Qualification",
    sublabel: "Score · Segment · Enrich",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
      </svg>
    ),
    col: 1,
  },
  {
    id: "crm",
    label: "CRM Dashboard",
    sublabel: "Pipeline · Tasks · Notes",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
    ),
    col: 2,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Automation",
    sublabel: "Flows · Sequences · Alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    col: 3,
  },
  {
    id: "handoff",
    label: "Human Handoff",
    sublabel: "Sales Rep · Context · Notes",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
    col: 4,
  },
  {
    id: "analytics",
    label: "Analytics",
    sublabel: "Conversion · Revenue · ROI",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
    col: 5,
  },
];

// Mobile step list item
function MobileStep({ node, index }: { node: typeof NODES[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-4"
    >
      <div className="relative flex flex-col items-center">
        <div className="pulse-node relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
          {node.icon}
        </div>
        {index < NODES.length - 1 && (
          <div className="mt-2 h-12 w-px bg-gradient-to-b from-cyan-400/40 to-transparent" />
        )}
      </div>
      <div className="pb-6 pt-1">
        <p className="text-sm font-semibold text-white">{node.label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{node.sublabel}</p>
      </div>
    </motion.div>
  );
}

// Animated data packet on SVG path
function DataPacket({ delay, duration }: { delay: number; duration: number }) {
  return (
    <motion.circle
      r="4"
      fill="rgba(34,211,238,0.9)"
      filter="url(#packetGlow)"
      initial={{ offsetDistance: "0%" }}
      animate={{ offsetDistance: "100%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{ offsetPath: "path('M 80 120 C 140 120, 160 80, 220 80 C 280 80, 300 120, 360 120 C 420 120, 440 80, 500 80 C 560 80, 580 120, 640 120 C 700 120, 720 80, 780 80 C 840 80, 860 120, 920 120')" } as React.CSSProperties}
    />
  );
}

export default function Workflow() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // Auto-cycle active node
  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const interval = setInterval(() => {
      setActiveNode(NODES[i % NODES.length].id);
      i++;
    }, 1400);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section id="workflow" className="relative overflow-hidden border-y border-white/8 bg-[#040810] py-28">
      {/* Background ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_50%,rgba(34,211,238,0.06),transparent)]" />

      <div ref={ref} className="relative mx-auto max-w-7xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center"
        >
          <p className="mb-3 text-xs tracking-[0.25em] text-cyan-400/80">SYSTEM ARCHITECTURE</p>
          <h2 className="mx-auto max-w-3xl text-3xl font-medium tracking-tight text-white md:text-5xl">
            Intelligent Workflow Architecture
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
            Watch how your leads flow from source to signed — entirely automated, intelligently managed.
          </p>
        </motion.div>

        {/* ── Desktop visualization ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 hidden overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0a1525]/90 to-[#060b15]/95 p-8 md:block"
        >
          {/* SVG Connection paths */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="packetGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(34,211,238,0.1)" />
                <stop offset="50%" stopColor="rgba(34,211,238,0.55)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0.1)" />
              </linearGradient>
            </defs>
            {/* Base connector line */}
            <path
              d="M 80 120 C 140 120, 160 80, 220 80 C 280 80, 300 120, 360 120 C 420 120, 440 80, 500 80 C 560 80, 580 120, 640 120 C 700 120, 720 80, 780 80 C 840 80, 860 120, 920 120"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2"
            />
            {/* Animated dashed overlay */}
            <path
              className="flow-line"
              d="M 80 120 C 140 120, 160 80, 220 80 C 280 80, 300 120, 360 120 C 420 120, 440 80, 500 80 C 560 80, 580 120, 640 120 C 700 120, 720 80, 780 80 C 840 80, 860 120, 920 120"
            />
            {/* Data packets */}
            {[0, 1.6, 3.2, 4.8, 6.4, 8].map((delay, i) => (
              <DataPacket key={i} delay={delay} duration={9.6} />
            ))}
          </svg>

          {/* Nodes */}
          <div className="relative grid grid-cols-6 gap-4" style={{ minHeight: 220 }}>
            {NODES.map((node, i) => {
              const isActive = activeNode === node.id;
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.1 + 0.3 }}
                  className={`flex flex-col items-center text-center ${i % 2 === 0 ? "justify-end pb-4" : "justify-start pt-4"}`}
                  style={{ minHeight: 200 }}
                >
                  <motion.div
                    animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 ${
                      isActive
                        ? "border-cyan-400/60 bg-cyan-400/20 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.4)]"
                        : "border-white/15 bg-white/5 text-slate-400"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-ping" />
                    )}
                    {node.icon}
                  </motion.div>
                  <p className={`text-xs font-semibold transition-colors duration-300 ${isActive ? "text-white" : "text-slate-300"}`}>
                    {node.label}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">{node.sublabel}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Status bar */}
          <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              System active · All nodes operational
            </div>
            <div className="flex gap-6">
              <span>Avg. qualification: <span className="text-cyan-300">22s</span></span>
              <span>Conversion rate: <span className="text-cyan-300">38%</span></span>
              <span>Leads today: <span className="text-cyan-300">47</span></span>
            </div>
          </div>
        </motion.div>

        {/* ── Mobile step list ─────────────────────── */}
        <div className="mt-12 space-y-0 md:hidden">
          {NODES.map((node, i) => (
            <MobileStep key={node.id} node={node} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
