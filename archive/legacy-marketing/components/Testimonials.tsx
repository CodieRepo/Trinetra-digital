import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Tag, ArrowRight, ExternalLink, Check } from "lucide-react";
import LazyVideo from "./LazyVideo";

// Count Up Helper Component
function MetricCounter({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const numPart = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    const prefix = value.match(/^[^\d]*/)?.[0] || "";
    const suffix = value.match(/[^\d.]*$/)?.[0] || "";
    let startTime: number | null = null;
    const isFloat = value.includes(".");

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easeProgress * numPart;
      setDisplayValue(`${prefix}${isFloat ? current.toFixed(1) : Math.floor(current)}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
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
    url: "vaastuinfra.in",
  },
  {
    project: "Akuafi",
    category: "Technology / Software",
    services: ["Website Architecture Planning", "Frontend Development", "Backend Development", "Multi-Page Implementation", "System Structure & Workflow Design"],
    description: "Handled complete website architecture planning, frontend and backend development, multi-page implementation, and system structure design for Akuafi — a technology-focused business requiring a well-structured digital presence.",
    avatar: "A",
    status: "Completed",
    video: "/videos/akuafiproject.mp4",
    url: "akuafi.com",
  },
];

export default function Testimonials() {
  return (
    <section id="portfolio" className="relative overflow-hidden bg-transparent py-16 md:py-24 border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 relative z-10">

        {/* Stats Row */}
        <div className="grid gap-0 md:grid-cols-3 mb-20 border border-white/5 bg-[#1d2022]/40 backdrop-blur-3xl rounded-2xl overflow-hidden shadow-2xl">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col items-center justify-center p-8 text-center border-b md:border-b-0 md:border-r border-white/5 last:border-0"
            >
              <span className="font-display text-[52px] leading-none text-white font-semibold mb-2 tracking-tight">
                <MetricCounter value={cap.value.replace(/[^0-9.]/g, '') || '0'} />
                {cap.value.replace(/[0-9.]/g, '')}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-accent uppercase font-mono mb-1">
                {cap.label}
              </span>
              <span className="text-[10.5px] text-ink-3 font-semibold font-mono">{cap.note}</span>
            </motion.div>
          ))}
        </div>

        {/* Section header */}
        <div className="text-center mb-16 space-y-3">
          <span className="mixed-headline-eyebrow">Our Work</span>
          <h2 className="display-lg text-ink-1 tracking-tight max-w-[620px] mx-auto font-display font-bold">
            Verified portfolio projects.
          </h2>
          <p className="body-md text-ink-2 max-w-[500px] mx-auto font-medium">
            We only present projects we have actually delivered. No inflated numbers, no fabricated results.
          </p>
        </div>

        {/* Alternating project showcase layout */}
        <div className="space-y-24">
          <AnimatePresence>
            {PORTFOLIO.map((item, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={item.project}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6 }}
                  className={`grid gap-8 lg:gap-16 items-center ${
                    isEven ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-[0.9fr_1.1fr]"
                  }`}
                >
                  {/* Video side */}
                  <div className={`${isEven ? "lg:order-1" : "lg:order-2"} group`}>
                    {/* Browser mockup frame */}
                    <div className="bg-[#101415]/80 border border-white/5 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 backdrop-blur-md">
                      {/* Browser bar */}
                      <div className="bg-[#0b0f10]/80 border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-md px-4 py-1 text-[9px] font-mono text-ink-2 font-semibold tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                          {item.url}
                        </div>
                        <ExternalLink size={10} className="text-ink-3" />
                      </div>
                      {/* Video area */}
                      <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", overflow: "hidden" }}>
                        <LazyVideo
                          src={item.video}
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Content side */}
                  <div className={`${isEven ? "lg:order-2" : "lg:order-1"} space-y-6 text-left`}>
                    {/* Project meta */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-mono font-bold text-accent border border-accent/20">
                        {item.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                          {item.project}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Tag size={10} className="text-ink-3" />
                          <p className="text-[10px] text-ink-3 font-semibold">{item.category}</p>
                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 ml-1">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-ink-2 leading-relaxed font-medium">
                      {item.description}
                    </p>

                    <div>
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-3 mb-3">
                        Services Delivered
                      </p>
                      <ul className="space-y-2">
                        {item.services.map((svc, si) => (
                          <motion.li
                            key={si}
                            initial={{ opacity: 0, x: -4 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 0.05 + si * 0.05 }}
                            className="flex items-start gap-2.5 text-xs font-semibold text-ink-2"
                          >
                            <Check size={13} className="text-accent mt-0.5 shrink-0" />
                            {svc}
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <Link
                        to={`/contact?service=${encodeURIComponent(
                          item.project === "Vaastu Infra" ? "Website Development" : "Custom Software Development"
                        )}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:text-accent-hover transition-colors group"
                      >
                        Enquire about a similar system
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Honest CTA strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center p-6 md:p-8 rounded-2xl border border-white/5 bg-[#1d2022]/40 backdrop-blur-md shadow-2xl"
        >
          <p className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2">
            Building our portfolio, one honest project at a time.
          </p>
          <p className="text-xs text-ink-2 max-w-[460px] mx-auto leading-relaxed font-medium">
            We are a growing team committed to delivering quality work. Every project listed here represents a real engagement with a real business.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
