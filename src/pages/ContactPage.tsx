import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Phone, MessageCircle, Mail, MapPin, Clock, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import SEO from "../components/seo/SEO";
import LocationMap from "../components/LocationMap";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const FORMSPREE_ID = "mbdbqbwy";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'd like to book a free consultation with Trinetra Digital Solution.")}`;

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "url": "https://trinetradigitalsolution.com/contact",
  "name": "Contact Trinetra Digital Solution",
  "description": "Get in touch with Trinetra Digital Solution for website development, SEO, social media management, CRM systems, business automation and custom software services across India.",
  "mainEntity": {
    "@id": "https://trinetradigitalsolution.com/#localbusiness",
    "@type": "LocalBusiness",
    "name": "Trinetra Digital Solution",
    "telephone": "+91-9334757759",
    "email": "info@trinetradigitalsolution.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Gorakhpur",
      "addressRegion": "Uttar Pradesh",
      "postalCode": "273001",
      "addressCountry": "IN",
    },
    "geo": { "@type": "GeoCoordinates", "latitude": 26.7606, "longitude": 83.3732 },
    "sameAs": ["https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8", "https://wa.me/919334757759"],
  },
};

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const presetService = searchParams.get("service") || "";

  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);
  
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      company: formData.get("business") as string,
      service: formData.get("service") as string,
      message: formData.get("message") as string,
      source: "website"
    };

    console.log("🚀 Form submission started. Payload data:", data);

    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const apiEndpoint = isDev ? "http://localhost:5000/api/leads" : "/api/leads";

    try {
      console.log(`📡 Fetching backend lead capture endpoint: ${apiEndpoint}`);
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      console.log("📥 API response status:", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("✅ Lead successfully captured by backend:", responseData);
        setToast({ message: "Lead captured successfully ✓", type: 'success' });
        setTimeout(() => setToast(null), 4000);
        setSucceeded(true);
      } else {
        const errData = await response.json();
        console.error("❌ Backend returned error:", errData);
        throw new Error(errData.error || "Server submission failed");
      }
    } catch (err) {
      console.error("❌ Primary Express backend submission failed:", err);
      
      if (isDev) {
        setError("Local backend submission failed. Check that backend server is running on port 5000 and has SQLite initialized.");
        setToast({ message: "Backend offline. Submission blocked in dev.", type: 'error' });
        setTimeout(() => setToast(null), 4000);
      } else {
        console.warn("⚠️ Production fallback: triggering Formspree...");
        try {
          const formspreeUrl = `https://formspree.io/f/${FORMSPREE_ID}`;
          const fallbackResponse = await fetch(formspreeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(data)
          });

          if (fallbackResponse.ok) {
            console.log("✅ Fallback Formspree submission succeeded.");
            setSucceeded(true);
          } else {
            throw new Error("Formspree submission also failed");
          }
        } catch (fallbackErr) {
          console.error("❌ All submission pathways failed:", fallbackErr);
          setError("Unable to process your message right now. Please reach out to us on WhatsApp directly.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <>
      <SEO
        title="Contact Trinetra Digital Solution — Book a Free Business Consultation"
        description="Get in touch with Trinetra Digital Solution. Book a free consultation for website development, SEO, social media management, CRM systems, business automation or custom software. Based in Gorakhpur, UP — serving businesses across India."
        canonical="https://trinetradigitalsolution.com/contact"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="bg-surface-2 pt-20 pb-16 md:pt-28 md:pb-20 border-b border-border">
        <div className="main-container text-center max-w-[600px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            Get In Touch
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-ink-1 tracking-tight mb-4 mt-2 font-display font-bold"
          >
            Get a free business consultation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-ink-2"
          >
            Tell us about your business — website, digital marketing, automation, CRM or software — and we'll walk you through how we can help, with no obligation.
          </motion.p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="bg-surface-2 py-20 md:py-28" aria-label="Contact Information and Form">
        <div className="main-container grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-start">

          {/* Left: Contact Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-8"
          >
            <div>
              <h2 className="heading-md text-ink-1 mb-6">Reach us directly</h2>
              <div className="flex flex-col gap-5">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-5 bg-white border border-border/80 rounded-xl hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <MessageCircle size={20} className="fill-emerald-600/10" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-1 mb-0.5">WhatsApp (Fastest)</p>
                    <p className="text-sm text-ink-2">Chat with us for an instant reply. Usually within 15 minutes.</p>
                    <p className="text-xs font-semibold text-accent mt-1.5 group-hover:underline">Open WhatsApp →</p>
                  </div>
                </a>

                <a
                  href={PHONE_TEL}
                  className="group flex items-start gap-4 p-5 bg-white border border-border/80 rounded-xl hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-1 mb-0.5">Call Us</p>
                    <p className="text-sm font-semibold text-ink-2">{PHONE_NUMBER}</p>
                    <p className="text-xs text-ink-4 mt-0.5">Mon–Sat, 9 AM – 7 PM IST</p>
                  </div>
                </a>

                <a
                  href={`mailto:${EMAIL}`}
                  className="group flex items-start gap-4 p-5 bg-white border border-border/80 rounded-xl hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-650">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-1 mb-0.5">Email</p>
                    <p className="text-sm text-ink-2">{EMAIL}</p>
                    <p className="text-xs text-ink-4 mt-0.5">We respond within 12 hours</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-3 p-5 bg-white border border-border/80 rounded-xl">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-accent shrink-0" />
                <p className="text-xs font-bold text-ink-1">Gorakhpur, Uttar Pradesh, India</p>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-accent shrink-0" />
                <p className="text-xs text-ink-2">Mon–Sat · 9:00 AM – 7:00 PM IST</p>
              </div>
              <p className="text-xs text-ink-4 pl-7">We serve businesses across all of India remotely.</p>
            </div>

            {/* Legal Entity Notice */}
            <div className="flex flex-col gap-2 p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[11px] font-bold text-ink-1 uppercase tracking-wider font-mono">Legal Entity &amp; Operations</p>
              <p className="text-[11px] leading-relaxed text-ink-2 mb-0">
                <strong>Trinetra Digital Solution</strong> is a brand owned and operated by <strong>Charulata Enterprises</strong>. All official contracts, invoices, payments, and legal transactions are conducted under the registered corporate name <strong>Charulata Enterprises</strong>.
              </p>
            </div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-border/80 rounded-2xl p-8 md:p-10 shadow-xs"
          >
            {succeeded ? (
              /* ── Success State ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-8 gap-4"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle size={32} />
                </div>
                <h2 className="heading-sm text-ink-1">Message sent!</h2>
                <p className="text-sm text-ink-2 max-w-[320px]">
                  Thanks for reaching out. We've captured your details and our team will get back to you with a consultation schedule shortly!
                </p>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 h-10 rounded-lg bg-slate-900 px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-colors"
                >
                  Chat on WhatsApp too
                </a>
              </motion.div>
            ) : (
              /* ── Form ── */
              <>
                <h2 className="heading-sm text-ink-1 mb-2">Tell us about your business</h2>
                <p className="text-xs text-ink-3 mb-8">We'll get back within 2 hours on WhatsApp or email.</p>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                  aria-label="Contact form for Trinetra Digital Solution"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-name" className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Full Name *</label>
                      <input
                        id="contact-name"
                        type="text"
                        name="name"
                        required
                        autoComplete="name"
                        placeholder="Rajesh Kumar"
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-phone" className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">WhatsApp / Phone Number *</label>
                      <input
                        id="contact-phone"
                        type="tel"
                        name="phone"
                        required
                        autoComplete="tel"
                        placeholder="+91 98765 43210"
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-business" className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Business Name</label>
                    <input
                      id="contact-business"
                      type="text"
                      name="business"
                      autoComplete="organization"
                      placeholder="Your Business Name"
                      className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-service" className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Service Interested In *</label>
                    <select
                      id="contact-service"
                      name="service"
                      required
                      defaultValue={presetService}
                      className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer font-semibold"
                    >
                      <option value="">Select a service…</option>
                      <option value="Website Development">Website Development</option>
                      <option value="SEO & Digital Marketing">SEO & Digital Marketing</option>
                      <option value="Social Media Management">Social Media Management</option>
                      <option value="Automation & CRM">Automation & CRM</option>
                      <option value="Custom Software Development">Custom Software Development</option>
                      <option value="Google Ads / Meta Ads Management">Google Ads / Meta Ads Management</option>
                      <option value="Growth Package">Growth Package</option>
                      <option value="Custom Requirement">Custom Requirement</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-message" className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Tell us about your business</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      placeholder="What does your business do? How many leads do you get per day? What's your biggest challenge?"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                    />
                  </div>

                  {/* Global form error */}
                  {error && <p className="text-xs text-red-500 font-semibold -mt-2">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 btn-primary-forest w-full disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <><Loader2 size={15} className="animate-spin" /> Sending…</>
                    ) : (
                      <>Send Message &amp; Book Demo <ArrowRight size={14} /></>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-ink-4">
                    Or reach us instantly on{" "}
                    <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="text-accent font-semibold hover:underline">
                      WhatsApp
                    </a>{" "}
                    · {PHONE_NUMBER}
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Google Maps + Location Section ───────────────────────── */}
      <LocationMap variant="full" />

      {/* Related links */}
      <section className="bg-surface-2 py-12 border-t border-border">
        <div className="main-container text-center">
          <p className="text-xs text-slate-450 mb-4">Explore what we can build for you</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { label: "Website Development", href: "/services/website-development" },
              { label: "SEO & Digital Marketing", href: "/services/digital-marketing" },
              { label: "View All Packages", href: "/pricing" },
            ].map((l) => (
              <Link key={l.href} to={l.href} className="text-xs font-semibold text-accent border border-accent/20 bg-accent-light px-4 py-2 rounded-full hover:bg-accent-light/80 transition-colors">
                {l.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Success/Error Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 shadow-xl backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 text-emerald-800 border-emerald-250'
                : 'bg-red-50/90 text-red-800 border-red-200'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
