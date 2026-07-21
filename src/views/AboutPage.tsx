import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, Lightbulb, Users, ShieldCheck, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";

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

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "url": "https://trinetradigitalsolution.com/about",
  "name": "About Trinetra Digital Solution",
  "description": "Trinetra Digital Solution is a business growth and digital transformation partner based in Gorakhpur, Uttar Pradesh. We help startups, local businesses and growing companies build websites, manage digital marketing, automate workflows and develop custom software.",
  "mainEntity": {
    "@id": "https://trinetradigitalsolution.com/#organization",
  },
};

const VALUES = [
  {
    icon: <Target size={20} />,
    title: "Process-Driven",
    desc: "Every engagement follows a clear process — from consultation and planning to implementation and review. No guesswork, just structured execution.",
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Business-Focused Solutions",
    desc: "We build digital systems around your actual business goals — whether that's improving lead management, establishing online visibility or streamlining operations.",
  },
  {
    icon: <Users size={20} />,
    title: "Long-Term Partnerships",
    desc: "We work as a committed partner, not a one-off vendor. Our goal is to help your business improve and evolve over time through ongoing support and optimization.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Transparent & Compliant",
    desc: "We communicate clearly, set realistic expectations and ensure all our services follow platform policies including Google, Meta and WhatsApp Business guidelines.",
  },
];

export default function AboutPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="About Trinetra Digital Solution — Business Growth & Digital Transformation Partner"
        description="Trinetra Digital Solution is a complete business growth partner based in Gorakhpur, UP. We help local businesses, startups and SMBs build websites, run digital marketing, automate workflows and develop custom software solutions."
        canonical="https://trinetradigitalsolution.com/about"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="bg-transparent pt-24 pb-20 md:pt-32 md:pb-28 border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10">
          <div className="max-w-[740px] text-left">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
              Our Story
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-1 leading-tight mb-8 font-display"
            >
              Your complete digital growth and automation partner
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-5 text-sm sm:text-base text-ink-2 leading-relaxed font-semibold"
            >
              <p>
                Trinetra Digital Solution was founded with a clear purpose: to help Indian businesses — especially local businesses, service providers and SMBs — establish a strong digital presence, manage customer inquiries more effectively and operate more efficiently through the right technology.
              </p>
              <p>
                Most businesses we worked with were running on spreadsheets, unorganized chat logs and missed callbacks. They had no professional website, no structured follow-up system, no online visibility and no software to manage their operations. They were hardworking but lacked the digital foundation to grow.
              </p>
              <p>
                We built Trinetra to change that. Starting in Gorakhpur, Uttar Pradesh, we began helping local businesses build professional websites, set up CRM systems, run local SEO campaigns and automate their customer communication workflows — all under one roof with transparent processes.
              </p>
              <p>
                Today, we serve startups, local businesses, clinics, coaching institutes, real estate agencies, salons, restaurants and growing companies across India — helping them build a stronger digital presence, manage their operations better and serve their customers more effectively.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-transparent py-24 md:py-32 border-b border-white/5" aria-label="Our Values">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10">
          <div className="text-center mb-16 space-y-3">
            <span className="mixed-headline-eyebrow">What We Stand For</span>
            <h2 className="display-lg text-ink-1 tracking-tight mt-2 max-w-[520px] mx-auto font-display font-bold">
              Principles that guide every project we deliver
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {VALUES.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col gap-4 glass-panel border-white/5 rounded-2xl p-6 text-left hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] transition-all duration-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-accent border border-white/5 shadow-xs">
                  {v.icon}
                </div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">{v.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-transparent py-16 border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10">
          <div className="grid gap-6 md:grid-cols-3 text-center max-w-4xl mx-auto">
            {[
              { value: "2", label: "Verified Projects", sub: "Vaastu Infra & Akuafi" },
              { value: "5+", label: "Services Offered", sub: "Website, SEO, Social, CRM, Software" },
              { value: "Gorakhpur", label: "Based In", sub: "Uttar Pradesh, India" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-6 border-white/5 last:border-r-0 md:border-r border-b md:border-b-0 pb-8 last:pb-6 md:pb-6">
                <span className="font-display text-[52px] leading-none text-white font-semibold mb-2.5 tracking-tight">
                  {/^\d/.test(s.value) ? (
                    <>
                      <MetricCounter value={s.value.replace(/[^0-9.]/g, '') || '0'} />
                      {s.value.replace(/[0-9.]/g, '')}
                    </>
                  ) : (
                    s.value
                  )}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono mb-1.5">{s.label}</span>
                {"sub" in s && <span className="text-[10.5px] text-ink-3 font-semibold font-mono">{(s as {sub: string}).sub}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-transparent py-24">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 text-center">
          <h2 className="display-lg text-white tracking-tight mb-4 font-display font-bold">Ready to grow your business?</h2>
          <p className="body-md text-ink-2 mb-8 max-w-[480px] mx-auto font-medium">
            Book a free consultation and see exactly how Trinetra can help build your online presence, manage your operations and grow your business systematically.
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link to="/contact" className="btn-primary-forest h-11 px-6 rounded-lg flex items-center justify-center gap-2 bg-cta text-[#101415] hover:bg-cta-hover glow-hover transition-colors font-semibold shadow-2xl text-xs uppercase tracking-wider cursor-pointer">
              Book Free Consultation <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="inline-flex items-center justify-center h-11 px-6 border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors font-semibold rounded-lg text-xs uppercase tracking-wider cursor-pointer shadow-2xl">
              Explore Our Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
