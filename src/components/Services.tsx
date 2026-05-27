import { motion } from "framer-motion";
import { Activity, Home, GraduationCap, Sun, ShoppingBag, ArrowRight } from "lucide-react";

const INDUSTRIES = [
  {
    title: "Healthcare",
    description: "Automate patient OPD booking, dispatch reports instantly on chat, send appointment reminders, and handle patient feedback follow-ups seamlessly.",
    icon: <Activity size={20} />,
    link: "See Healthcare",
  },
  {
    title: "Real Estate",
    description: "Qualify high-value buyers, gather budget and locality match data, schedule site visits automatically, and nurture leads with media packages.",
    icon: <Home size={20} />,
    link: "See Real Estate",
  },
  {
    title: "Coaching",
    description: "Manage high inbound program interest, capture student records, distribute syllabus assets automatically, and schedule admissions slots.",
    icon: <GraduationCap size={20} />,
    link: "See Coaching",
  },
  {
    title: "Solar",
    description: "Collect geographic details and roof metrics, compute estimated cost savings, qualify grid capacities, and schedule engineering site surveys.",
    icon: <Sun size={20} />,
    link: "See Solar",
  },
  {
    title: "Local Business",
    description: "Reply immediately to Google/Instagram map leads, share operating hours and catalogues, automate customer support, and collect review ratings.",
    icon: <ShoppingBag size={20} />,
    link: "See Local Business",
  },
];

export default function Services() {
  return (
    <section id="industries" className="relative overflow-hidden bg-[#F4F2ED] py-20 md:py-28 border-b border-[#E2DDD5]">
      <div className="main-container relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            className="mixed-headline-eyebrow"
          >
            Built for Your Industry
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight mb-4"
          >
            Every business is different. <br />Your automation should be too.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] max-w-[540px] mx-auto"
          >
            Custom workflows and context NLP designed specifically around your operational structure, products, and target client dynamics.
          </motion.p>
        </div>

        {/* 5 Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative flex flex-col justify-between items-start rounded-xl border border-[#E2DDD5] bg-[#FFFFFF] p-8 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden"
              style={{ minHeight: "260px" }}
            >
              {/* Animated 3px copper border at the top, shown on hover only */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              <div className="w-full text-left">
                {/* Icon container */}
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F2E8DC] text-[#BF7340] transition-colors duration-300">
                  {ind.icon}
                </div>

                {/* Title */}
                <h3 className="heading-sm text-[#18170F] mb-3">{ind.title}</h3>

                {/* Description */}
                <p className="body-sm text-[#5C5A52] leading-relaxed">
                  {ind.description}
                </p>
              </div>

              {/* Small Ghost button at bottom */}
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#8C8A82] group-hover:text-[#BF7340] transition-colors duration-200">
                <span>{ind.link}</span>
                <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </motion.div>
          ))}
          
          {/* Accent-styled CTA Card at the end of the grid to keep it visually balanced */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col justify-center items-center rounded-xl border border-dashed border-[#E2DDD5] p-8 text-center bg-[#F4F2ED]"
            style={{ minHeight: "260px" }}
          >
            <p className="text-sm font-semibold text-[#18170F] mb-1 font-interface">Don't see your sector?</p>
            <p className="text-xs text-[#5C5A52] max-w-[200px] mb-4">We construct bespoke systems for any custom business workflow.</p>
            <a
              href="#contact"
              className="text-xs font-bold text-[#BF7340] hover:text-[#A6612E] animated-underline-link"
            >
              Consult with our Architect →
            </a>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
