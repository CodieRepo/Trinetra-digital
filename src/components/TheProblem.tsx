import { AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const PROBLEMS = [
  {
    title: "No structured digital presence",
    description: "Businesses lose potential customers daily by lacking a professional website, consistent social media or local search visibility. First impressions are digital.",
    icon: <AlertTriangle size={20} />,
  },
  {
    title: "Inquiries without a follow-up system",
    description: "Leads arrive through WhatsApp, calls or forms — but without a CRM or automation, follow-ups are missed and opportunities go cold.",
    icon: <Clock size={20} />,
  },
  {
    title: "Operations running on guesswork",
    description: "Without dashboards, reports or organized workflows, business owners struggle to track performance, manage teams or make data-informed decisions.",
    icon: <BarChart3 size={20} />,
  },
];

export default function TheProblem() {
  return (
    <section className="relative overflow-hidden bg-[#F9F8F5] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mixed-headline-eyebrow"
          >
            The Current Situation
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight max-w-[720px] mx-auto mb-4"
          >
            Operating without structured digital systems quietly holds your business back.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] max-w-[540px] mx-auto"
          >
            Every missed inquiry. Every forgotten follow-up. Every customer who didn't find you online. It adds up to lost opportunities and stalled growth.
          </motion.p>
        </div>

        {/* 3 Grid Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PROBLEMS.map((prob, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="premium-card flex flex-col items-start"
            >
              {/* Icon Container with Warning colors */}
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF0E5] text-[#B5600A]">
                {prob.icon}
              </div>

              {/* Title */}
              <h3 className="heading-sm text-[#18170F] mb-3">{prob.title}</h3>

              {/* Description */}
              <p className="body-sm text-[#5C5A52] leading-relaxed">
                {prob.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
