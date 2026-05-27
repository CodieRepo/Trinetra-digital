import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi! I'd like to know more about Trinetra Digital's automation services.")}`;

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const links = [
  { label: "Services", href: "#services" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "Results", href: "#testimonials" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass border-b border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        {/* Brand text */}
        <a href="#" className="flex items-center gap-2.5 group" data-hover>
          {/* Cyan accent mark */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/15 ring-1 ring-cyan-400/30 group-hover:bg-cyan-400/25 transition-all duration-300">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M10 3 C12.5 5.5 13.5 8 13.5 10.5 C12 9.8 11 9.5 10 9.5 C9 9.5 8 9.8 6.5 10.5 C6.5 8 7.5 5.5 10 3Z" stroke="#22d3ee" strokeWidth="1.2" fill="rgba(34,211,238,0.15)" strokeLinejoin="round"/>
              <circle cx="10" cy="10.5" r="1.5" fill="#22d3ee"/>
            </svg>
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-[0.2em] text-white group-hover:text-cyan-100 transition-colors duration-300">
              TRINETRA
            </span>
            <span className="text-[9px] tracking-[0.18em] text-cyan-400/70 mt-0.5">
              DIGITAL SOLUTION
            </span>
          </div>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              data-hover
              className="text-xs tracking-wider text-slate-300 transition-colors duration-300 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {/* WhatsApp quick-link */}
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-hover
            aria-label="WhatsApp us"
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366] transition-all duration-300 hover:border-[#25D366]/70 hover:bg-[#25D366]/20 md:flex"
          >
            {WA_ICON}
          </a>
          <a
            href="#contact"
            data-hover
            className="hidden rounded-full border border-cyan-400/30 px-5 py-2 text-xs font-medium tracking-wide text-cyan-200 transition-all duration-300 hover:border-cyan-300/60 hover:bg-cyan-300/8 hover:text-white md:flex"
          >
            Book Demo
          </a>
          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg md:hidden"
            data-hover
            aria-label="Menu"
          >
            <span className={`block h-px w-5 bg-white transition-all duration-300 ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-px w-5 bg-white transition-all duration-300 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-px w-5 bg-white transition-all duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass overflow-hidden border-t border-white/8 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-sm text-slate-200 transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-[#25D366]/50 bg-[#25D366]/15 px-5 py-2.5 text-sm font-semibold text-[#25D366]"
                >
                  {WA_ICON}
                  WhatsApp Us
                </a>
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-cyan-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-900"
                >
                  Book Demo
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
