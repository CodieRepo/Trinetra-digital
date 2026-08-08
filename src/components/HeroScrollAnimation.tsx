"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Globe, Sparkles, TrendingUp, Utensils, Zap, Database } from "lucide-react";
import Hero2DTrinetra from "./Hero2DTrinetra";

export default function HeroScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeModule, setActiveModule] = useState<"all" | "crm" | "pos" | "web">("all");

  // Smooth Scroll progress tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // 3D Parallax Perspective Transforms
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [12, 0, -12]);
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-8, 0, 8]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1.05, 0.96]);
  const card1Y = useTransform(scrollYProgress, [0, 1], [-25, 35]);
  const card2Y = useTransform(scrollYProgress, [0, 1], [35, -35]);
  const card3Y = useTransform(scrollYProgress, [0, 1], [-15, 25]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[500px] aspect-square flex flex-col items-center justify-center pointer-events-auto select-none py-4"
    >
      {/* Ambient Cyber Gold Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(194,109,92,0.22)_0%,transparent_70%)] blur-3xl rounded-full pointer-events-none" />

      {/* Mode Selector Pill Navigation */}
      <div className="absolute -top-3 z-30 flex items-center gap-1 bg-[#141212]/90 border border-white/10 p-1 rounded-full backdrop-blur-xl shadow-xl">
        {[
          { id: "all", label: "All Systems", icon: <Zap size={11} /> },
          { id: "crm", label: "AI CRM", icon: <Database size={11} /> },
          { id: "pos", label: "Restaurant OS", icon: <Utensils size={11} /> },
          { id: "web", label: "Web Growth", icon: <Globe size={11} /> },
        ].map((mod) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => setActiveModule(mod.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
              activeModule === mod.id
                ? "bg-accent text-stone-950 shadow-md shadow-accent/20"
                : "text-ink-3 hover:text-ink-1 hover:bg-white/5"
            }`}
          >
            {mod.icon}
            {mod.label}
          </button>
        ))}
      </div>

      {/* Central Interactive 2D Vector Eye */}
      <motion.div style={{ scale }} className="relative z-10 w-full flex items-center justify-center mt-4">
        <Hero2DTrinetra />
      </motion.div>

      {/* Kinetic Floating Interactive System Badges */}
      <AnimatePresence mode="wait">
        
        {/* Module 1: Web Growth (Top Left) */}
        {(activeModule === "all" || activeModule === "web") && (
          <motion.div
            key="web-card"
            style={{ y: card1Y, rotateX, rotateY }}
            initial={{ opacity: 0, scale: 0.8, x: -30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-8 -left-4 z-20 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-[#141212]/95 backdrop-blur-2xl shadow-2xl shadow-black/80"
          >
            <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Globe size={16} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-mono font-bold text-ink-1 uppercase tracking-wider">Custom Web Architecture</div>
              <div className="text-[9px] font-mono text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Next.js 15 · 100/100 Speed Score
              </div>
            </div>
          </motion.div>
        )}

        {/* Module 2: AI CRM (Top Right) */}
        {(activeModule === "all" || activeModule === "crm") && (
          <motion.div
            key="crm-card"
            style={{ y: card2Y, rotateX, rotateY }}
            initial={{ opacity: 0, scale: 0.8, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-16 -right-4 z-20 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#c26d5c]/35 bg-[#1c1413]/95 backdrop-blur-2xl shadow-2xl shadow-black/80"
          >
            <div className="h-9 w-9 rounded-xl bg-[#c26d5c]/15 border border-[#c26d5c]/30 flex items-center justify-center text-accent shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-mono font-bold text-ink-1 uppercase tracking-wider">AI Qualified Pipeline</div>
              <div className="text-[9px] font-mono text-accent font-semibold flex items-center gap-1 mt-0.5">
                WhatsApp Bot · 48 Leads Synced
              </div>
            </div>
          </motion.div>
        )}

        {/* Module 3: Restaurant OS (Center Overlay for POS mode) */}
        {(activeModule === "pos") && (
          <motion.div
            key="pos-card"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-20 z-20 flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-teal-500/30 bg-[#0f1917]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 min-w-[280px]"
          >
            <div className="h-10 w-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Utensils size={18} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">Restaurant OS</span>
                <span className="text-[9px] font-mono font-bold text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">LIVE POS</span>
              </div>
              <p className="text-[10px] font-mono text-slate-300 mt-1">Table #04 · Session Settled via UPI ₹1,850</p>
            </div>
          </motion.div>
        )}

        {/* Module 4: Bottom Growth Bar (Bottom Center) */}
        {(activeModule === "all" || activeModule === "web" || activeModule === "crm") && (
          <motion.div
            key="bottom-card"
            style={{ y: card3Y, rotateX, rotateY }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-4 py-3 rounded-2xl border border-white/10 bg-[#111010]/95 backdrop-blur-2xl shadow-2xl shadow-black/80 min-w-[290px]"
          >
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp size={16} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-ink-1 uppercase tracking-wider">Revenue Growth Engine</span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">+100% Scaled</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/10">
                <div className="bg-gradient-to-r from-accent via-emerald-400 to-teal-400 h-full w-[88%] rounded-full animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
