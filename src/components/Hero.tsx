import { useMemo, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() > 0.6 ? 2 : 1,
  delay: Math.random() * 6,
  duration: 8 + Math.random() * 10,
  opacity: 0.15 + Math.random() * 0.45,
}));

const FLOAT_CARDS = [
  {
    id: "lead",
    pos: "top-[22%] left-[3%]",
    delay: 0.7,
    content: (
      <div className="flex items-center gap-2.5 text-xs">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <circle cx="8" cy="8" r="8" opacity="0.2" />
            <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <p className="font-medium text-white">New Lead Qualified</p>
          <p className="text-slate-400">Instagram → AI Score: 94</p>
        </div>
        <span className="relative ml-1 flex h-1.5 w-1.5 shrink-0 rounded-full">
          <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </span>
      </div>
    ),
  },
  {
    id: "whatsapp",
    pos: "top-[40%] right-[2%]",
    delay: 1.2,
    content: (
      <div className="text-xs">
        <p className="mb-1.5 font-medium text-white">WhatsApp Message Sent</p>
        <p className="rounded-lg bg-[#25D366]/10 px-2.5 py-1.5 text-[10px] text-slate-300">
          "Hi Priya, your automation demo is ready…"
        </p>
        <p className="mt-1 text-slate-500">Delivered · AI Agent</p>
      </div>
    ),
  },
  {
    id: "pipeline",
    pos: "bottom-[25%] left-[4%]",
    delay: 1.6,
    content: (
      <div className="text-xs">
        <p className="mb-2 font-medium text-slate-300">Pipeline Today</p>
        <div className="space-y-1.5">
          {[["Leads", 47, 0.9], ["Qualified", 29, 0.6], ["Demo", 14, 0.3]].map(([label, n, w]) => (
            <div key={String(label)} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-slate-400">{label}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300/50"
                  style={{ width: `${Number(w) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-cyan-300">{n}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const STATS = [
  { value: "3 min", label: "Avg lead response" },
  { value: "10×", label: "Faster qualification" },
  { value: "60%", label: "Less manual work" },
];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const rawX = useMotionValue(50);
  const rawY = useMotionValue(50);
  const smoothX = useSpring(rawX, { stiffness: 60, damping: 30 });
  const smoothY = useSpring(rawY, { stiffness: 60, damping: 30 });
  const spotlight = useMotionTemplate`radial-gradient(700px circle at ${smoothX}% ${smoothY}%, rgba(34,211,238,0.14), transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width) * 100);
    rawY.set(((e.clientY - r.top) / r.height) * 100);
  };

  const particles = useMemo(() => PARTICLES, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-screen flex-col overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* ── Background Video ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          aria-hidden="true"
        >
          {/* MP4 first — universal browser support */}
          <source src="/HeroNew.mp4" type="video/mp4" />
          <source src="/HeroVideo.mp4" type="video/mp4" />
          {/* MOV fallback for Safari */}
          <source src="/HeroVideoNew.mov" type="video/mp4" />
        </video>
        {/* Dark overlay to ensure readability */}
        <div className="absolute inset-0 bg-[#04070f]/80" />
        {/* Vignette – darken edges, brighten center slightly */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(4,7,15,0.3),rgba(4,7,15,0.85)_100%)]" />
      </div>

      {/* ── Ambient orbs ────────────────────────────── */}
      <div className="ambient-orb absolute -top-40 left-[30%] h-[600px] w-[600px] bg-cyan-500/8 z-0" />
      <div className="ambient-orb ambient-orb-2 absolute top-[40%] -right-20 h-[400px] w-[400px] bg-indigo-600/6 z-0" />

      {/* ── Flat grid overlay ───────────────────────── */}
      <div className="hero-grid absolute inset-0 opacity-30 z-[1]" />

      {/* ── Mouse spotlight ─────────────────────────── */}
      <motion.div style={{ background: spotlight }} className="absolute inset-0 pointer-events-none z-[2]" />

      {/* ── Particles ───────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-cyan-200"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
            }}
            animate={{
              y: [-8, 8, -8],
              opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.4],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Floating notification cards ─────────────── */}
      {FLOAT_CARDS.map((card) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: card.id === "whatsapp" ? 30 : -30, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1.1, delay: card.delay, ease: [0.22, 1, 0.36, 1] }}
          className={`glass-light absolute hidden xl:block ${card.pos} z-20 min-w-[200px] max-w-[240px] rounded-2xl border border-white/10 p-3.5 shadow-2xl`}
          style={{
            animation: `floatY ${6 + Math.random() * 4}s ease-in-out infinite`,
          }}
        >
          {card.content}
        </motion.div>
      ))}

      {/* ── Content ─────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pt-28 pb-16 md:px-10">
        <div className="flex flex-1 flex-col items-center justify-center text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/8 px-4 py-1.5 text-xs tracking-widest text-cyan-300 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            AI AUTOMATION SYSTEMS
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-balance text-5xl font-semibold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-[80px]"
          >
            Stop Losing Leads.{" "}
            <span className="gradient-text">Automate Everything.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-slate-300/90 md:text-xl"
          >
            WhatsApp CRM · AI Sales Systems · Lead Automation · Custom Workflow Solutions.
            <span className="block mt-1 text-slate-400/70 text-sm md:text-base">
              Built for modern businesses that refuse to miss an opportunity.
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <MagneticButton href="#contact" primary>
              Book Free Demo
            </MagneticButton>
            <MagneticButton href={`https://wa.me/919334757759?text=${encodeURIComponent("Hi! I'd like to learn more about your AI automation services.")}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp Us
            </MagneticButton>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.82, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 flex flex-wrap items-stretch justify-center gap-4"
          >
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 backdrop-blur-sm"
              >
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] tracking-wider text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-16 flex flex-col items-center gap-2"
          >
            <p className="text-[10px] tracking-[0.3em] text-slate-500">SCROLL TO EXPLORE</p>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="h-6 w-px bg-gradient-to-b from-cyan-400/60 to-transparent"
            />
          </motion.div>

        </div>
      </div>

      {/* ── Bottom fade ──────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#03060c] to-transparent pointer-events-none z-10" />
    </section>
  );
}

// ── Magnetic button ──────────────────────────────────
function MagneticButton({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 20 });
  const y = useSpring(0, { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.a
      ref={ref}
      href={href}
      data-hover
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-all duration-300 ${
        primary
          ? "bg-cyan-300 text-slate-900 shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:bg-cyan-200 hover:shadow-[0_0_60px_rgba(34,211,238,0.6)]"
          : "border border-white/20 text-white backdrop-blur-sm hover:border-cyan-300/60 hover:bg-white/8"
      }`}
    >
      {children}
    </motion.a>
  );
}
