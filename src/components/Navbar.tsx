import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const logoMark = "/TrinetraLogo.png";

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
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-cyan-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-900"
              >
                Book Demo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
