import { AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const PROBLEMS = [
  {
    title: "Leads fall through cracks",
    description: "Replying manually to 50+ customer messages a day with no system. Valuable enquiries get buried under old chats.",
    icon: <AlertTriangle size={20} />,
  },
  {
    title: "No follow-up system",
    description: "Hot leads go cold in 24 hours without structured, timely follow-up. Human teams simply run out of hours.",
    icon: <Clock size={20} />,
  },
  {
    title: "Zero visibility into pipelines",
    description: "You don't know which message, representative, or campaign converts. Operations run on guesswork rather than clean data.",
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
            Managing leads on WhatsApp manually is quietly costing you.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] max-w-[540px] mx-auto"
          >
            Every missed reply. Every forgotten follow-up. Every lead that went cold. It adds up to lost revenue.
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
