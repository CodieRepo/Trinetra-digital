import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const WA_NUMBER = "919334757759";
const PHONE_NUMBER = "+91 9334757759";
const PHONE_TEL = "tel:+919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's services.")}`;

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const LogoMark = () => (
    <Link to="/" className="flex items-center gap-2.5 group transition-opacity duration-200 hover:opacity-90" aria-label="Trinetra Home">
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
    </Link>
  );

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md border-b border-border shadow-xs"
          : "bg-white/50 backdrop-blur-xs border-b border-border-subtle"
      }`}
      style={{ height: "60px" }}
    >
      <nav className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-10">
        <LogoMark />

        {/* Desktop Nav */}
        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-xs font-semibold tracking-wider text-ink-2 hover:text-accent transition-colors duration-150 animated-underline-link"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-5 md:flex">
          <a
            href={PHONE_TEL}
            className="text-xs font-mono font-medium text-ink-2 hover:text-accent transition-colors duration-150"
          >
            <span>{PHONE_NUMBER}</span>
          </a>
          <Link
            to="/contact"
            className="btn-primary-forest text-xs font-semibold tracking-wider uppercase flex h-9 items-center justify-center rounded-lg bg-cta text-white hover:bg-cta-hover transition-all"
          >
            Book Consultation
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-1 md:hidden focus:outline-none"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 top-[60px] z-40 bg-slate-900/10 backdrop-blur-xs md:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="absolute right-0 top-0 h-[calc(100vh-60px)] w-64 sm:w-72 bg-white border-l border-border p-5 shadow-lg overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1 text-left">
                <p className="text-[9px] uppercase font-bold tracking-widest text-ink-4 mb-2 mt-1 font-mono">Navigation</p>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className="py-4 text-sm font-semibold text-ink-2 hover:text-accent transition-colors border-b border-border-subtle"
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="mt-8 flex flex-col gap-3">
                  <a
                    href={PHONE_TEL}
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-lg border border-border bg-surface-2 text-xs font-mono font-medium text-ink-2 hover:bg-surface-3 transition-colors gap-2"
                  >
                    📞 {PHONE_NUMBER}
                  </a>
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-lg border border-border bg-white text-xs font-semibold text-ink-2 hover:bg-surface-2 transition-colors"
                  >
                    💬 WhatsApp Us
                  </a>
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="btn-primary-forest flex h-11 items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    Book Consultation
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
