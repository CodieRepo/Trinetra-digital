import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const WA_NUMBER = "919334757759";
const PHONE_NUMBER = "+91 9334757759";
const PHONE_TEL = "tel:+919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in Trinetra Digital Solution's AI automation services.")}`;

const links = [
  { label: "Solutions", href: "#system" },
  { label: "How It Works", href: "#process" },
  { label: "Industries", href: "#industries" },
  { label: "Pricing", href: "#pricing" },
  { label: "Results", href: "#testimonials" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 400 / 1000, ease: "easeOut", delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#F9F8F5]/92 backdrop-blur-md border-b border-[#E2DDD5] shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
      style={{ height: "60px" }}
    >
      <nav className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6 md:px-10">
        {/* Brand Horizontal Compact Lockup */}
        <a href="#" className="flex items-center gap-3 group transition-opacity duration-200 hover:opacity-90" aria-label="Trinetra Home">
          {/* Custom Geometric Three-Eye Sanskrit Logomark */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            className="h-7 w-7 text-[#18170F]"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Minimalist central outer triangle */}
            <polygon
              points="16,3 3,27 29,27"
              stroke="#18170F"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Eye 3 (See Ahead): Top Node in Copper Accent */}
            <circle cx="16" cy="11" r="2.5" fill="#BF7340" />
            
            {/* Eye 1 (See Everything): Bottom Left Node */}
            <circle cx="11.5" cy="20.5" r="2" fill="#18170F" />
            
            {/* Eye 2 (See Patterns): Bottom Right Node */}
            <circle cx="20.5" cy="20.5" r="2" fill="#18170F" />

            {/* Connecting thin vector line representing nervous systems / patterns */}
            <line x1="16" y1="11" x2="11.5" y2="20.5" stroke="#18170F" strokeWidth="1" strokeDasharray="1 1" />
            <line x1="16" y1="11" x2="20.5" y2="20.5" stroke="#18170F" strokeWidth="1" strokeDasharray="1 1" />
            <line x1="11.5" y1="20.5" x2="20.5" y2="20.5" stroke="#18170F" strokeWidth="1" strokeDasharray="1 1" />
          </svg>
          
          <div className="flex flex-col leading-none">
            <span className="text-[14px] font-semibold tracking-[0.2em] text-[#18170F] font-interface">
              TRINETRA
            </span>
            <span className="text-[8px] tracking-[0.15em] text-[#5C5A52] mt-0.5 uppercase font-interface font-medium">
              Digital Solution
            </span>
          </div>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-medium tracking-[0.06em] text-[#5C5A52] hover:text-[#18170F] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href={PHONE_TEL}
            className="text-xs font-medium text-[#5C5A52] hover:text-[#18170F] transition-colors duration-200 flex items-center gap-1.5"
          >
            <span className="text-[#BF7340] font-semibold">{PHONE_NUMBER}</span>
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary-forest text-xs font-semibold tracking-wider uppercase flex h-9 items-center justify-center rounded-sm bg-[#2A4A3E] px-4 text-[#F9F8F5] transition-all hover:bg-[#1E3630]"
            style={{ height: "36px", padding: "0 16px", borderRadius: "8px" }}
          >
            Book Demo
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#18170F] md:hidden focus:outline-none"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Drawer Slide-in from right */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-[60px] z-40 bg-[#18170F]/20 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute right-0 top-0 h-[calc(100vh-60px)] w-72 bg-[#F9F8F5] border-l border-[#E2DDD5] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-5">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-[#E2DDD5]/60 pb-3 text-sm font-medium tracking-wide text-[#5C5A52] hover:text-[#18170F] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-3">
                  <a
                    href={PHONE_TEL}
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-lg border border-[#BF7340]/30 bg-[#FAF5EF] text-xs font-semibold text-[#BF7340] hover:bg-[#F2E8DC] transition-colors gap-2"
                  >
                    📞 {PHONE_NUMBER}
                  </a>
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-center rounded-lg border border-[#E2DDD5] bg-[#F4F2ED] text-xs font-semibold text-[#18170F] hover:bg-[#EEEAE3] transition-colors"
                  >
                    💬 WhatsApp Us
                  </a>
                  <a
                    href="#contact"
                    onClick={() => setOpen(false)}
                    className="btn-primary-forest flex h-11 items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wider text-[#F9F8F5]"
                  >
                    Book a Free Demo
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
