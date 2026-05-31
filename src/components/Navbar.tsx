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
    <Link to="/" className="flex items-center gap-3 group transition-opacity duration-200 hover:opacity-90" aria-label="Trinetra Home">
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
        <polygon points="16,3 3,27 29,27" stroke="#18170F" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="11" r="2.5" fill="#BF7340" />
        <circle cx="11.5" cy="20.5" r="2" fill="#18170F" />
        <circle cx="20.5" cy="20.5" r="2" fill="#18170F" />
        <line x1="16" y1="11" x2="11.5" y2="20.5" stroke="#18170F" strokeWidth="1" strokeDasharray="1 1" />
        <line x1="16" y1="11" x2="20.5" y2="20.5" stroke="#18170F" strokeWidth="1" strokeDasharray="1 1" />
        <line x1="11.5" y1="20.5" x2="20.5" y2="20.5" stroke="#18170F" strokeWidth="1" strokeDasharray="1 1" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[14px] font-semibold tracking-[0.2em] text-[#18170F] font-interface">TRINETRA</span>
        <span className="text-[8px] tracking-[0.15em] text-[#5C5A52] mt-0.5 uppercase font-interface font-medium">Digital Solution</span>
      </div>
    </Link>
  );

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#F9F8F5]/92 backdrop-blur-md border-b border-[#E2DDD5] shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
      style={{ height: "60px" }}
    >
      <nav className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-10">
        <LogoMark />

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-xs font-medium tracking-[0.06em] text-[#5C5A52] hover:text-[#18170F] transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href={PHONE_TEL}
            className="text-xs font-medium text-[#5C5A52] hover:text-[#18170F] transition-colors duration-200"
          >
            <span className="text-[#BF7340] font-semibold">{PHONE_NUMBER}</span>
          </a>
          <Link
            to="/contact"
            className="btn-primary-forest text-xs font-semibold tracking-wider uppercase flex h-9 items-center justify-center rounded-lg bg-[#2A4A3E] px-4 text-[#F9F8F5] transition-all hover:bg-[#1E3630]"
          >
            Book Consultation
          </Link>
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

      {/* Mobile Drawer */}
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
              className="absolute right-0 top-0 h-[calc(100vh-132px)] w-64 sm:w-72 bg-[#F9F8F5] border-l border-[#E2DDD5] p-5 shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82] mb-2 mt-2">Menu</p>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className="py-2.5 text-sm font-medium text-[#5C5A52] hover:text-[#18170F] transition-colors border-b border-[#E2DDD5]/40"
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="mt-5 flex flex-col gap-3">
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
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="btn-primary-forest flex h-11 items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wider text-[#F9F8F5]"
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
