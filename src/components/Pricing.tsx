
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const TIERS = [
  {
    plan: "Launch",
    fee: "₹7,999",
    feeLabel: "setup",
    recurring: "₹1,499 / month",
    description: "Perfect starting point for early-stage businesses ready to automate lead capture and WhatsApp responses.",
    features: [
      "WhatsApp automation setup",
      "Lead capture forms",
      "Basic AI responses",
      "CRM integration",
      "Email support",
    ],
    highlight: false,
    badge: null,
  },
  {
    plan: "Growth",
    fee: "₹14,999",
    feeLabel: "setup",
    recurring: "₹3,999 / month",
    description: "Advanced CRM and automation system for scaling teams who need intelligent qualification and pipeline management.",
    features: [
      "Full CRM system",
      "AI lead qualification",
      "WhatsApp sequences",
      "Sales pipeline automation",
      "Analytics dashboard",
      "Priority support",
    ],
    highlight: true,
    badge: "Most Popular",
  },
  {
    plan: "AI Sales System",
    fee: "₹29,999 – ₹75,000",
    feeLabel: "one-time",
    recurring: "System build",
    description: "End-to-end AI sales qualification and conversion engine for businesses serious about scaled revenue.",
    features: [
      "Custom AI qualifier",
      "Multi-channel automation",
      "Advanced CRM workflows",
      "Sales intelligence",
      "Conversion analytics",
      "Dedicated onboarding",
    ],
    highlight: false,
    badge: null,
  },
  {
    plan: "Custom CRM / SaaS",
    fee: "₹50k – ₹3L+",
    feeLabel: "project",
    recurring: "Scope-based",
    description: "Enterprise-ready custom platforms, white-label SaaS, and full business workflow software built for your model.",
    features: [
      "Custom-built platform",
      "White-label ready",
      "API integrations",
      "Dedicated infrastructure",
      "SLA + maintenance",
      "Strategic partnership",
    ],
    highlight: false,
    badge: "Enterprise",
  },
];

function PricingCard({ tier, index }: { tier: typeof TIERS[0]; index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const sx = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const sy = useSpring(mouseY, { stiffness: 120, damping: 20 });
  const rX = useTransform(sy, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rY = useTransform(sx, [-0.5, 0.5], ["-5deg", "5deg"]);

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
      transition={{ duration: 0.75, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative"
    >
      <motion.div
        style={{ rotateX: rX, rotateY: rY, transformStyle: "preserve-3d" }}
        className={`group relative h-full rounded-2xl p-px transition-shadow duration-500 ${
          tier.highlight
            ? "shadow-[0_0_60px_rgba(34,211,238,0.18)] hover:shadow-[0_0_80px_rgba(34,211,238,0.28)]"
            : "hover:shadow-[0_0_40px_rgba(34,211,238,0.1)]"
        }`}
      >
        {/* Border */}
        <div
          className={`absolute inset-0 rounded-2xl ${
            tier.highlight
              ? "bg-gradient-to-b from-cyan-400/50 via-cyan-400/20 to-transparent"
              : "bg-gradient-to-b from-white/12 to-white/4"
          }`}
        />
        {tier.highlight && (
          <div className="absolute inset-x-0 top-0 h-px shimmer-border rounded-t-2xl" />
        )}

        <div
          className={`relative h-full rounded-2xl p-6 ${
            tier.highlight ? "bg-[#0d1f30]" : "bg-[#0a1018]"
          }`}
        >
          {/* Badge */}
          {tier.badge && (
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-[10px] font-medium tracking-wider ${
              tier.highlight
                ? "border border-cyan-400/30 bg-cyan-400/12 text-cyan-300"
                : "border border-white/15 bg-white/8 text-slate-300"
            }`}>
              {tier.badge}
            </div>
          )}

          {/* Plan name */}
          <p className="text-sm font-medium text-slate-400">{tier.plan}</p>

          {/* Price */}
          <div className="mt-3 flex items-end gap-1.5">
            <p className="text-3xl font-semibold text-white">{tier.fee}</p>
            <p className="mb-1 text-sm text-slate-500">{tier.feeLabel}</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">{tier.recurring}</p>

          {/* Description */}
          <p className="mt-4 text-sm leading-relaxed text-slate-400">{tier.description}</p>

          {/* Divider */}
          <div className="my-5 h-px bg-white/8" />

          {/* Features */}
          <ul className="space-y-2.5">
            {tier.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-xs text-slate-300">
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-cyan-400">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href="#contact"
            data-hover
            className={`mt-7 flex w-full items-center justify-center rounded-full py-2.5 text-sm font-semibold transition-all duration-300 ${
              tier.highlight
                ? "bg-cyan-300 text-slate-900 hover:bg-cyan-200"
                : "border border-white/15 text-slate-200 hover:border-cyan-400/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            Get started
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden border-y border-white/8 bg-[#040810] py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(34,211,238,0.05),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center"
        >
          <p className="mb-3 text-xs tracking-[0.25em] text-cyan-400/80">TRANSPARENT PRICING</p>
          <h2 className="mx-auto max-w-3xl text-3xl font-medium tracking-tight text-white md:text-5xl">
            Built for Every Stage of Growth
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
            Designed for high-leverage implementation with clear value and scalable automation depth.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((tier, i) => (
            <PricingCard key={tier.plan} tier={tier} index={i} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 text-center text-xs text-slate-600"
        >
          All plans include onboarding support. Custom enterprise pricing available on request.
        </motion.p>
      </div>
    </section>
  );
}
