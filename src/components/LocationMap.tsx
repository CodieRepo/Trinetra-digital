import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, MessageCircle, Mail, Clock, ExternalLink, Navigation, ArrowRight } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────
const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'd like to learn about Trinetra Digital Solution's AI automation services.")}`;

// Exact GBP coords: 26.7606, 83.3732
const MAPS_EMBED = "https://maps.google.com/maps?q=26.7606,83.3732&t=&z=15&ie=UTF8&iwloc=&output=embed";
const MAPS_DIRECTIONS = "https://www.google.com/maps/dir/?api=1&destination=26.7606,83.3732";
const MAPS_OPEN = "https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8";

// ── Lazy-load map iframe on scroll-into-view ───────────────────────────────
function LazyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoaded(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl bg-slate-100"
      style={{ aspectRatio: "16/9", minHeight: "260px" }}
      aria-label="Google Maps showing Trinetra Digital Solution location in Gorakhpur"
    >
      {/* Placeholder skeleton while not loaded */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light text-accent">
            <MapPin size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-500">Loading map…</p>
        </div>
      )}
      {/* Lazy-loaded Google Maps iframe */}
      {loaded && (
        <iframe
          src={MAPS_EMBED}
          width="100%"
          height="100%"
          style={{ border: 0, position: "absolute", inset: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Trinetra Digital Solution — Gorakhpur, Uttar Pradesh"
        />
      )}
    </div>
  );
}

// ── Contact Info Cards ────────────────────────────────────────────────────
const INFO_CARDS = [
  {
    id: "location",
    icon: <MapPin size={18} />,
    iconBg: "bg-accent-light text-accent",
    label: "Office Location",
    primary: "Gorakhpur, Uttar Pradesh",
    secondary: "India — 273001",
    href: MAPS_OPEN,
    cta: "Open in Google Maps",
    external: true,
  },
  {
    id: "whatsapp",
    icon: <MessageCircle size={18} />,
    iconBg: "bg-emerald-50 text-emerald-700",
    label: "WhatsApp (Fastest)",
    primary: PHONE_NUMBER,
    secondary: "Usually replies within 15 min",
    href: WA_URL,
    cta: "Start WhatsApp Chat",
    external: true,
  },
  {
    id: "phone",
    icon: <Phone size={18} />,
    iconBg: "bg-accent-light text-accent",
    label: "Phone",
    primary: PHONE_NUMBER,
    secondary: "Mon–Sat, 9 AM – 7 PM IST",
    href: PHONE_TEL,
    cta: "Call Now",
    external: false,
  },
  {
    id: "email",
    icon: <Mail size={18} />,
    iconBg: "bg-slate-100 text-slate-650",
    label: "Email",
    primary: EMAIL,
    secondary: "We respond within 12 hours",
    href: `mailto:${EMAIL}`,
    cta: "Send Email",
    external: false,
  },
  {
    id: "hours",
    icon: <Clock size={18} />,
    iconBg: "bg-slate-100 text-slate-650",
    label: "Working Hours",
    primary: "Mon – Saturday",
    secondary: "9:00 AM – 7:00 PM IST",
    href: null,
    cta: null,
    external: false,
  },
];

// ── Variant prop: "full" (Contact page) | "mini" (Gorakhpur/sidebar) ─────
interface LocationMapProps {
  variant?: "full" | "mini";
  showForm?: boolean;
}

