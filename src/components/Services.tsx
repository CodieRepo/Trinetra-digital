
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

const SERVICES = [
  {
    title: "WhatsApp Automation",
    description: "Intelligent conversation flows, automated reminders, and re-engagement sequences that work 24/7.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    tag: "Messaging",
  },
  {
    title: "AI CRM Systems",
    description: "Unified lead intelligence with auto-scoring, stage-based automation, and real-time pipeline tracking.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
        <path d="M7 8h2M7 11h10M13 8h4" strokeLinecap="round" />
      </svg>
    ),
    tag: "CRM",
  },
  {
    title: "AI Chatbots",
    description: "Context-aware assistants that qualify leads, respond intelligently, and hand over with full context.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" strokeLinecap="round" />
        <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" />
      </svg>
    ),
    tag: "AI",
  },
  {
    title: "AI Sales Systems",
    description: "Pipeline acceleration with AI-powered follow-ups, objection handling, and intelligent conversion nudges.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16 7 22 7 22 13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    tag: "Sales",
  },
  {
    title: "Lead Automation",
    description: "Capture, enrich, route, and nurture inbound demand from Instagram, Facebook, and web forms — automatically.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    tag: "Leads",
  },
  {
    title: "Custom SaaS",
    description: "Purpose-built software systems designed precisely for your business model, team, and growth trajectory.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 17.5h7M17.5 14v7" strokeLinecap="round" />
      </svg>
    ),
    tag: "Platform",
  },
  {
    title: "Workflow Automation",
    description: "Cross-team process orchestration from operations and marketing to post-sales and client delivery.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      </svg>
    ),
    tag: "Ops",
  },
];

function ServiceCard({ service, index }: { service: typeof SERVICES[0]; index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 22 });
  const rotateX = useTransform(springY, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-6deg", "6deg"]);

  const glowX = useTransform(springX, [-0.5, 0.5], ["0%", "100%"]);
  const glowY = useTransform(springY, [-0.5, 0.5], ["0%", "100%"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mouseX.set(0); mouseY.set(0); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="group relative h-full cursor-default overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-px"
        data-hover
      >
        {/* Dynamic glow on hover */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`radial-gradient(280px circle at ${glowX} ${glowY}, rgba(34,211,238,0.12), transparent 70%)`,
          }}
        />
        {/* Shimmer border */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div className="absolute inset-x-0 top-0 h-px shimmer-border" />
        </div>

        <div className="relative h-full rounded-2xl p-6">
          {/* Icon */}
          <motion.div
            whileHover={{ scale: 1.12, rotate: 5 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 group-hover:bg-cyan-400/18 transition-colors duration-300"
          >
            {service.icon}
          </motion.div>

          {/* Tag */}
          <p className="mb-3 text-[10px] font-medium tracking-[0.2em] text-cyan-400/70">{service.tag}</p>

          {/* Title */}
          <h3 className="text-[15px] font-semibold text-white">{service.title}</h3>

          {/* Description */}
          <p className="mt-2.5 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
            {service.description}
          </p>

          {/* Arrow */}
          <div className="mt-5 flex items-center gap-1.5 text-xs text-slate-500 transition-all duration-300 group-hover:text-cyan-300 group-hover:gap-2.5">
            <span>Learn more</span>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Services() {
  return (
    <section id="services" className="relative overflow-hidden py-28">
      {/* Subtle section divider */}
      <div className="mx-auto mb-20 max-w-7xl px-6 md:px-10">
        <div className="section-line mb-20" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center"
        >
          <p className="mb-3 text-xs tracking-[0.25em] text-cyan-400/80">WHAT WE BUILD</p>
          <h2 className="mx-auto max-w-3xl text-3xl font-medium tracking-tight text-white md:text-5xl">
            Automation Services
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
            Built to remove bottlenecks, increase conversion speed, and scale customer operations with intelligence.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SERVICES.map((service, i) => (
            <ServiceCard key={service.title} service={service} index={i} />
          ))}
          {/* Filler CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: 0.49, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-6 text-center"
          >
            <p className="mb-2 text-sm text-slate-400">Need something custom?</p>
            <a
              href="#contact"
              data-hover
              className="mt-1 text-sm font-medium text-cyan-300 underline-offset-4 hover:underline"
            >
              Let's talk →
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
