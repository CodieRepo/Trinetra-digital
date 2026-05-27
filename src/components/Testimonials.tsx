import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TESTIMONIALS = [
  {
    quote: "Their WhatsApp CRM flow reduced our lead response time from 3 hours to under 3 minutes. The AI qualification alone saved us 2 hours a day.",
    name: "Arjun Malhotra",
    role: "Founder",
    company: "B2C Education Brand",
    metric: "60× faster response",
  },
  {
    quote: "We replaced 5 manual tools with one intelligent pipeline. The sales team now focuses entirely on closing — everything else is automated.",
    name: "Neha Shah",
    role: "Director of Growth",
    company: "Marketing Consultancy",
    metric: "5 tools replaced",
  },
  {
    quote: "The custom workflow system gave us end-to-end visibility and automation we couldn't achieve with any off-the-shelf CRM. Truly custom-built.",
    name: "Rohit Sinha",
    role: "COO",
    company: "Real Estate Advisory",
    metric: "100% custom system",
  },
  {
    quote: "Within 30 days of launch, our Instagram leads were fully automated — qualified, followed up, and handed off without any manual intervention.",
    name: "Divya Rao",
    role: "CEO",
    company: "D2C Lifestyle Brand",
    metric: "30-day full launch",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section id="testimonials" className="relative overflow-hidden py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(34,211,238,0.04),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <div className="section-line mb-16" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center"
        >
          <p className="mb-3 text-xs tracking-[0.25em] text-cyan-400/80">CLIENT OUTCOMES</p>
          <h2 className="mx-auto max-w-3xl text-3xl font-medium tracking-tight text-white md:text-5xl">
            Businesses That Moved Fast
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
            Built with long-term reliability, conversion focus, and premium delivery standards.
          </p>
        </motion.div>

        {/* Featured testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c1825]/90 to-[#070e1a]/90 p-px"
        >
          <div className="relative rounded-3xl p-8 md:p-12">
            <div className="absolute inset-x-0 top-0 h-px shimmer-border rounded-t-3xl opacity-50" />

            <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
              {/* Quote */}
              <div>
                <svg viewBox="0 0 40 32" className="mb-6 h-8 w-8 text-cyan-400/40" fill="currentColor">
                  <path d="M0 32V20C0 8.533 6.4 2.133 19.2 0l2.4 4.8C16 6.4 13.067 10.133 12 16h8v16H0zm20 0V20C20 8.533 26.4 2.133 39.2 0l2.4 4.8C36 6.4 33.067 10.133 32 16h8v16H20z" />
                </svg>

                <AnimatePresence mode="wait">
                  <motion.blockquote
                    key={active}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="text-xl font-light leading-relaxed text-white md:text-2xl"
                  >
                    "{TESTIMONIALS[active].quote}"
                  </motion.blockquote>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${active}-meta`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mt-8 flex items-center gap-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm font-semibold text-cyan-300">
                      {TESTIMONIALS[active].name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{TESTIMONIALS[active].name}</p>
                      <p className="text-xs text-slate-400">{TESTIMONIALS[active].role} · {TESTIMONIALS[active].company}</p>
                    </div>
                    <div className="ml-auto rounded-full border border-emerald-400/25 bg-emerald-400/8 px-4 py-1.5 text-xs font-medium text-emerald-300">
                      {TESTIMONIALS[active].metric}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Dots */}
                <div className="mt-8 flex gap-2">
                  {TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      data-hover
                      className={`h-1.5 rounded-full transition-all duration-400 ${
                        i === active ? "w-8 bg-cyan-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Side cards */}
              <div className="space-y-3">
                {TESTIMONIALS.map((t, i) => (
                  <motion.button
                    key={t.name}
                    onClick={() => setActive(i)}
                    data-hover
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`w-full rounded-xl border p-4 text-left transition-all duration-300 ${
                      i === active
                        ? "border-cyan-400/35 bg-cyan-400/8"
                        : "border-white/8 bg-white/3 hover:border-white/15"
                    }`}
                  >
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{t.role} · {t.company}</p>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                      "{t.quote}"
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
