import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Tag, ArrowRight } from "lucide-react";
import LazyVideo from "./LazyVideo";

// Count Up Helper Component
function MetricCounter({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    // Parse the numbers and symbols
    const numPart = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    const prefix = value.match(/^[^\d]*/)?.[0] || "";
    const suffix = value.match(/[^\d.]*$/)?.[0] || "";
    
    let start = 0;
    const end = numPart;
    const isFloat = value.includes(".");
    
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + easeProgress * (end - start);
      
      const formattedNumber = isFloat 
        ? current.toFixed(1) 
        : Math.floor(current).toString();

      setDisplayValue(`${prefix}${formattedNumber}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return <span ref={ref}>{displayValue}</span>;
}

const CAPABILITIES = [
  { value: "5+", label: "Services Offered", note: "Website, SEO, Social, CRM, Software" },
  { value: "2", label: "Verified Projects", note: "Vaastu Infra & Akuafi" },
  { value: "100%", label: "Custom-Built", note: "No templates. Built for your workflow." },
];

const PORTFOLIO = [
  {
    project: "Vaastu Infra",
    category: "Real Estate",
    services: ["Business Website Development", "WhatsApp Integration", "Lead Inquiry Form Integration"],
    description: "Developed a professional business website for Vaastu Infra with integrated WhatsApp contact flow and a structured lead inquiry form to capture and organize incoming property inquiries.",
    avatar: "V",
    status: "Live",
    video: "/videos/vastuproject.mp4",
    url: "vaastuinfra.in"
  },
  {
    project: "Akuafi",
    category: "Technology / Software",
    services: ["Website Architecture Planning", "Frontend Development", "Backend Development", "Multi-Page Implementation", "System Structure & Workflow Design"],
    description: "Handled complete website architecture planning, frontend and backend development, multi-page implementation, and system structure design for Akuafi — a technology-focused business requiring a well-structured digital presence.",
    avatar: "A",
    status: "Completed",
    video: "/videos/akuafiproject.mp4",
    url: "akuafi.com"
  },
];

export default function Testimonials() {
  return (
    <section id="portfolio" className="relative overflow-hidden bg-white py-12">
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 relative z-10">

        {/* Subsection A: Honest Capability Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-24 text-center">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col items-center justify-center p-6 border-slate-100 last:border-r-0 md:border-r border-b md:border-b-0 pb-8 last:pb-6 md:pb-6"
            >
              <span className="font-display text-[56px] leading-none text-slate-900 font-semibold mb-2.5 tracking-tight">
                <MetricCounter value={cap.value.replace(/[^0-9.]/g, '') || '0'} />
                {cap.value.replace(/[0-9.]/g, '')}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono mb-1.5">
                {cap.label}
              </span>
              <span className="text-[10.5px] text-slate-400 font-semibold font-mono">{cap.note}</span>
            </motion.div>
          ))}
        </div>

        {/* Subsection B: Verified Portfolio */}
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="mixed-headline-eyebrow">
              Our Work
            </span>
            <h2 className="display-lg text-ink-1 tracking-tight max-w-[620px] mx-auto font-display font-bold">
              Verified portfolio projects.
            </h2>
            <p className="body-md text-ink-2 max-w-[500px] mx-auto font-medium">
              We only present projects we have actually delivered. No inflated numbers, no fabricated results.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <AnimatePresence>
              {PORTFOLIO.map((item, i) => (
                <motion.div
                  key={item.project}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative rounded-2xl border border-border/80 bg-[#F8FAFC] p-6 md:p-8 shadow-xs text-left flex flex-col justify-between hover:border-accent/40 hover:shadow-md transition-all duration-300 group"
                >
                  <div>
                    {/* Browser Mockup Frame for Video Showcase */}
                    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs relative aspect-video w-full mb-6 transition-transform duration-300 group-hover:scale-[1.01] group-hover:shadow-sm">
                      {/* Browser Header Bar */}
                      <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-2 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        </div>
                        <div className="bg-white border border-slate-200/60 rounded px-4 py-0.5 text-[8px] font-mono text-slate-400 font-semibold tracking-wide">
                          {item.url}
                        </div>
                        <div className="w-[18px]" /> {/* Empty placeholder for visual balancing */}
                      </div>
                      {/* Video Walkthrough Player */}
                      <LazyVideo src={item.video} className="w-full h-full" />
                    </div>

                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-light text-sm font-mono font-bold text-accent border border-accent/15">
                          {item.avatar}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">{item.project}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Tag size={10} className="text-slate-400" />
                            <p className="text-[10px] text-slate-500 font-semibold">{item.category}</p>
                          </div>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E2F2E9] text-[#137A3E] border border-[#A3E0BA]">
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-semibold mb-6">
                      {item.description}
                    </p>

                    <div className="w-full h-px bg-slate-200/80 mb-5" />

                    <div className="mb-6">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-3">Services Delivered</p>
                      <ul className="space-y-2">
                        {item.services.map((svc, si) => (
                          <motion.li
                            key={si}
                            initial={{ opacity: 0, x: -4 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 0.1 + si * 0.05 }}
                            className="flex items-start gap-2.5 text-[11px] font-semibold text-slate-600"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                            <span>{svc}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200/80 mt-4">
                    <Link
                      to={`/contact?service=${encodeURIComponent(
                        item.project === "Vaastu Infra" 
                          ? "Website Development" 
                          : "Custom Software Development"
                      )}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline transition-colors cursor-pointer"
                    >
                      Enquire about a similar system <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Honest CTA below portfolio */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center p-6 md:p-8 rounded-xl border border-border/80 bg-[#F8FAFC]"
          >
            <p className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider mb-2">Building our portfolio, one honest project at a time.</p>
            <p className="text-xs text-slate-500 max-w-[460px] mx-auto leading-relaxed font-medium">
              We are a growing team committed to delivering quality work. Every project listed here represents a real engagement with a real business.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
