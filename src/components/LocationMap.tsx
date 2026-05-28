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
      className="relative w-full overflow-hidden rounded-xl bg-[#EEEAE3]"
      style={{ aspectRatio: "16/9", minHeight: "260px" }}
      aria-label="Google Maps showing Trinetra Digital Solution location in Gorakhpur"
    >
      {/* Placeholder skeleton while not loaded */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2E8DC] text-[#BF7340]">
            <MapPin size={20} />
          </div>
          <p className="text-xs font-semibold text-[#5C5A52]">Loading map…</p>
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
    iconBg: "bg-[#F2E8DC] text-[#BF7340]",
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
    iconBg: "bg-[#E8F0ED] text-[#2A4A3E]",
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
    iconBg: "bg-[#F2E8DC] text-[#BF7340]",
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
    iconBg: "bg-[#EEEAE3] text-[#5C5A52]",
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
    iconBg: "bg-[#EEEAE3] text-[#5C5A52]",
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
      className={`relative bg-[#F4F2ED] ${isMini ? "py-14" : "py-20 md:py-28"} border-b border-[#E2DDD5]`}
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
              className="display-lg text-[#18170F] tracking-tight mb-4"
            >
              We're based in Gorakhpur,<br />
              <span className="italic text-[#BF7340]">serving India remotely.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.2 }}
              className="body-lg text-[#5C5A52] max-w-[540px] mx-auto"
            >
              Trinetra Digital Solution is headquartered in Gorakhpur, UP. We provide AI automation, WhatsApp CRM, and digital marketing services to businesses across India through remote delivery.
            </motion.p>
          </div>
        )}

        {isMini && (
          <div className="mb-8">
            <span className="mixed-headline-eyebrow">Our Location</span>
            <h2 className="display-md text-[#18170F] tracking-tight">
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
            {/* Map Shell */}
            <div className="rounded-2xl border border-[#E2DDD5] bg-white p-2 shadow-sm overflow-hidden">
              <LazyMap />

              {/* Map Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 pt-2.5">
                <a
                  href={MAPS_DIRECTIONS}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="map-get-directions"
                  aria-label="Get directions to Trinetra Digital Solution on Google Maps"
                  className="flex flex-1 items-center justify-center gap-2 h-10 rounded-lg bg-[#2A4A3E] text-[#F9F8F5] text-xs font-bold uppercase tracking-wider hover:bg-[#1E3630] transition-colors"
                >
                  <Navigation size={13} /> Get Directions
                </a>
                <a
                  href={MAPS_OPEN}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="map-open-google-maps"
                  aria-label="Open Trinetra Digital Solution in Google Maps"
                  className="flex flex-1 items-center justify-center gap-2 h-10 rounded-lg border border-[#E2DDD5] bg-[#F4F2ED] text-xs font-semibold text-[#18170F] hover:bg-[#EEEAE3] transition-colors"
                >
                  <ExternalLink size={13} /> Open in Google Maps
                </a>
              </div>
            </div>

            {/* Serve radius label */}
            <div className="flex items-start gap-3 px-1">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#BF7340]/10 text-[#BF7340] mt-0.5">
                <MapPin size={11} />
              </div>
              <p className="text-xs text-[#5C5A52] leading-relaxed">
                <strong className="text-[#18170F]">AI Automation · CRM Solutions · WhatsApp Automation · Digital Marketing</strong>
                {" "}— serving businesses across{" "}
                <span className="font-semibold text-[#BF7340]">Gorakhpur, Lucknow, Varanasi, Kanpur</span> and all of India via remote delivery.
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
                    className="group flex items-start gap-4 p-4 bg-white border border-[#E2DDD5] rounded-xl hover:border-[#BF7340]/30 hover:shadow-sm transition-all duration-200"
                    aria-label={card.label}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C8A82] mb-0.5">{card.label}</p>
                      <p className="text-sm font-semibold text-[#18170F] truncate">{card.primary}</p>
                      <p className="text-xs text-[#5C5A52]">{card.secondary}</p>
                      {card.cta && (
                        <p className="text-[10.5px] font-bold text-[#BF7340] mt-1.5 group-hover:underline flex items-center gap-1">
                          {card.cta} <ArrowRight size={10} />
                        </p>
                      )}
                    </div>
                  </a>
                ) : (
                  <div className="flex items-start gap-4 p-4 bg-white border border-[#E2DDD5] rounded-xl">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C8A82] mb-0.5">{card.label}</p>
                      <p className="text-sm font-semibold text-[#18170F]">{card.primary}</p>
                      <p className="text-xs text-[#5C5A52]">{card.secondary}</p>
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
              className="flex items-center justify-center gap-3 h-12 rounded-xl bg-[#131210] text-[#F9F8F5] text-xs font-bold uppercase tracking-wider border border-[#131210]/10 hover:bg-[#18170F] transition-colors mt-1"
            >
              <MessageCircle size={16} className="fill-[#F9F8F5]/10" />
              WhatsApp for a Free Demo
              <ArrowRight size={13} />
            </motion.a>

            <p className="text-center text-[10.5px] text-[#8C8A82] font-medium">
              📍 Gorakhpur, UP · Serving all of India
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
