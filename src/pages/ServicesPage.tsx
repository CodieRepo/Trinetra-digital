import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Globe, Database, BarChart3, Clock, Check, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";

const SERVICES = [
  {
    icon: <Globe size={22} />,
    title: "Website Development",
    description: "Fully custom, mobile responsive, and SEO-friendly websites engineered to establish instant brand credibility and convert raw visitors into enquiries.",
    details: [
      "Business & Corporate Websites",
      "Service & Portfolio Showcase Sites",
      "Conversion-tuned Landing Pages",
      "E-commerce & Store Solutions",
      "High-speed performance (LCP optimized)",
      "WhatsApp & Google Maps integrations",
      "Hosting & domain configuration guidance",
      "Secure contact & enquiry capture forms"
    ],
    href: "/services/website-development",
    tag: null
  },
  {
    icon: <Database size={22} />,
    title: "CRM Development",
    description: "Tailored customer relationship databases and lead tracking pipelines built to match your operational workflows, eliminating admin overhead.",
    details: [
      "Centralized Lead Management systems",
      "Structured Customer databases",
      "Visual sales pipeline drag-and-drop",
      "Follow-up logs & reminder trackers",
      "Up to 15 team seats & member dashboards",
      "Comprehensive performance reports",
      "WhatsApp API notification capability",
      "Secure role-based user access controls"
    ],
    href: "/services/ai-crm",
    tag: "Highly Requested"
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Digital Marketing",
    description: "Strategic performance marketing campaigns designed to help businesses improve their online presence and acquire qualified customer enquiries.",
    details: [
      "Meta Ads Management (Facebook & Instagram)",
      "Google Ads (Search & Local Display)",
      "Lead generation target campaigns",
      "Conversion tracking pixels (Meta Pixel / GTM)",
      "A/B landing page layout optimization",
      "Detailed organic SEO keyword structures",
      "Social media setup & branding",
      "No misleading lead volume guarantees"
    ],
    href: "/services/digital-marketing",
    tag: null
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
};

export default function ServicesPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Software & Digital Solutions Services — Trinetra Digital Solution"
        description="Explore Trinetra Digital Solution's key services: Website Development, CRM Software Engineering, and Performance Digital Marketing for Indian businesses."
        canonical="https://trinetradigitalsolution.com/services"
      />

      {/* Hero Header */}
      <section className="relative bg-white pt-20 pb-16 md:pt-24 md:pb-20 border-b border-slate-200">
        <div className="main-container text-center max-w-[800px] mx-auto px-4">
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-3">
            Our Core Capabilities
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-5 leading-tight">
            Robust software engineering and strategic marketing solutions
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-[580px] mx-auto mb-8 font-medium">
            We reject exaggerated promises and build clean operational foundations. Whether you require a credible website, custom sales software, or strategic ads management, we design to your specifications.
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link to="/contact" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs">
              Book Strategy Call <ArrowRight size={14} />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 h-11 px-6 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors">
              View Transparent Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-slate-50 py-16 md:py-24 border-b border-slate-200" aria-label="All services details">
        <div className="main-container max-w-[1200px] mx-auto px-4 space-y-12">
          
          <div className="grid gap-8 md:grid-cols-3">
            {SERVICES.map((service, i) => (
              <motion.div
                key={service.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                className="group bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:shadow-md transition-shadow duration-300 relative text-left"
              >
                {service.tag && (
                  <span className="absolute top-4 right-4 text-[9px] font-extrabold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {service.tag}
                  </span>
                )}

                <div>
                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                    {service.icon}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-3">{service.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold mb-6">
                    {service.description}
                  </p>

                  <div className="h-px bg-slate-100 my-4" />
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Key Features:</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-semibold mb-6">
                    {service.details.map((detail, d) => (
                      <li key={d} className="flex items-start gap-2.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] mt-0.5">
                          <Check size={9} strokeWidth={3} />
                        </span>
                        <span className="leading-normal">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-5">
                  <Link
                    to="/contact"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline"
                  >
                    Request consultation proposal <ArrowRight size={13} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Coming Soon Block */}
          <div className="max-w-3xl mx-auto bg-slate-100/50 border border-slate-200/80 p-6 md:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-left gap-6 mt-12 shadow-3xs">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-slate-200 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Clock size={10} /> Automation Solutions (Coming Soon)
              </span>
              <h3 className="text-sm font-bold text-slate-800">Advanced Business Workflow Automation</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-xl">
                We are currently developing advanced automation solutions that will be available soon. Future modules will integrate WhatsApp Auto-replies, smart lead follow-up automation, custom customer support flows, and AI assistants.
              </p>
            </div>
            <div className="shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 bg-white rounded-lg px-4 py-2">
                Dev Stage
              </span>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
