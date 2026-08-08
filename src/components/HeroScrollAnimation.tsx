"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Globe, Sparkles, TrendingUp } from "lucide-react";
import Hero2DTrinetra from "./Hero2DTrinetra";

export default function HeroScrollAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth Scroll progress tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Smooth lightweight transforms
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-10, 0, 10]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 1], [0.92, 1.04, 0.95]);
  const card1Y = useTransform(scrollYProgress, [0, 1], [-20, 30]);
  const card2Y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const card3Y = useTransform(scrollYProgress, [0, 1], [-10, 20]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[480px] aspect-square flex items-center justify-center pointer-events-auto select-none py-6"
    >
      {/* 1. Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(194,109,92,0.18)_0%,transparent_70%)] blur-3xl rounded-full pointer-events-none" />

      {/* 2. Central Interactive 2D Vector Eye */}
      <motion.div style={{ scale }} className="relative z-10 w-full flex items-center justify-center">
        <Hero2DTrinetra />
      </motion.div>

      {/* 3. Floating Scroll-Driven Kinetic Metric Badges */}
      
      {/* Card 1: Web Dev (Top Left) */}
      <motion.div
        style={{ y: card1Y, rotateX, rotateY }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-4 -left-4 z-20 hidden sm:flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-white/10 bg-[#141212]/90 backdrop-blur-xl shadow-2xl shadow-black/50"
      >
        <div className="h-8 w-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
          <Globe size={15} />
        </div>
        <div className="text-left">
          <div className="text-[10px] font-mono font-bold text-ink-1 uppercase tracking-wider">Custom Web Dev</div>
          <div className="text-[9px] font-mono text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            High Converting · 100% Safe
          </div>
        </div>
      </motion.div>

      {/* Card 2: CRM & AI Automation (Top Right) */}
      <motion.div
        style={{ y: card2Y, rotateX, rotateY }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute top-12 -right-4 z-20 hidden sm:flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-[#c26d5c]/30 bg-[#1a1413]/90 backdrop-blur-xl shadow-2xl shadow-black/50"
      >
        <div className="h-8 w-8 rounded-xl bg-[#c26d5c]/15 border border-[#c26d5c]/30 flex items-center justify-center text-accent shrink-0">
          <Sparkles size={15} />
        </div>
        <div className="text-left">
          <div className="text-[10px] font-mono font-bold text-ink-1 uppercase tracking-wider">AI CRM Pipeline</div>
          <div className="text-[9px] font-mono text-accent font-semibold mt-0.5">
            Instant Auto Qualified
          </div>
        </div>
      </motion.div>

      {/* Card 3: Revenue & Growth Metrics (Bottom Center) */}
      <motion.div
        style={{ y: card3Y, rotateX, rotateY }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-4 py-3 rounded-2xl border border-white/10 bg-[#111010]/95 backdrop-blur-xl shadow-2xl shadow-black/60 min-w-[280px]"
      >
        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <TrendingUp size={16} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-ink-1 uppercase tracking-wider">Business Scale</span>
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+100% Growth</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/10">
            <div className="bg-gradient-to-r from-accent to-emerald-400 h-full w-[85%] rounded-full animate-pulse" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
