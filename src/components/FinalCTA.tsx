import { motion } from "framer-motion";
import { Phone, MessageCircle, ArrowRight, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import LazyVideo from "./LazyVideo";

const WA_NUMBER = "918810721068";
const PHONE_TEL = "tel:+918810721068";
const PHONE_NUMBER = "+91 88107 21068";
const EMAIL = "info@trinetradigitalsolution.com";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's services.")}`;

// ── Shared Footer (used on all pages via PageLayout) ──────────────────────
export function FinalCTAFooter() {
  return (
    <footer className="relative overflow-hidden bg-white z-10 border-t border-border">
      {/* Structural visual quiet backdrop */}
      <div className="absolute inset-0 z-0 grid-pattern opacity-[0.02] pointer-events-none" />

      {/* Floating abstract decorative gradient blobs for premium tech feel */}
      <motion.div
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-24 left-[10%] w-72 h-72 rounded-full bg-accent-light/10 blur-[80px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-12 right-[15%] w-96 h-96 rounded-full bg-emerald-100/10 blur-[100px] pointer-events-none z-0"
      />

      {/* CTA Block */}
      <div className="main-container max-w-[1100px] mx-auto pt-16 md:pt-24 pb-16 md:pb-24 border-b border-border relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text & Buttons */}
          <div className="text-left space-y-6">
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-accent uppercase block">
              Your Complete Digital Growth Partner
            </span>
            <h2 className="text-[32px] sm:text-[44px] md:text-[52px] font-bold leading-[1.1] text-ink-1 tracking-tight">
              Build. Grow. <br />
              <span className="font-editorial italic text-accent">Automate</span> &amp; Scale.
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-ink-2 max-w-xl font-semibold">
              Professional websites, SEO, social media, CRM systems, automation and custom software — everything your business needs to establish a strong online presence and operate more efficiently.
            </p>

            <div className="max-w-[400px] pt-4" role="group" aria-label="Contact Trinetra Digital Solution">
              <motion.a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                id="final-cta-whatsapp"
                aria-label="Chat with Trinetra Digital Solution on WhatsApp"
                whileHover={{ scale: 1.01, y: -0.5 }}
                whileTap={{ scale: 0.99 }}
                className="flex w-full items-center justify-center gap-3 h-12 rounded-lg bg-accent text-white font-semibold text-xs tracking-wider uppercase hover:bg-accent-hover transition-colors mb-3 shadow-sm cursor-pointer text-center"
              >
                <MessageCircle size={15} className="fill-white/10" />
                WhatsApp Us for a Consultation
                <ArrowRight size={13} />
              </motion.a>

              <motion.a
                href={PHONE_TEL}
                id="final-cta-call"
                aria-label="Call Trinetra Digital Solution"
                whileHover={{ scale: 1.01, y: -0.5 }}
                whileTap={{ scale: 0.99 }}
                className="flex w-full items-center justify-center gap-3 h-11 rounded-lg border border-border text-ink-2 font-mono font-medium text-xs tracking-wider hover:bg-slate-50 transition-colors mb-6 cursor-pointer text-center"
              >
                <Phone size={13} />
                {PHONE_NUMBER} — Call Now
              </motion.a>

              <p className="text-[10px] text-ink-4 font-mono font-medium tracking-wide">
                We respond within 30 minutes
              </p>
            </div>
          </div>

          {/* Right Column: Split transformation visual panel */}
          <div className="w-full max-w-[440px] mx-auto lg:mr-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative group transition-all duration-300 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2 mb-3">
              <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Active Scale Integration</span>
              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              </div>
            </div>
            <div style={{ position: "relative", aspectRatio: "16/9" }} className="rounded-lg overflow-hidden border border-slate-150 shadow-inner">
              <LazyVideo src="/videos/build-growth-automate.mp4" className="absolute inset-0 w-full h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="main-container pt-12 pb-mobile-safe md:pb-10 relative z-10">

        {/* GBP Location Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface-2 border border-border rounded-xl px-5 py-4 mb-10">
          <div className="flex items-start sm:items-center gap-3 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent border border-accent/10">
              <MapPin size={14} />
            </div>
            <div>
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-4 mb-0.5">Our Office</p>
              <p className="text-xs font-semibold text-ink-1">
                Gorakhpur, Uttar Pradesh, India — 273001
              </p>
              <p className="text-[10px] text-ink-3 font-mono mt-0.5">Mon–Sat · 9:00 AM – 7:00 PM IST</p>
            </div>
          </div>
          <a
            href="https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Trinetra Digital Solution on Google Maps"
            className="flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-white px-4 text-[10px] font-bold text-ink-2 hover:bg-slate-50 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <ExternalLink size={11} /> View on Google Maps
          </a>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 border-b border-border pb-10">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" fill="none" className="h-6.5 w-6.5" xmlns="http://www.w3.org/2000/svg">
              <polygon points="16,3 3,27 29,27" stroke="var(--color-ink-1)" strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="16" cy="11" r="2.5" fill="var(--color-accent)" />
              <circle cx="11.5" cy="20.5" r="2" fill="var(--color-ink-1)" />
              <circle cx="20.5" cy="20.5" r="2" fill="var(--color-ink-1)" />
              <line x1="16" y1="11" x2="11.5" y2="20.5" stroke="var(--color-ink-1)" strokeWidth="1" strokeDasharray="1 1" />
              <line x1="16" y1="11" x2="20.5" y2="20.5" stroke="var(--color-ink-1)" strokeWidth="1" strokeDasharray="1 1" />
              <line x1="11.5" y1="20.5" x2="20.5" y2="20.5" stroke="var(--color-ink-1)" strokeWidth="1" strokeDasharray="1 1" />
            </svg>
            <div className="flex flex-col leading-none text-left">
              <span className="text-[13px] font-bold tracking-[0.25em] text-ink-1 font-display">TRINETRA</span>
              <span className="text-[8px] tracking-[0.18em] text-ink-3 mt-0.5 uppercase font-mono font-medium">Digital Solution</span>
            </div>
          </div>

          {/* Footer Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-8 text-xs text-left">
            <div>
              <p className="text-ink-4 font-mono font-bold uppercase tracking-widest text-[9px] mb-3">Services</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/services/website-development" className="text-ink-2 hover:text-accent transition-colors font-medium">Website Development</Link>
                <Link to="/services/digital-marketing" className="text-ink-2 hover:text-accent transition-colors font-medium">SEO &amp; Digital Marketing</Link>
                <Link to="/services/digital-marketing" className="text-ink-2 hover:text-accent transition-colors font-medium">Social Media Management</Link>
                <Link to="/services/crm-development" className="text-ink-2 hover:text-accent transition-colors font-medium">Automation &amp; CRM</Link>
                <Link to="/services/crm-development" className="text-ink-2 hover:text-accent transition-colors font-medium">Custom Software</Link>
              </div>
            </div>
            <div>
              <p className="text-ink-4 font-mono font-bold uppercase tracking-widest text-[9px] mb-3">Company</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/about" className="text-ink-2 hover:text-accent transition-colors font-medium">About Us</Link>
                <Link to="/pricing" className="text-ink-2 hover:text-accent transition-colors font-medium">Pricing</Link>
                <Link to="/contact" className="text-ink-2 hover:text-accent transition-colors font-medium">Contact</Link>
                <Link to="/blog" className="text-ink-2 hover:text-accent transition-colors font-medium">Blog</Link>
                <Link to="/gorakhpur" className="text-ink-2 hover:text-accent transition-colors font-medium">Gorakhpur SEO</Link>
                <Link to="/uttar-pradesh" className="text-ink-2 hover:text-accent transition-colors font-medium">UP SEO</Link>
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-ink-4 font-mono font-bold uppercase tracking-widest text-[9px] mb-3">Legal &amp; Compliance</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/privacy-policy" className="text-ink-2 hover:text-accent transition-colors font-medium">Privacy Policy</Link>
                <Link to="/terms-and-conditions" className="text-ink-2 hover:text-accent transition-colors font-medium">Terms &amp; Conditions</Link>
                <Link to="/refund-policy" className="text-ink-2 hover:text-accent transition-colors font-medium">Refund Policy</Link>
                <Link to="/disclaimer" className="text-ink-2 hover:text-accent transition-colors font-medium">Legal Disclaimer</Link>
                <Link to="/cookie-policy" className="text-ink-2 hover:text-accent transition-colors font-medium">Cookie Policy</Link>
                <Link to="/data-usage-notice" className="text-ink-2 hover:text-accent transition-colors font-medium">Data Usage Notice</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 text-[10.5px] text-ink-3 font-medium text-left">
          <span>© 2026 Trinetra Digital Solution. All Rights Reserved. · Gorakhpur, UP, India</span>
          <div className="flex flex-wrap gap-4 items-center">
            <a href={`mailto:${EMAIL}`} className="hover:text-accent transition-colors">{EMAIL}</a>
            <a href={PHONE_TEL} className="hover:text-accent transition-colors">{PHONE_NUMBER}</a>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">WhatsApp</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Homepage-only full CTA section (reused shared layout) ─────────────────
export default function FinalCTA() {
  return <FinalCTAFooter />;
}