export default function LocationMap({ variant = "full" }: LocationMapProps) {
  const isMini = variant === "mini";

  return (
    <section
      id="location"
      aria-label="Trinetra Digital Solution office location — Gorakhpur, UP"
      className={`relative bg-surface-2 ${isMini ? "py-14" : "py-20 md:py-28"} border-b border-border`}
      itemScope
      itemType="https://schema.org/LocalBusiness"
    >
      {/* Hidden SEO microdata — crawlable by Googlebot */}
      <span itemProp="name" className="sr-only">Trinetra Digital Solution</span>
      <span itemProp="telephone" className="sr-only">{PHONE_NUMBER}</span>
      <span itemProp="email" className="sr-only">{EMAIL}</span>
      <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress" className="sr-only">
        <span itemProp="addressLocality">Gorakhpur</span>
        <span itemProp="addressRegion">Uttar Pradesh</span>
        <span itemProp="postalCode">273001</span>
        <span itemProp="addressCountry">IN</span>
      </div>
      <div itemProp="geo" itemScope itemType="https://schema.org/GeoCoordinates" className="sr-only">
        <span itemProp="latitude">26.7606</span>
        <span itemProp="longitude">83.3732</span>
      </div>
      <link itemProp="url" href="https://trinetradigitalsolution.com/" />
      <link itemProp="sameAs" href={MAPS_OPEN} />

      <div className="main-container">

        {/* ── Header ─────────────────────────────────────────────────── */}
        {!isMini && (
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              className="mixed-headline-eyebrow"
            >
              Visit Our Office
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.1 }}
              className="display-lg text-ink-1 tracking-tight mb-4 font-display font-bold"
            >
              We're based in Gorakhpur,<br />
              <span className="text-accent font-semibold">serving India remotely.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.2 }}
              className="body-lg text-ink-2 max-w-[540px] mx-auto font-medium"
            >
              Trinetra Digital Solution is headquartered in Gorakhpur, UP. We provide AI automation, WhatsApp CRM, and digital marketing services to businesses across India through remote delivery.
            </motion.p>
          </div>
        )}

        {isMini && (
          <div className="mb-8">
            <span className="mixed-headline-eyebrow">Our Location</span>
            <h2 className="display-md text-ink-1 tracking-tight font-display font-bold">
              Based in Gorakhpur, UP
            </h2>
          </div>
        )}

        {/* ── Main Grid: Map + Info ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className={`grid gap-8 ${isMini ? "lg:grid-cols-[1.2fr_0.8fr]" : "lg:grid-cols-[1.3fr_0.7fr]"} lg:items-start`}
        >

          {/* Left: Map Container */}
          <div className="flex flex-col gap-4">
            {/* Elegant Browser Frame Mockup */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm relative w-full hover:border-accent/40 transition-all duration-300 group">
              {/* Browser Header Bar */}
              <div className="bg-slate-50 border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                </div>
                <div className="bg-white border border-slate-200/60 rounded px-4 py-0.5 text-[8px] font-mono text-slate-400 font-semibold tracking-wide">
                  maps.google.com/trinetra-digital
                </div>
                <div className="w-[18px]" /> {/* Balancing spacer */}
              </div>

              <div className="p-2">
                <LazyMap />
              </div>

              {/* Map Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 pt-2.5 border-t border-slate-100">
                <a
                  href={MAPS_DIRECTIONS}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="map-get-directions"
                  aria-label="Get directions to Trinetra Digital Solution on Google Maps"
                  className="flex flex-1 items-center justify-center gap-2 h-10 rounded-lg bg-cta text-white text-xs font-bold uppercase tracking-wider hover:bg-cta-hover transition-colors cursor-pointer"
                >
                  <Navigation size={13} /> Get Directions
                </a>
                <a
                  href={MAPS_OPEN}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="map-open-google-maps"
                  aria-label="Open Trinetra Digital Solution in Google Maps"
                  className="flex flex-1 items-center justify-center gap-2 h-10 rounded-lg border border-border bg-slate-50 text-xs font-semibold text-ink-1 hover:bg-slate-100 transition-colors"
                >
                  <ExternalLink size={13} /> Open in Google Maps
                </a>
              </div>
            </div>

            {/* Serve radius label */}
            <div className="flex items-start gap-3 px-1">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent mt-0.5 border border-accent/15">
                <MapPin size={11} />
              </div>
              <p className="text-xs text-ink-2 leading-relaxed font-semibold">
                <strong className="text-ink-1">AI Automation · CRM Solutions · WhatsApp Automation · Digital Marketing</strong>
                {" "}— serving businesses across{" "}
                <span className="font-semibold text-accent">Gorakhpur, Lucknow, Varanasi, Kanpur</span> and all of India via remote delivery.
              </p>
            </div>
          </div>

          {/* Right: Contact Info Cards */}
          <div className="flex flex-col gap-3">
            {INFO_CARDS.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                {card.href ? (
                  <a
                    href={card.href}
                    target={card.external ? "_blank" : undefined}
                    rel={card.external ? "noopener noreferrer" : undefined}
                    className="group flex items-start gap-4 p-4 bg-white border border-border/80 rounded-xl hover:border-accent/30 hover:shadow-sm transition-all duration-200"
                    aria-label={card.label}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-4 mb-0.5 font-mono">{card.label}</p>
                      <p className="text-sm font-semibold text-ink-1 truncate">{card.primary}</p>
                      <p className="text-xs text-ink-2">{card.secondary}</p>
                      {card.cta && (
                        <p className="text-[10.5px] font-bold text-accent mt-1.5 group-hover:underline flex items-center gap-1">
                          {card.cta} <ArrowRight size={10} />
                        </p>
                      )}
                    </div>
                  </a>
                ) : (
                  <div className="flex items-start gap-4 p-4 bg-white border border-border/80 rounded-xl">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-4 mb-0.5 font-mono">{card.label}</p>
                      <p className="text-sm font-semibold text-ink-1">{card.primary}</p>
                      <p className="text-xs text-ink-2">{card.secondary}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* WhatsApp Primary CTA */}
            <motion.a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              id="location-whatsapp-cta"
              whileHover={{ scale: 1.02, translateY: -1 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.35 }}
              className="flex items-center justify-center gap-3 h-12 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors mt-1 cursor-pointer shadow-sm"
            >
              <MessageCircle size={16} className="fill-white/10" />
              WhatsApp for a Free Demo
              <ArrowRight size={13} />
            </motion.a>

            <p className="text-center text-[10.5px] text-ink-4 font-semibold font-mono">
              📍 Gorakhpur, UP · Serving all of India
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
