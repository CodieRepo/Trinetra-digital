import { motion } from "framer-motion";
import { Phone, MessageCircle, ArrowRight, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's AI automation services.")}`;

// ── Shared Footer (used on all pages via PageLayout) ──────────────────────
export function FinalCTAFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#131210] z-10 border-t border-[#FAF5EF]/10">
      {/* CTA Block */}
      <div className="main-container max-w-[680px] mx-auto text-center pt-14 md:pt-24 pb-16 md:pb-24 border-b border-[#FAF5EF]/10">
        <span className="text-[11px] font-semibold tracking-[0.25em] text-[#BF7340] uppercase font-interface mb-4 block">
          Get Automated Today
        </span>
        <h2 className="font-display text-[36px] sm:text-[44px] md:text-[56px] leading-[1.1] text-[#F9F8F5] tracking-tight mb-5 md:mb-6">
          Stop losing leads. <br />
          <span className="italic text-[#BF7340]">Automate</span> your business.
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-[#F9F8F5]/70 max-w-[500px] mx-auto mb-10">
          Build operational infrastructure that qualifies leads in 3 minutes, updates CRM records autonomously, and ensures no opportunity is forgotten.
        </p>

        <div className="max-w-[480px] mx-auto" role="group" aria-label="Contact Trinetra Digital Solution">
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

          <p className="text-[11px] text-[#FAF5EF]/30 font-medium tracking-wide">
            No sign-up required · We respond within 30 minutes
          </p>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="main-container pt-10 md:pt-12 pb-mobile-safe md:pb-8">

        {/* ── Compact GBP Location Strip ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#1E1C18] border border-[#FAF5EF]/8 rounded-xl px-5 py-4 mb-8">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#BF7340]/15 text-[#BF7340]">
              <MapPin size={15} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#FAF5EF]/40 mb-0.5">Our Office</p>
              <p className="text-xs font-semibold text-[#F9F8F5]">
                Gorakhpur, Uttar Pradesh, India — 273001
              </p>
              <p className="text-[10.5px] text-[#FAF5EF]/50 mt-0.5">Mon–Sat · 9:00 AM – 7:00 PM IST</p>
            </div>
          </div>
          <a
            href="https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Trinetra Digital Solution on Google Maps"
            className="flex items-center justify-center gap-2 h-9 rounded-lg border border-[#FAF5EF]/15 bg-[#FAF5EF]/5 px-4 text-[10.5px] font-bold text-[#FAF5EF]/80 hover:bg-[#FAF5EF]/10 hover:text-[#F9F8F5] transition-all whitespace-nowrap shrink-0"
          >
            <ExternalLink size={12} /> View on Google Maps
          </a>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 border-b border-[#FAF5EF]/10 pb-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
              <polygon points="16,3 3,27 29,27" stroke="#F9F8F5" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="16" cy="11" r="2.5" fill="#BF7340" />
              <circle cx="11.5" cy="20.5" r="2" fill="#F9F8F5" />
              <circle cx="20.5" cy="20.5" r="2" fill="#F9F8F5" />
              <line x1="16" y1="11" x2="11.5" y2="20.5" stroke="#F9F8F5" strokeWidth="1" strokeDasharray="1 1" />
              <line x1="16" y1="11" x2="20.5" y2="20.5" stroke="#F9F8F5" strokeWidth="1" strokeDasharray="1 1" />
              <line x1="11.5" y1="20.5" x2="20.5" y2="20.5" stroke="#F9F8F5" strokeWidth="1" strokeDasharray="1 1" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-[0.2em] text-[#F9F8F5] font-interface">TRINETRA</span>
              <span className="text-[8px] tracking-[0.15em] text-[#FAF5EF]/60 mt-0.5 uppercase font-interface font-medium">Digital Solution</span>
            </div>
          </div>

          {/* Footer Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-6 text-xs">
            <div>
              <p className="text-[#FAF5EF]/30 font-semibold uppercase tracking-widest text-[10px] mb-3">Services</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/services/whatsapp-automation" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">WhatsApp Automation</Link>
                <Link to="/services/ai-crm" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">AI CRM</Link>
                <Link to="/services/smart-followup" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Smart Follow-Up</Link>
                <Link to="/services/website-development" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Website Development</Link>
                <Link to="/services/digital-marketing" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Digital Marketing</Link>
                <Link to="/services/ai-chatbots" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">AI Chatbots</Link>
              </div>
            </div>
            <div>
              <p className="text-[#FAF5EF]/30 font-semibold uppercase tracking-widest text-[10px] mb-3">Industries</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/industries/healthcare" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Healthcare</Link>
                <Link to="/industries/real-estate" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Real Estate</Link>
                <Link to="/industries/coaching" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Coaching</Link>
                <Link to="/industries/solar" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Solar</Link>
                <Link to="/industries/local-business" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Local Business</Link>
              </div>
            </div>
            <div>
              <p className="text-[#FAF5EF]/30 font-semibold uppercase tracking-widest text-[10px] mb-3">Company</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/about" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">About Us</Link>
                <Link to="/pricing" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Pricing</Link>
                <Link to="/contact" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Contact</Link>
                <Link to="/blog" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Blog</Link>
                <Link to="/gorakhpur" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Gorakhpur</Link>
                <Link to="/privacy-policy" className="text-[#FAF5EF]/60 hover:text-[#F9F8F5] transition-colors">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 text-[11px] text-[#FAF5EF]/40 font-medium">
          <span>© 2026 Trinetra Digital Solution. All rights reserved. · Gorakhpur, UP, India</span>
          <div className="flex flex-wrap gap-4 items-center">
            <a href={`mailto:${EMAIL}`} className="hover:text-[#F9F8F5] transition-colors">{EMAIL}</a>
            <a href={PHONE_TEL} className="hover:text-[#F9F8F5] transition-colors">{PHONE_NUMBER}</a>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#F9F8F5] transition-colors">WhatsApp</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Homepage-only full CTA section (hero dark section) ────────────────────
export default function FinalCTA() {
  return <FinalCTAFooter />;
}
