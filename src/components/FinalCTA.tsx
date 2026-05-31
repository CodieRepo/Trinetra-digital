import { motion } from "framer-motion";
import { Phone, MessageCircle, ArrowRight, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in booking a consultation with Trinetra Digital Solution.")}`;

// ── Shared Footer (used on all pages via PageLayout) ──────────────────────
export function FinalCTAFooter() {
  return (
    <footer className="relative overflow-hidden bg-slate-50 z-10 border-t border-slate-200">
      
      {/* CTA Block */}
      <div className="main-container max-w-[700px] mx-auto text-center pt-16 md:pt-20 pb-16 md:pb-20 border-b border-slate-200 px-4">
        <span className="text-xs font-bold tracking-[0.2em] text-[#2563EB] uppercase mb-4 block">
          Streamline Your Digital Presence
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-5 max-w-[550px] mx-auto leading-tight">
          Ready to scale your business operations?
        </h2>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-[500px] mx-auto mb-8">
          Partner with a reliable technology agency. We build custom websites, CRM systems, and performance digital marketing campaigns focused on real growth.
        </p>

        <div className="max-w-[420px] mx-auto flex flex-col gap-3" role="group" aria-label="Contact Trinetra Digital Solution">
          <motion.a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="final-cta-whatsapp"
            aria-label="Chat with Trinetra Digital Solution on WhatsApp"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-3.5 h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs tracking-wider uppercase transition-colors shadow-xs"
          >
            <MessageCircle size={17} className="fill-white/10" />
            Chat on WhatsApp
            <ArrowRight size={14} />
          </motion.a>

          <motion.a
            href={PHONE_TEL}
            id="final-cta-call"
            aria-label="Call Trinetra Digital Solution"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-3.5 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs tracking-wider uppercase hover:bg-slate-50 transition-all"
          >
            <Phone size={14} />
            {PHONE_NUMBER} — Call Now
          </motion.a>

          <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-2">
            No obligation · Initial consultation is completely free
          </p>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="main-container max-w-[1200px] mx-auto pt-10 pb-8 px-4">

        {/* ── Compact Office Location Strip ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-10 shadow-3xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
              <MapPin size={16} />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#94A3B8] mb-0.5">Our Office Address</p>
              <p className="text-xs font-bold text-slate-900 leading-tight">
                Gorakhpur, Uttar Pradesh, India — 273001
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Business Hours: Mon–Sat · 9:00 AM – 7:00 PM IST</p>
            </div>
          </div>
          <a
            href="https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Trinetra Digital Solution on Google Maps"
            className="flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all whitespace-nowrap shrink-0"
          >
            <ExternalLink size={12} /> View on Google Maps
          </a>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr] lg:grid-cols-[1.5fr_2fr] pb-10 border-b border-slate-200">
          
          {/* Brand Column */}
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,3 3,27 29,27" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="16" cy="11" r="2.5" fill="#2563EB" />
                <circle cx="11.5" cy="20.5" r="2" fill="#0F172A" />
                <circle cx="20.5" cy="20.5" r="2" fill="#0F172A" />
                <line x1="16" y1="11" x2="11.5" y2="20.5" stroke="#0F172A" strokeWidth="1" strokeDasharray="1 1" />
                <line x1="16" y1="11" x2="20.5" y2="20.5" stroke="#0F172A" strokeWidth="1" strokeDasharray="1 1" />
                <line x1="11.5" y1="20.5" x2="20.5" y2="20.5" stroke="#0F172A" strokeWidth="1" strokeDasharray="1 1" />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="text-[14px] font-bold tracking-[0.2em] text-[#0F172A] font-interface">TRINETRA</span>
                <span className="text-[8px] tracking-[0.15em] text-[#475569] mt-0.5 uppercase font-interface font-semibold">Digital Solution</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-[280px]">
              Legitimate technology and digital growth partner helping businesses establish credibility through custom websites, streamlined software, and strategic marketing.
            </p>
          </div>

          {/* Links Column Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-left text-xs">
            <div>
              <p className="text-slate-400 font-extrabold uppercase tracking-widest text-[9.5px] mb-3">Our Services</p>
              <div className="flex flex-col gap-2.5 font-semibold">
                <Link to="/services/website-development" className="text-slate-500 hover:text-[#2563EB] transition-colors">Website Development</Link>
                <Link to="/services/ai-crm" className="text-slate-500 hover:text-[#2563EB] transition-colors">CRM Development</Link>
                <Link to="/services/digital-marketing" className="text-slate-500 hover:text-[#2563EB] transition-colors">Digital Marketing</Link>
              </div>
            </div>
            <div>
              <p className="text-slate-400 font-extrabold uppercase tracking-widest text-[9.5px] mb-3">Company</p>
              <div className="flex flex-col gap-2.5 font-semibold">
                <Link to="/about" className="text-slate-500 hover:text-[#2563EB] transition-colors">About Us</Link>
                <Link to="/pricing" className="text-slate-500 hover:text-[#2563EB] transition-colors">Transparent Pricing</Link>
                <Link to="/contact" className="text-slate-500 hover:text-[#2563EB] transition-colors">Free Consultation</Link>
                <Link to="/blog" className="text-slate-500 hover:text-[#2563EB] transition-colors">Blog &amp; Resources</Link>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-slate-400 font-extrabold uppercase tracking-widest text-[9.5px] mb-3">Trust &amp; Compliance</p>
              <div className="flex flex-col gap-2.5 font-semibold">
                <Link to="/privacy-policy" className="text-slate-500 hover:text-[#2563EB] transition-colors">Privacy Policy</Link>
                <Link to="/terms-and-conditions" className="text-slate-500 hover:text-[#2563EB] transition-colors">Terms &amp; Conditions</Link>
                <Link to="/refund-policy" className="text-slate-500 hover:text-[#2563EB] transition-colors">Refund Policy</Link>
                <Link to="/disclaimer" className="text-slate-500 hover:text-[#2563EB] transition-colors">Legal Disclaimer</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate & Brand Ownership Declaration */}
        <div className="mt-8 text-left text-[11px] leading-relaxed text-slate-400 space-y-4">
          <p>
            <strong>Ownership &amp; Transparency Statement:</strong> Trinetra Digital Solution is the official digital services and technology consulting brand owned and operated by <strong>Charulata Enterprises</strong>. All agreements, commercial covenants, customer proposals, invoices, and banking transactions are strictly executed under the legal business entity name <strong>Charulata Enterprises</strong>. This statement is provided to satisfy business compliance requirements for Meta Business Verification, Google Business Profiles, online advertising policies, and payment merchant gateways.
          </p>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-200 text-[10.5px] font-semibold text-slate-500">
            <span>© 2026 Trinetra Digital Solution (Charulata Enterprises). All Rights Reserved. · Gorakhpur, UP, India</span>
            <div className="flex flex-wrap gap-4 items-center">
              <a href={`mailto:${EMAIL}`} className="hover:text-[#2563EB] transition-colors">{EMAIL}</a>
              <a href={PHONE_TEL} className="hover:text-[#2563EB] transition-colors">{PHONE_NUMBER}</a>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#2563EB] transition-colors">WhatsApp Support</a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

// ── Homepage-only CTA section fallback ────────────────────
export default function FinalCTA() {
  return <FinalCTAFooter />;
}
