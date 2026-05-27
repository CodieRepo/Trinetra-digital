import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Send, Check } from "lucide-react";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi! I'd like a free consultation on automating my business lead flow.")}`;

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <section className="relative overflow-hidden bg-[#131210] pt-24 pb-12 z-10 text-left border-t border-[#FAF5EF]/10">
      
      {/* ── Section 9: Final CTA ──────────────────────── */}
      <div className="main-container max-w-[680px] mx-auto text-center pb-24 border-b border-[#FAF5EF]/10">
        
        {/* Eyebrow */}
        <span className="text-[11px] font-semibold tracking-[0.25em] text-[#BF7340] uppercase font-interface mb-4 block">
          Get Automated Today
        </span>

        {/* Headline */}
        <h2 className="font-display text-[44px] sm:text-[56px] leading-[1.1] text-[#F9F8F5] tracking-tight mb-6">
          Stop losing leads. <br />
          <span className="italic text-[#BF7340]">Automate</span> your business.
        </h2>

        {/* Subtext */}
        <p className="text-sm sm:text-base leading-relaxed text-[#F9F8F5]/70 max-w-[500px] mx-auto mb-10">
          Build operational infrastructure that qualifies leads in 3 minutes, updates CRM records autonomously, and ensures no opportunity is forgotten.
        </p>

        {/* Action Form */}
        <div className="max-w-[480px] mx-auto">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-12 bg-[#1E1C18] border border-[#FAF5EF]/10 rounded-lg px-4 text-sm text-[#F9F8F5] placeholder-[#8C8A82] focus:outline-none focus:border-[#BF7340] focus:ring-1 focus:ring-[#BF7340] transition-all"
              />
              <button
                type="submit"
                className="btn-primary-forest h-12 bg-[#2A4A3E] text-[#F9F8F5] hover:bg-[#1E3630] text-xs uppercase font-bold tracking-wider rounded-lg px-6 flex items-center justify-center gap-2 border-none cursor-pointer shrink-0"
              >
                Schedule Demo <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 rounded-lg border border-[#2D6A4F]/30 bg-[#2D6A4F]/10 p-4 text-[#E8F5EE] text-sm font-semibold"
            >
              <Check size={16} /> Thank you! Our Solution Architect will check in within 12 hours.
            </motion.div>
          )}
          
          <div className="mt-6">
            <span className="text-[10px] text-[#FAF5EF]/40 font-semibold tracking-wider uppercase block">OR</span>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#BF7340] hover:text-[#A6612E] mt-3 hover:underline"
            >
              Start direct WhatsApp conversation →
            </a>
          </div>
        </div>

      </div>

      {/* ── Section 10: Premium Restraint Footer ─────── */}
      <div className="main-container pt-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b border-[#FAF5EF]/10 pb-10">
          
          {/* Logo Lockup - Compact monochrome light */}
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="h-7 w-7 text-[#F9F8F5]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="16,3 3,27 29,27"
                stroke="#F9F8F5"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="11" r="2.5" fill="#BF7340" />
              <circle cx="11.5" cy="20.5" r="2" fill="#F9F8F5" />
              <circle cx="20.5" cy="20.5" r="2" fill="#F9F8F5" />
              <line x1="16" y1="11" x2="11.5" y2="20.5" stroke="#F9F8F5" strokeWidth="1" strokeDasharray="1 1" />
              <line x1="16" y1="11" x2="20.5" y2="20.5" stroke="#F9F8F5" strokeWidth="1" strokeDasharray="1 1" />
              <line x1="11.5" y1="20.5" x2="20.5" y2="20.5" stroke="#F9F8F5" strokeWidth="1" strokeDasharray="1 1" />
            </svg>
            
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-[0.2em] text-[#F9F8F5] font-interface">
                TRINETRA
              </span>
              <span className="text-[8px] tracking-[0.15em] text-[#FAF5EF]/60 mt-0.5 uppercase font-interface font-medium">
                Operational Intelligence
              </span>
            </div>
          </div>

          {/* Links grid */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs">
            <a href="#system" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Solutions</a>
            <a href="#process" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">How It Works</a>
            <a href="#industries" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Industries</a>
            <a href="#pricing" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Pricing</a>
            <a href="#testimonials" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Results</a>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 text-[11px] text-[#FAF5EF]/40 font-medium">
          <span>© 2026 Trinetra Digital Solution. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="mailto:hello@trinetradigital.in" className="hover:text-[#F9F8F5]">hello@trinetradigital.in</a>
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#F9F8F5]">WhatsApp Support</a>
          </div>
        </div>

      </div>

    </section>
  );
}
