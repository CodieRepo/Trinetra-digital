
import { motion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";

export default function FinalCTA() {
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const sx = useSpring(mouseX, { stiffness: 50, damping: 25 });
  const sy = useSpring(mouseY, { stiffness: 50, damping: 25 });
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${sx}% ${sy}%, rgba(34,211,238,0.2), transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - r.left) / r.width) * 100);
    mouseY.set(((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-white/10 py-32"
      onMouseMove={handleMouseMove}
    >
      {/* Layers */}
      <div className="absolute inset-0 bg-[#04070f]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(34,211,238,0.12),transparent_60%)]" />
      <motion.div style={{ background: spotlight }} className="absolute inset-0 pointer-events-none" />
      <div className="hero-grid absolute inset-0 opacity-25" />

      {/* Ambient orb */}
      <div className="ambient-orb absolute left-[20%] top-1/2 h-[500px] w-[500px] -translate-y-1/2 bg-cyan-500/8" />
      <div className="ambient-orb ambient-orb-2 absolute right-[15%] top-1/2 h-[350px] w-[350px] -translate-y-1/2 bg-indigo-600/6" />

      <div className="relative mx-auto max-w-4xl px-6 text-center md:px-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-1.5 text-xs tracking-widest text-cyan-300"
        >
          FREE CONSULTATION
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl font-medium leading-[1.15] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          Stop Losing Leads.{" "}
          <span className="gradient-text">Automate Your Business.</span>
        </motion.h2>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.85, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg"
        >
          Build a premium automation stack with WhatsApp CRM, AI sales workflows, and conversion intelligence tailored to your business.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticCTA
            href="mailto:hello@trinetradigital.in"
            primary
          >
            Book Free Consultation
          </MagneticCTA>
          <MagneticCTA href={`https://wa.me/919334757759?text=${encodeURIComponent("Hi! I'd like a free consultation about automating my business.")}`} whatsapp>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </MagneticCTA>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-600"
        >
          {["No lock-in contracts", "Response within 24 hours", "Setup in 7–14 days", "Full onboarding included"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-cyan-500/60">
                <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative mx-auto mt-24 max-w-7xl border-t border-white/8 px-6 pt-10 pb-10 md:px-10">
        <div className="flex flex-col items-center justify-between gap-6 text-xs text-slate-600 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/TrinetraLogo.png" alt="Trinetra Digital Solution logo" className="h-8 w-auto opacity-70 premium-logo" />
            <span>© 2026 Trinetra Digital Solution. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href={`https://wa.me/919334757759`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#25D366]/70 hover:text-[#25D366] transition-colors"
              data-hover
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <a href="#" className="hover:text-slate-400 transition-colors" data-hover>Privacy</a>
            <a href="#" className="hover:text-slate-400 transition-colors" data-hover>Terms</a>
            <a href="mailto:hello@trinetradigital.in" className="hover:text-slate-400 transition-colors" data-hover>
              hello@trinetradigital.in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}


function MagneticCTA({
  href,
  children,
  primary = false,
  whatsapp = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  whatsapp?: boolean;
}) {
  const x = useSpring(0, { stiffness: 200, damping: 20 });
  const y = useSpring(0, { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.35);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  const className = primary
    ? "bg-cyan-300 text-slate-900 shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:bg-cyan-200 hover:shadow-[0_0_60px_rgba(34,211,238,0.55)]"
    : whatsapp
    ? "border border-[#25D366]/50 bg-[#25D366]/15 text-[#25D366] shadow-[0_0_30px_rgba(37,211,102,0.15)] hover:border-[#25D366]/80 hover:bg-[#25D366]/25 hover:shadow-[0_0_50px_rgba(37,211,102,0.3)]"
    : "border border-white/20 text-white hover:border-cyan-300/50 hover:bg-white/5";

  return (
    <motion.a
      href={href}
      data-hover
      target={whatsapp ? "_blank" : undefined}
      rel={whatsapp ? "noopener noreferrer" : undefined}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-all duration-300 ${className}`}
    >
      {children}
    </motion.a>
  );
}

