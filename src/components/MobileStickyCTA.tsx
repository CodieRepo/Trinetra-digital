import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle } from "lucide-react";
import { trackContact } from "../utils/metaPixel";

const WA_NUMBER = "918810721068";
const PHONE_TEL = "tel:+918810721068";
const PHONE_NUMBER = "+91 88107 21068";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
  "Hi, I'm interested in Trinetra Digital Solution's AI automation services."
)}`;

export default function MobileStickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          className="fixed bottom-0 inset-x-0 z-[9980] md:hidden"
        >
          {/* Unified design system bottom sticky bar */}
          <div
            className="flex items-stretch border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
          >
            {/* WhatsApp Button */}
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              id="mobile-whatsapp-cta"
              onClick={() => trackContact()}
              className="flex flex-1 items-center justify-center gap-2.5 py-4.5 text-sm font-bold text-slate-900 bg-slate-50 border-r border-slate-200 active:bg-slate-100 transition-colors duration-150"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                <MessageCircle size={17} className="fill-emerald-600/10" />
              </span>
              <div className="flex flex-col leading-none text-left">
                <span className="text-[11px] font-semibold text-slate-950 tracking-wide">WhatsApp Us</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Reply in minutes</span>
              </div>
            </a>

            {/* Call Now Button */}
            <a
              href={PHONE_TEL}
              id="mobile-call-cta"
              onClick={() => trackContact()}
              className="flex flex-1 items-center justify-center gap-2.5 py-4.5 text-sm font-bold bg-slate-900 text-white active:bg-slate-800 transition-colors duration-150"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light/10 text-accent shrink-0">
                <Phone size={16} />
              </span>
              <div className="flex flex-col leading-none text-left">
                <span className="text-[11px] font-semibold text-white tracking-wide">Call Now</span>
                <span className="text-[10px] text-slate-300 mt-0.5">{PHONE_NUMBER}</span>
              </div>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
