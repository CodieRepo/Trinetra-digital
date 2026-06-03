import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, Lightbulb, Users, ShieldCheck, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "url": "https://trinetradigitalsolution.com/about",
  "name": "About Trinetra Digital Solution",
  "description": "Trinetra Digital Solution is a business growth and digital transformation partner based in Gorakhpur, Uttar Pradesh. We help startups, local businesses and growing companies build websites, manage digital marketing, automate workflows and develop custom software.",
  "mainEntity": {
    "@id": "https://trinetradigitalsolution.com/#organization",
  },
};

const VALUES = [
  {
    icon: <Target size={20} />,
    title: "Process-Driven",
    desc: "Every engagement follows a clear process — from consultation and planning to implementation and review. No guesswork, just structured execution.",
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Business-Focused Solutions",
    desc: "We build digital systems around your actual business goals — whether that's improving lead management, establishing online visibility or streamlining operations.",
  },
  {
    icon: <Users size={20} />,
    title: "Long-Term Partnerships",
    desc: "We work as a committed partner, not a one-off vendor. Our goal is to help your business improve and evolve over time through ongoing support and optimization.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Transparent & Compliant",
    desc: "We communicate clearly, set realistic expectations and ensure all our services follow platform policies including Google, Meta and WhatsApp Business guidelines.",
  },
];

export default function AboutPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="About Trinetra Digital Solution — Business Growth & Digital Transformation Partner"
        description="Trinetra Digital Solution is a complete business growth partner based in Gorakhpur, UP. We help local businesses, startups and SMBs build websites, run digital marketing, automate workflows and develop custom software solutions."
        canonical="https://trinetradigitalsolution.com/about"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-24 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[740px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            Our Story
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight mt-2 mb-6"
          >
            Your complete digital growth and automation partner
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4 body-md text-[#5C5A52]"
          >
            <p>
              Trinetra Digital Solution was founded with a clear purpose: to help Indian businesses — especially local businesses, service providers and SMBs — establish a strong digital presence, manage customer inquiries more effectively and operate more efficiently through the right technology.
            </p>
            <p>
              Most businesses we worked with were running on spreadsheets, unorganized chat logs and missed callbacks. They had no professional website, no structured follow-up system, no online visibility and no software to manage their operations. They were hardworking but lacked the digital foundation to grow.
            </p>
            <p>
              We built Trinetra to change that. Starting in Gorakhpur, Uttar Pradesh, we began helping local businesses build professional websites, set up CRM systems, run local SEO campaigns and automate their customer communication workflows — all under one roof with transparent processes.
            </p>
            <p>
              Today, we serve startups, local businesses, clinics, coaching institutes, real estate agencies, salons, restaurants and growing companies across India — helping them build a stronger digital presence, manage their operations better and serve their customers more effectively.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#F4F2ED] py-20 md:py-28 border-b border-[#E2DDD5]" aria-label="Our Values">
        <div className="main-container">
          <div className="text-center mb-14">
            <span className="mixed-headline-eyebrow">What We Stand For</span>
            <h2 className="display-md text-[#18170F] tracking-tight mt-2 max-w-[520px] mx-auto">
              Principles that guide every project we deliver
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col gap-4 bg-white border border-[#E2DDD5] rounded-xl p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2E8DC] text-[#BF7340]">
                  {v.icon}
                </div>
                <h3 className="heading-xs text-[#18170F]">{v.title}</h3>
                <p className="text-xs text-[#5C5A52] leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#F9F8F5] py-16 border-b border-[#E2DDD5]">
        <div className="main-container">
          <div className="grid gap-6 md:grid-cols-3 text-center">
            {[
              { value: "2", label: "Verified Projects", sub: "Vaastu Infra & Akuafi" },
              { value: "5+", label: "Services Offered", sub: "Website, SEO, Social, CRM, Software" },
              { value: "Gorakhpur", label: "Based In", sub: "Uttar Pradesh, India" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center p-6">
                <span className="font-display text-[52px] leading-none text-[#18170F] font-semibold mb-2">{s.value}</span>
                <span className="text-xs font-semibold tracking-wider text-[#8C8A82] uppercase font-interface">{s.label}</span>
                {"sub" in s && <span className="text-[10px] text-[#8C8A82] mt-1">{(s as {sub: string}).sub}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Ownership & Legal Entity */}
      <section className="bg-white py-16 md:py-20 border-b border-[#E2DDD5]" aria-labelledby="brand-ownership-title">
        <div className="main-container max-w-[740px]">
          <span className="mixed-headline-eyebrow" id="brand-ownership-title">Corporate Structure</span>
          <h2 className="display-sm text-[#18170F] tracking-tight mt-2 mb-6">
            Brand Ownership &amp; Legal Entity
          </h2>
          <div className="p-6 md:p-8 bg-[#F9F8F5] border border-[#E2DDD5] rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#BF7340]"></div>
            <p className="text-sm leading-relaxed text-[#5C5A52] mb-4">
              <strong>Trinetra Digital Solution</strong> is a premium service and technology brand owned and operated by <strong>Charulata Enterprises</strong>. All business operations, contractual agreements, invoices, payments, and legal transactions are officially processed and executed under the registered corporate entity, <strong>Charulata Enterprises</strong>.
            </p>
            <p className="text-sm leading-relaxed text-[#5C5A52]">
              While <strong>Charulata Enterprises</strong> serves as the parent legal and financial entity, <strong>Trinetra Digital Solution</strong> is the customer-facing brand specializing in website development, custom CRM solutions, performance digital marketing, digital transformation, and business software development services.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F4F2ED] py-16">
        <div className="main-container text-center">
          <h2 className="display-md text-[#18170F] tracking-tight mb-4">Ready to grow your business?</h2>
          <p className="body-md text-[#5C5A52] mb-8 max-w-[480px] mx-auto">
            Book a free consultation and see exactly how Trinetra can help build your online presence, manage your operations and grow your business systematically.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Consultation <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 h-11 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors">
              Explore Our Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
