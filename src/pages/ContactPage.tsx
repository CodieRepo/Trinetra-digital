import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle, Mail, MapPin, Clock, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import SEO from "../components/seo/SEO";
import LocationMap from "../components/LocationMap";

const WA_NUMBER = "919334757759";
const PHONE_TEL = "tel:+919334757759";
const PHONE_NUMBER = "+91 9334757759";
const EMAIL = "info@trinetradigitalsolution.com";
const FORMSPREE_ID = "mbdbqbwy";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I would like to schedule a free consultation with Trinetra Digital Solution.")}`;

export default function ContactPage() {
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

    console.log("🚀 Contact page submission payload:", data);

    const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const apiEndpoint = isDev ? "http://localhost:5000/api/leads" : "/api/leads";

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setToast({ message: "Consultation booked successfully ✓", type: 'success' });
        setTimeout(() => setToast(null), 4000);
        setSucceeded(true);
      } else {
        throw new Error("Server submission failed");
      }
    } catch (err) {
      console.warn("⚠️ Production fallback pathway: triggering Formspree...");
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
          setSucceeded(true);
        } else {
          throw new Error("Formspree failed");
        }
      } catch (fallbackErr) {
        console.error("❌ All form pipelines failed:", fallbackErr);
        setError("Unable to submit right now. Please reach out to us directly on WhatsApp for immediate support.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Get A Free Consultation — Trinetra Digital Solution"
        description="Book your free 30-minute operational strategy call with Trinetra Digital Solution. We design custom websites, sales CRMs, and marketing funnels."
        canonical="https://trinetradigitalsolution.com/contact"
      />

      {/* Hero Header */}
      <section className="bg-white pt-20 pb-12 md:pt-24 md:pb-16 border-b border-slate-200">
        <div className="main-container text-center max-w-[650px] mx-auto px-4">
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-3">
            Operational Consultation
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
            Schedule a free consultation call
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-[500px] mx-auto font-medium">
            Outline your system requirements and we will review your parameters and prepare a structured development proposal—completely free of obligation.
          </p>
        </div>
      </section>

      {/* Main Form & Details Grid */}
      <section className="bg-slate-50 py-16 md:py-24 border-b border-slate-200" aria-label="Contact Desk">
        <div className="main-container max-w-[1200px] mx-auto px-4 grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
          
          {/* Direct coordinates details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-6 text-left"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-5">Connect with us directly</h2>
              <div className="flex flex-col gap-4">
                
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-xs transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 mb-0.5">WhatsApp Consultation</p>
                    <p className="text-xs text-slate-500 font-semibold">Message our support team for immediate responses. Usually under 15 minutes.</p>
                    <p className="text-xs font-bold text-[#2563EB] mt-2 group-hover:underline">Launch WhatsApp chat →</p>
                  </div>
                </a>

                <a
                  href={PHONE_TEL}
                  className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 mb-0.5">Call Our Team</p>
                    <p className="text-xs font-bold text-slate-600">{PHONE_NUMBER}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Standard Hours: Mon–Sat, 9:00 AM – 7:00 PM IST</p>
                  </div>
                </a>

                <a
                  href={`mailto:${EMAIL}`}
                  className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 mb-0.5">Enquiry Email</p>
                    <p className="text-xs font-bold text-slate-600">{EMAIL}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Written queries answered within 12 hours</p>
                  </div>
                </a>

              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-3.5 p-5 bg-white border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-[#2563EB] shrink-0" />
                <p className="text-xs font-bold text-slate-900">Gorakhpur, Uttar Pradesh, India — 273001</p>
              </div>
              <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                <Clock size={16} className="text-[#2563EB] shrink-0" />
                <p className="text-xs font-semibold text-slate-600">Business Hours: Mon–Sat · 9:00 AM – 7:00 PM IST</p>
              </div>
              <p className="text-[11px] text-slate-400 pl-7 leading-normal font-medium">
                We service commercial project engagements across all of India remotely via secure virtual meetings.
              </p>
            </div>

            {/* Entity Block */}
            <div className="p-5 bg-blue-50/20 border border-blue-100/60 rounded-2xl">
              <p className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">Compliance Notice</p>
              <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                Trinetra Digital Solution is the technology services brand of <strong>Charulata Enterprises</strong>. All agreements, milestones contracts, billing invoicing, and banking settlements are transacted under our legal registered name <strong>Charulata Enterprises</strong>.
              </p>
            </div>

          </motion.div>

          {/* Form container */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs text-left"
          >
            {succeeded ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-10 gap-4"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]">
                  <CheckCircle size={30} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Consultation Booked!</h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[320px] font-medium">
                  Thank you. Your consultation request has been successfully captured. A solutions engineer will review your parameters and contact you on WhatsApp or email shortly.
                </p>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                >
                  Message instantly on WhatsApp
                </a>
              </motion.div>
            ) : (
              <>
                <h3 className="text-md font-bold text-slate-900 mb-1">Get a Free Consultation</h3>
                <p className="text-xs text-slate-400 font-semibold mb-6">Fill in details. We respect your data confidentiality.</p>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  aria-label="Free consultation booking form"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Full Name *</label>
                      <input
                        id="name-input"
                        type="text"
                        name="name"
                        required
                        autoComplete="name"
                        placeholder="Ramesh Kumar"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">WhatsApp / Phone *</label>
                      <input
                        id="phone-input"
                        type="tel"
                        name="phone"
                        required
                        autoComplete="tel"
                        placeholder="+91 98765 43210"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="business-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Business Name</label>
                    <input
                      id="business-input"
                      type="text"
                      name="business"
                      autoComplete="organization"
                      placeholder="Your Business Name"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="service-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Service Interested In *</label>
                    <select
                      id="service-select"
                      name="service"
                      required
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all cursor-pointer"
                    >
                      <option value="">Select a service...</option>
                      <option value="Website Development">Website Development</option>
                      <option value="CRM Development">CRM Development</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="Custom Project">Custom Staged Project</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Your Requirements *</label>
                    <textarea
                      id="message-input"
                      name="message"
                      required
                      rows={4}
                      placeholder="Briefly tell us about your business goals, target timelines, or CRM features..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all resize-none"
                    />
                  </div>

                  {error && <p className="text-[11px] text-red-500 font-bold -mt-2">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <><Loader2 size={13} className="animate-spin" /> Submitting...</>
                    ) : (
                      <>Submit Consultation Request <ArrowRight size={13} /></>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>

        </div>
      </section>

      {/* Embed Office maps location */}
      <LocationMap variant="full" />

      {/* Floating success toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9995] flex items-center gap-3 rounded-xl px-5 py-4 shadow-xl backdrop-blur-md border bg-emerald-50/90 text-emerald-800 border-emerald-200"
          >
            <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
