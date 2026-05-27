import { motion } from "framer-motion";
import { Link2, Settings, Landmark, ArrowRight, ArrowDown } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Connect",
    description: "Connect your existing WhatsApp number to the Trinetra pipeline. No coding, server setup, or high technical knowledge needed on your end.",
    icon: <Link2 size={22} />,
  },
  {
    num: "02",
    title: "Configure",
    description: "We map your exact business flows, train the AI qualifier with your documents, and construct the CRM pipeline. Live in 7 days.",
    icon: <Settings size={22} />,
  },
  {
    num: "03",
    title: "Convert",
    description: "Leads flow in, AI qualifies and nurtures them automatically, and your sales team focuses entirely on closing ready bookings.",
    icon: <Landmark size={22} />,
  },
];

export default function Workflow() {
  return (
    <section id="process" className="relative overflow-hidden bg-[#F9F8F5] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mixed-headline-eyebrow"
          >
            The Process
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight mb-4"
          >
            Live in 7 days. Running forever.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] max-w-[540px] mx-auto"
          >
            We take care of the architecture and training so your operational nervous system triggers results starting from Day 1.
          </motion.p>
        </div>

        {/* 3 Step Process List */}
        <div className="relative grid gap-8 lg:grid-cols-3 lg:items-start lg:gap-12">
          
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative flex flex-col items-start bg-[#F4F2ED] border border-[#E2DDD5] rounded-xl p-8 shadow-xs hover:border-[#BF7340]/25 transition-all duration-300"
            >
              {/* Step Index Number */}
              <span className="absolute top-4 right-6 font-display text-[56px] leading-none text-[#BF7340] opacity-15 select-none pointer-events-none font-semibold">
                {step.num}
              </span>

              {/* Icon Container with Primary Green style */}
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F0ED] text-[#2A4A3E] border border-[#2A4A3E]/10">
                {step.icon}
              </div>

              {/* Title */}
              <h3 className="heading-md text-[#18170F] mb-3">{step.title}</h3>

              {/* Description */}
              <p className="body-sm text-[#5C5A52] leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
          
        </div>

      </div>
    </section>
  );
}
