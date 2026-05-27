import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle } from "lucide-react";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
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
          {/* Glassmorphism bar */}
          <div
            className="flex items-stretch border-t border-[#E2DDD5]/60 bg-[#F9F8F5]/95 backdrop-blur-md"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* WhatsApp Button */}
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              id="mobile-whatsapp-cta"
              className="flex flex-1 items-center justify-center gap-2.5 py-4 text-sm font-bold text-[#18170F] bg-[#F4F2ED] border-r border-[#E2DDD5] active:bg-[#EEEAE3] transition-colors duration-150"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] shrink-0">
                <MessageCircle size={17} className="fill-[#25D366]/10" />
              </span>
              <div className="flex flex-col leading-none text-left">
                <span className="text-[11px] font-semibold text-[#18170F] tracking-wide">WhatsApp Us</span>
                <span className="text-[10px] text-[#5C5A52] mt-0.5">Reply in minutes</span>
              </div>
            </a>

            {/* Call Now Button */}
            <a
              href={PHONE_TEL}
              id="mobile-call-cta"
              className="flex flex-1 items-center justify-center gap-2.5 py-4 text-sm font-bold bg-[#2A4A3E] text-[#F9F8F5] active:bg-[#1E3630] transition-colors duration-150"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BF7340]/15 text-[#BF7340] shrink-0">
                <Phone size={16} />
              </span>
              <div className="flex flex-col leading-none text-left">
                <span className="text-[11px] font-semibold text-[#F9F8F5] tracking-wide">Call Now</span>
                <span className="text-[10px] text-[#FAF5EF]/60 mt-0.5">{PHONE_NUMBER}</span>
              </div>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
