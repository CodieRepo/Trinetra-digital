import { motion } from "framer-motion";
import { Activity, Home, GraduationCap, Sun, ShoppingBag, ArrowRight } from "lucide-react";

const INDUSTRIES = [
  {
    title: "Healthcare & Clinics",
    description: "Manage patient appointment booking, send appointment reminders, coordinate report dispatch, automate follow-ups and establish a professional digital presence for your clinic or hospital.",
    icon: <Activity size={20} />,
    link: "See Healthcare Solutions",
  },
  {
    title: "Real Estate",
    description: "Capture property inquiry leads, organize buyer data by budget and location preference, automate site visit scheduling and maintain consistent follow-up with potential buyers.",
    icon: <Home size={20} />,
    link: "See Real Estate Solutions",
  },
  {
    title: "Coaching & Education",
    description: "Manage high inbound student inquiries, capture admission records, distribute course materials digitally, automate fee reminders and schedule counselling or demo sessions.",
    icon: <GraduationCap size={20} />,
    link: "See Education Solutions",
  },
  {
    title: "Salons & Gyms",
    description: "Enable online appointment booking, send automated reminders, manage member records and build social media presence to attract and retain local customers consistently.",
    icon: <Sun size={20} />,
    link: "See Wellness Solutions",
  },
  {
    title: "Restaurants & Retail",
    description: "Display your menu or catalogue online, collect pre-orders or reservations, respond to inquiries promptly and manage customer reviews and digital reputation.",
    icon: <ShoppingBag size={20} />,
    link: "See Retail Solutions",
  },
];

export default function Services() {
  return (
    <section id="industries" aria-label="Industries Trinetra Serves — Healthcare, Real Estate, Coaching, Solar, Local Business" className="relative overflow-hidden bg-surface-2 py-20 md:py-28 border-b border-border">

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
            className="display-lg text-ink-1 tracking-tight mb-4"
          >
            We understand your industry. <br />Your solution will too.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-ink-3 max-w-[540px] mx-auto"
          >
            We work with local businesses, service providers, startups and growing companies across industries to build websites, automate processes and strengthen digital presence.
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
              className="group relative flex flex-col justify-between items-start rounded-xl border border-border bg-base p-8 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden"
              style={{ minHeight: "260px" }}
            >
              {/* Animated 3px accent border at the top, shown on hover only */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              <div className="w-full text-left">
                {/* Icon container */}
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent-light text-accent transition-colors duration-300">
                  {ind.icon}
                </div>

                {/* Title */}
                <h3 className="heading-sm text-ink-1 mb-3">{ind.title}</h3>

                {/* Description */}
                <p className="body-sm text-ink-3 leading-relaxed">
                  {ind.description}
                </p>
              </div>

              {/* Small Ghost button at bottom */}
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-ink-4 group-hover:text-accent transition-colors duration-200">
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
            className="flex flex-col justify-center items-center rounded-xl border border-dashed border-border p-8 text-center bg-surface-2"
            style={{ minHeight: "260px" }}
          >
            <p className="text-sm font-semibold text-ink-1 mb-1 font-interface">Don't see your industry?</p>
            <p className="text-xs text-ink-3 max-w-[200px] mb-4">We build tailored digital solutions for any business type and workflow requirement.</p>
            <a
              href="#contact"
              className="text-xs font-bold text-accent hover:text-accent-hover animated-underline-link"
            >
              Book a Free Consultation →
            </a>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
