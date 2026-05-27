import { motion } from "framer-motion";
import { Phone, MessageCircle, ArrowRight } from "lucide-react";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's AI automation services.")}`;

export default function FinalCTA() {
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

        {/* CTA Actions — Direct Contact (no login/credential form) */}
        <div className="max-w-[480px] mx-auto" role="group" aria-label="Contact Trinetra Digital Solution">
          
          {/* Primary: WhatsApp */}
          <motion.a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="final-cta-whatsapp"
            aria-label="Chat with Trinetra Digital Solution on WhatsApp"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-3 h-14 rounded-xl bg-[#2A4A3E] text-[#F9F8F5] font-bold text-sm tracking-wide border border-[#2A4A3E] hover:bg-[#1E3630] transition-colors mb-3"
          >
            <MessageCircle size={18} className="fill-[#F9F8F5]/10" />
            WhatsApp Us for a Free Demo
            <ArrowRight size={15} />
          </motion.a>

          {/* Secondary: Call */}
          <motion.a
            href={PHONE_TEL}
            id="final-cta-call"
            aria-label="Call Trinetra Digital Solution"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-3 h-12 rounded-xl border border-[#FAF5EF]/15 text-[#FAF5EF]/70 font-semibold text-sm tracking-wide hover:border-[#BF7340]/40 hover:text-[#BF7340] transition-all mb-6"
          >
            <Phone size={16} />
            {PHONE_NUMBER} — Call Now
          </motion.a>

          {/* Trust note */}
          <p className="text-[11px] text-[#FAF5EF]/30 font-medium tracking-wide">
            No sign-up required · We respond within 30 minutes
          </p>
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
          <div className="flex flex-wrap gap-4 items-center">
            <a href={`mailto:${EMAIL}`} className="hover:text-[#F9F8F5] transition-colors">{EMAIL}</a>
            <a href={PHONE_TEL} className="hover:text-[#F9F8F5] transition-colors">{PHONE_NUMBER}</a>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#F9F8F5] transition-colors">WhatsApp Support</a>
          </div>
        </div>

      </div>

    </section>
  );
}
