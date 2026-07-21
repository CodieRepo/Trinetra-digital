import { AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const PROBLEMS = [
  {
    title: "No structured digital presence",
    description: "Businesses lose potential customers daily by lacking a professional website, consistent social media or local search visibility. First impressions are digital.",
    icon: <AlertTriangle size={18} />,
  },
  {
    title: "Inquiries without a follow-up system",
    description: "Leads arrive through WhatsApp, calls or forms — but without a CRM or automation, follow-ups are missed and opportunities go cold.",
    icon: <Clock size={18} />,
  },
  {
    title: "Operations running on guesswork",
    description: "Without dashboards, reports or organized workflows, business owners struggle to track performance, manage teams or make data-informed decisions.",
    icon: <BarChart3 size={18} />,
  },
];

export default function TheProblem() {
  return (
    <section className="relative overflow-hidden bg-transparent py-24 md:py-32 border-b border-white/5">
      <div className="absolute inset-0 grid-pattern opacity-[0.01] pointer-events-none" />
      
      <div className="main-container relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mixed-headline-eyebrow"
          >
            The Current Situation
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.05 }}
            className="display-lg text-ink-1 tracking-tight max-w-[720px] mx-auto mb-4 font-display font-bold"
          >
            Operating without structured digital systems quietly holds your business back.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className="body-lg text-ink-2 max-w-[540px] mx-auto font-medium"
          >
            Every missed inquiry. Every forgotten follow-up. Every customer who didn't find you online. It adds up to lost opportunities and stalled growth.
          </motion.p>
        </div>

        {/* 3 Grid Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PROBLEMS.map((prob, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-panel p-8 rounded-2xl flex flex-col items-start text-left transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-warning/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] group"
            >
              {/* Icon Container with Warning colors */}
              <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-warning-light text-warning border border-warning/10 shadow-xs transition-transform duration-300 group-hover:scale-105">
                {prob.icon}
              </div>

              {/* Title */}
              <h3 className="text-xs font-bold text-ink-1 mb-3 font-mono uppercase tracking-wider group-hover:text-warning transition-colors">{prob.title}</h3>

              {/* Description */}
              <p className="text-[11.5px] text-ink-2 leading-relaxed font-semibold">
                {prob.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
