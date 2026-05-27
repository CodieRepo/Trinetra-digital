import { useEffect, useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

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

const STATS = [
  { value: "50+", label: "Businesses Automated" },
  { value: "3.0x", label: "Lead Response Rate Increase" },
  { value: "2m", label: "Average AI Reply Time" },
];

const TESTIMONIALS = [
  {
    quote: "We were losing 30% of leads just because nobody followed up. Trinetra fixed that in the first week. The AI now qualifies and schedules site visits autonomously.",
    author: "Rajesh Kumar",
    role: "Founder",
    company: "PropFinder Realty",
    location: "Mumbai",
    avatar: "R",
  },
  {
    quote: "OPD scheduling was causing a massive bottleneck. Connecting Trinetra to our hospital's WhatsApp number automated booking instantly and cut front-desk load in half.",
    author: "Dr. Ananya Sen",
    role: "Chief Medical Officer",
    company: "Metro Care Clinics",
    location: "Kolkata",
    avatar: "A",
  },
  {
    quote: "Our marketing spend went 2x further when we automated lead qualification. No cold lead gets skipped, and our sales reps only chat with vetted prospects.",
    author: "Vikram Malhotra",
    role: "Growth Director",
    company: "Malhotra Academy",
    location: "Delhi NCR",
    avatar: "V",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setActive((a) => (a + 1) % TESTIMONIALS.length);

  return (
    <section id="testimonials" className="relative overflow-hidden bg-[#F9F8F5] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">
        
        {/* Subsection A: Key Metrics */}
        <div className="grid gap-6 md:grid-cols-3 mb-24 text-center">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col items-center justify-center p-6 border-r border-[#E2DDD5] last:border-r-0 md:border-r-1 md:border-b-0 border-b pb-8 last:pb-6 md:pb-6"
            >
              {/* Stat counter */}
              <span className="font-display text-[56px] leading-none text-[#18170F] font-semibold mb-2">
                {stat.value === "2m" ? (
                  <>
                    &lt; <MetricCounter value="2" /> min
                  </>
                ) : (
                  <MetricCounter value={stat.value} />
                )}
              </span>
              <span className="text-xs font-semibold tracking-wider text-[#5C5A52] uppercase font-interface">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Subsection B: Testimonials */}
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="mixed-headline-eyebrow">
              Proof of Impact
            </span>
            <h2 className="display-lg text-[#18170F] tracking-tight max-w-[620px] mx-auto">
              Real infrastructure results, built for scale.
            </h2>
          </div>

          {/* Testimonial Card */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-2xl border border-[#E2DDD5] bg-[#F4F2ED] p-8 md:p-12 shadow-xs text-left"
              >
                {/* Large decorative quotation mark top-left */}
                <span className="absolute top-4 left-6 font-display text-[84px] leading-none text-[#BF7340] opacity-15 select-none pointer-events-none font-semibold">
                  “
                </span>

                {/* Quote block text */}
                <blockquote className="display-md text-[#18170F] font-medium leading-relaxed italic mb-8 relative z-10">
                  {TESTIMONIALS[active].quote}
                </blockquote>

                {/* Divider Line */}
                <div className="w-full h-px bg-[#E2DDD5] mb-6" />

                {/* Footer Details */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Minimal Avatar placeholder */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#BF7340]/10 text-sm font-bold text-[#BF7340]">
                      {TESTIMONIALS[active].avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#18170F]">{TESTIMONIALS[active].author}</p>
                      <p className="text-xs text-[#5C5A52]">
                        {TESTIMONIALS[active].role} · {TESTIMONIALS[active].company}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82] self-start sm:self-center">
                    {TESTIMONIALS[active].location}
                  </span>
                </div>

              </motion.div>
            </AnimatePresence>

            {/* Slider Navigation Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={prev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2DDD5] bg-[#FFFFFF] text-[#5C5A52] hover:bg-[#F4F2ED] hover:text-[#18170F] shadow-xs transition-colors duration-200"
                aria-label="Previous testimonial"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={next}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2DDD5] bg-[#FFFFFF] text-[#5C5A52] hover:bg-[#F4F2ED] hover:text-[#18170F] shadow-xs transition-colors duration-200"
                aria-label="Next testimonial"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
