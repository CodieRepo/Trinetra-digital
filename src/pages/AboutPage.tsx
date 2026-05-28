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
  "description": "Trinetra Digital Solution is an AI automation and digital systems company based in Gorakhpur, Uttar Pradesh. We help Indian businesses automate their customer communication, lead management, and operational workflows using AI.",
  "mainEntity": {
    "@id": "https://trinetradigitalsolution.com/#organization",
  },
};

const VALUES = [
  {
    icon: <Target size={20} />,
    title: "Outcome-Driven",
    desc: "We measure success by what actually happens — leads qualified, deals closed, hours saved. Not vanity metrics.",
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Built for India",
    desc: "Our AI understands Hinglish, local business contexts, and Indian market dynamics. No off-the-shelf Western solutions.",
  },
  {
    icon: <Users size={20} />,
    title: "Human-First Automation",
    desc: "We automate the repetitive work so your team can focus on building real relationships and closing deals.",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Trusted Infrastructure",
    desc: "Enterprise-grade reliability for businesses of all sizes. We build systems that run reliably, 24/7, without babysitting.",
  },
];

export default function AboutPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="About Trinetra Digital Solution — AI Automation Company in Gorakhpur, UP"
        description="Trinetra Digital Solution is an AI automation and digital systems company based in Gorakhpur, Uttar Pradesh. We build WhatsApp automation, AI CRM, and business automation infrastructure for Indian businesses."
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
            Built to solve the lead problem every Indian business faces
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4 body-md text-[#5C5A52]"
          >
            <p>
              Trinetra Digital Solution was founded with a single observation: Indian businesses — especially SMBs — were drowning in WhatsApp messages with no system to manage them.
            </p>
            <p>
              Leads came in at all hours. Sales teams forgot to follow up. Appointment bookings got lost in unread chats. Valuable customers moved on because no one replied fast enough.
            </p>
            <p>
              We built Trinetra to fix this. Starting in Gorakhpur, Uttar Pradesh, we developed AI-powered automation infrastructure that integrates directly with WhatsApp Business — responding to every lead instantly, qualifying intent, creating CRM records automatically, and sending intelligent follow-up sequences.
            </p>
            <p>
              Today, we serve businesses across India in healthcare, real estate, education, solar, and local retail — helping them scale their operations without scaling their headcount.
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
              Principles that guide every system we build
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
              { value: "50+", label: "Businesses Automated" },
              { value: "< 3 min", label: "Average Lead Response" },
              { value: "India-wide", label: "Clients Served" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center p-6">
                <span className="font-display text-[52px] leading-none text-[#18170F] font-semibold mb-2">{s.value}</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#5C5A52]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F4F2ED] py-16">
        <div className="main-container text-center">
          <h2 className="display-md text-[#18170F] tracking-tight mb-4">Ready to automate your business?</h2>
          <p className="body-md text-[#5C5A52] mb-8 max-w-[480px] mx-auto">
            Book a free 30-minute demo and see exactly how Trinetra can transform your lead management.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors">
              Book Free Demo <ArrowRight size={14} />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 h-11 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors">
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
