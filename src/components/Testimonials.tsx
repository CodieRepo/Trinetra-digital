import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

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
  },
  {
    project: "Akuafi",
    category: "Technology / Software",
    services: ["Website Architecture Planning", "Frontend Development", "Backend Development", "Multi-Page Implementation", "System Structure & Workflow Design"],
    description: "Handled complete website architecture planning, frontend and backend development, multi-page implementation, and system structure design for Akuafi — a technology-focused business requiring a well-structured digital presence.",
    avatar: "A",
    status: "Completed",
  },
];

export default function Testimonials() {

  return (
    <section id="portfolio" className="relative overflow-hidden bg-[#F9F8F5] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">

        {/* Subsection A: Honest Capability Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-24 text-center">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col items-center justify-center p-6 border-r border-[#E2DDD5] last:border-r-0 md:border-r-1 md:border-b-0 border-b pb-8 last:pb-6 md:pb-6"
            >
              <span className="font-display text-[56px] leading-none text-[#18170F] font-semibold mb-2">
                <MetricCounter value={cap.value.replace(/[^0-9.]/g, '') || '0'} />
                {cap.value.replace(/[0-9.]/g, '')}
              </span>
              <span className="text-xs font-semibold tracking-wider text-[#5C5A52] uppercase font-interface mb-1">
                {cap.label}
              </span>
              <span className="text-[10px] text-[#8C8A82] font-medium">{cap.note}</span>
            </motion.div>
          ))}
        </div>

        {/* Subsection B: Verified Portfolio */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="mixed-headline-eyebrow">
              Our Work
            </span>
            <h2 className="display-lg text-[#18170F] tracking-tight max-w-[620px] mx-auto">
              Verified portfolio projects.
            </h2>
            <p className="body-md text-[#5C5A52] max-w-[500px] mx-auto mt-4">
              We only present projects we have actually delivered. No inflated numbers, no fabricated results.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <AnimatePresence>
              {PORTFOLIO.map((item, i) => (
                <motion.div
                  key={item.project}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative rounded-2xl border border-[#E2DDD5] bg-[#F4F2ED] p-8 shadow-xs text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#BF7340]/10 text-sm font-bold text-[#BF7340]">
                          {item.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#18170F]">{item.project}</p>
                          <p className="text-xs text-[#5C5A52]">{item.category}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F0ED] text-[#2A4A3E] border border-[#2A4A3E]/10">
                        {item.status}
                      </span>
                    </div>

                    <p className="text-sm text-[#5C5A52] leading-relaxed mb-5">
                      {item.description}
                    </p>

                    <div className="w-full h-px bg-[#E2DDD5] mb-4" />

                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C8A82] mb-2">Services Delivered</p>
                      <ul className="space-y-1.5">
                        {item.services.map((svc, si) => (
                          <li key={si} className="flex items-center gap-2 text-xs text-[#5C5A52]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#BF7340] shrink-0" />
                            {svc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2DDD5]/60 mt-4">
                    <Link
                      to={`/contact?service=${encodeURIComponent(
                        item.project === "Vaastu Infra" 
                          ? "Website Development" 
                          : "Custom Software Development"
                      )}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#BF7340] hover:text-[#A6612E] transition-colors cursor-pointer"
                    >
                      Enquire about a similar system &rarr;
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
            className="mt-10 text-center p-6 rounded-xl border border-[#E2DDD5] bg-[#F4F2ED]"
          >
            <p className="text-sm font-semibold text-[#18170F] mb-1">Building our portfolio, one honest project at a time.</p>
            <p className="text-xs text-[#5C5A52] max-w-[460px] mx-auto">
              We are a growing team committed to delivering quality work. Every project listed here represents a real engagement with a real business.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
