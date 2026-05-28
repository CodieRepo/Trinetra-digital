import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageSquare, Database, Bell, Globe, BarChart2, Bot, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";

const SERVICES = [
  {
    icon: <MessageSquare size={22} />,
    title: "WhatsApp Automation",
    description: "AI-powered auto-replies, lead qualification, and conversation routing on your existing WhatsApp Business number. Respond to every lead within 3 minutes, 24/7.",
    href: "/services/whatsapp-automation",
    tag: "Most Popular",
  },
  {
    icon: <Database size={22} />,
    title: "AI CRM",
    description: "A self-updating CRM that extracts names, budgets, and requirements from WhatsApp chats automatically. No manual data entry ever again.",
    href: "/services/ai-crm",
    tag: null,
  },
  {
    icon: <Bell size={22} />,
    title: "Smart Follow-Up",
    description: "Intelligent re-engagement sequences that send personalized messages on Day 1, 3, and 7. Auto-stops when a lead responds or books.",
    href: "/services/smart-followup",
    tag: null,
  },
  {
    icon: <Globe size={22} />,
    title: "Website Development",
    description: "Fast, SEO-optimized websites built for Indian businesses. Landing pages, service sites, and portfolio sites that convert visitors into leads.",
    href: "/services/website-development",
    tag: null,
  },
  {
    icon: <BarChart2 size={22} />,
    title: "Digital Marketing",
    description: "Performance marketing campaigns on Google, Meta, and WhatsApp. We combine organic SEO with paid acquisition for maximum ROI.",
    href: "/services/digital-marketing",
    tag: null,
  },
  {
    icon: <Bot size={22} />,
    title: "AI Chatbots",
    description: "Custom AI chatbots trained on your business data. Deploy on WhatsApp, website, or Instagram — handles FAQs, bookings, and lead capture autonomously.",
    href: "/services/ai-chatbots",
    tag: null,
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "AI Business Automation",
  "provider": { "@id": "https://trinetradigitalsolution.com/#organization" },
  "areaServed": "IN",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Trinetra Digital Solution Services",
    "itemListElement": SERVICES.map((s) => ({
      "@type": "Offer",
      "name": s.title,
      "description": s.description,
      "url": `https://trinetradigitalsolution.com${s.href}`,
    })),
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }),
};

export default function ServicesPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="AI Automation Services — WhatsApp CRM, Chatbots & Digital Marketing | Trinetra Digital"
        description="Explore Trinetra Digital Solution's full suite of AI automation services: WhatsApp Automation, AI CRM, Smart Follow-Up, Website Development, Digital Marketing, and AI Chatbots for Indian businesses."
        canonical="https://trinetradigitalsolution.com/services"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="relative bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-20 border-b border-[#E2DDD5]">
        <div className="main-container text-center">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            What We Build
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight max-w-[680px] mx-auto mb-5 mt-2"
          >
            AI automation services built for Indian businesses
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] max-w-[520px] mx-auto mb-8"
          >
            From WhatsApp lead automation to AI CRMs and performance marketing — we build the operational infrastructure your business needs to scale without adding headcount.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Demo <ArrowRight size={14} />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 h-11 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors">
              See Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-[#F4F2ED] py-20 md:py-28" aria-label="All Services">
        <div className="main-container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.href}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="group relative flex flex-col justify-between bg-white border border-[#E2DDD5] rounded-2xl p-8 hover:shadow-md transition-all duration-300 overflow-hidden"
                style={{ minHeight: "280px" }}
              >
                {/* Top accent line on hover */}
                <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                {service.tag && (
                  <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest bg-[#F2E8DC] text-[#BF7340] px-2.5 py-1 rounded-full">
                    {service.tag}
                  </span>
                )}

                <div>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F2E8DC] text-[#BF7340]">
                    {service.icon}
                  </div>
                  <h2 className="heading-sm text-[#18170F] mb-3">{service.title}</h2>
                  <p className="body-sm text-[#5C5A52] leading-relaxed">{service.description}</p>
                </div>

                <Link
                  to={service.href}
                  className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#8C8A82] group-hover:text-[#BF7340] transition-colors"
                >
                  Learn more <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
