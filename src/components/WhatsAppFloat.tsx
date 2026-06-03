import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";

const WA_NUMBER = "919334757759";
const WA_MESSAGE = "Hi, I'm interested in Trinetra Digital Solution's custom web and software services.";

export default function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9990] flex flex-col items-end gap-3 font-interface">
          
          {/* Custom Styled Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 shadow-lg text-left"
                style={{ minWidth: "180px" }}
              >
                <p className="font-bold text-slate-900">Operational Consult</p>
                <p className="text-slate-500 mt-0.5">Ask about the 7-day build</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Harmonized Button Container */}
          <motion.a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consult on WhatsApp"
            whileHover={{ scale: 1.05, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(false)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-md border border-white/10"
          >
            {/* Glowing Accent Pulse Ring */}
            <span className="absolute inset-0 rounded-full border border-accent opacity-40 animate-ping" />
            
            <MessageCircle size={20} className="fill-white/10" />
          </motion.a>

        </div>
      )}
    </AnimatePresence>
  );
}
