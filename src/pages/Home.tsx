import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  Zap,
  TrendingUp,
  ShieldCheck,
  Check,
  Activity,
  Globe,
  Database,
  BarChart3,
  Layers,
  Compass,
  Users,
  HelpCircle
} from "lucide-react";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";

export default function Home() {
  const location = useLocation();
  const [demoStep, setDemoStep] = useState(0);

  // Auto-cycle the live lead qualification product demo in hero (original feature)
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoStep(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Handle smooth scrolls to anchors
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace("#", ""));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location]);

  const trustItems = [
    {
      title: "Transparent Pricing",
      desc: "Upfront pricing schedules presented prior to kickoff. No hidden surcharges or surprise billing.",
      icon: Layers
    },
    {
      title: "Clear Project Scope",
      desc: "Detailed roadmap agreements defining pages, features, and timeline milestones explicitly.",
      icon: Compass
    },
    {
      title: "Dedicated Support",
      desc: "Direct communication with our engineering and strategy team during and post deployment.",
      icon: Users
    },
    {
      title: "Custom Solutions",
      desc: "Every line of code and visual component is constructed tailored to your operational specifications.",
      icon: Zap
    },
    {
      title: "Business Focused Approach",
      desc: "We focus on constructing robust business infrastructure that delivers long-term operational value.",
      icon: TrendingUp
    },
    {
      title: "Scalable Development",
      desc: "Our systems use clean modular frameworks that grow seamlessly as your enterprise expands.",
      icon: ShieldCheck
    }
  ];

  const WA_NUMBER = "919334757759";
  const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in booking a free consultation with Trinetra Digital Solution.")}`;

  return (
    <>
      <SEO
        title="Trinetra Digital Solution — Custom Website Development, CRM & Digital Solutions"
        description="Trinetra Digital Solution is a trusted technology and growth agency. We engineer custom websites, business CRM systems, and performance marketing campaigns for growing companies."
        canonical="https://trinetradigitalsolution.com/"
      />

      {/* Main container with original warm background */}
      <div className="min-h-screen bg-[#F9F8F5] text-[#18170F] relative overflow-hidden font-sans pt-12">
        {/* Original futuristic glowing blur orbits */}
        <div className="absolute top-[5%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/35 to-teal-200/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-amber-100/20 to-orange-200/15 rounded-full blur-[140px] pointer-events-none" />
        
        {/* ── 1. ORIGINAL WIDGET HERO (NEW COMPLIANT COPY) ── */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-8 text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-850 text-[10px] font-bold tracking-wider uppercase font-interface"
            >
              <Sparkles size={12} className="text-[#BF7340]" />
              Technology & Growth Partner
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black font-display tracking-tight leading-[1.08] text-slate-900"
            >
              Custom <span className="font-display italic text-[#BF7340]">websites</span>, CRM systems, and strategic <span className="font-display italic text-[#BF7340]">growth</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[#5C5A52] text-sm sm:text-base leading-relaxed max-w-xl font-medium"
            >
              A reliable digital partner building robust corporate websites, custom sales software, and ads-compliant marketing retargets. Establish absolute credibility and generate qualified enquiries without unrealistic claims.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3.5"
            >
              <Link
                to="/contact"
                className="btn-primary-forest h-11 px-6 rounded-xl flex items-center justify-center gap-2"
              >
                Get Free Consultation <ArrowRight size={14} />
              </Link>
              <a
                href="#pricing"
                className="btn-secondary-outlined h-11 px-6 rounded-xl flex items-center justify-center gap-1.5"
              >
                Explore Pricing
              </a>
            </motion.div>

            {/* Social proof - original style */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-3 border-t border-[#E2DDD5] pt-6"
            >
              <div className="flex -space-x-2">
                {['T', 'D', 'S', 'A'].map((char, i) => (
                  <span key={i} className="h-7 w-7 rounded-full border border-[#E2DDD5] bg-[#FAF5EF] flex items-center justify-center text-[9px] font-bold text-[#5C5A52] shadow-3xs">{char}</span>
                ))}
              </div>
              <p className="text-[11px] text-[#8C8A82] font-semibold">Configured with 100% Meta & Google ad platforms compliance.</p>
            </motion.div>
          </div>

          {/* Right Hero Side: Dynamic Live Walkthrough Card (Original UI preserved) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl p-5 md:p-6 shadow-[0_16px_48px_-12px_rgba(24,23,15,0.05)] relative overflow-hidden"
          >
            <div className="absolute top-3 left-4 flex gap-1.5 opacity-60">
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
            </div>

            <div className="mb-6 mt-1 flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Operations Timeline</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#2A4A3E] bg-emerald-50 px-2 py-0.5 rounded-full shadow-3xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Staging
              </span>
            </div>

            {/* Simulated Live Processing timeline (Original UI) */}
            <div className="space-y-4 text-left">
              <div className="bg-white border border-[#E2DDD5]/80 p-3.5 rounded-2xl shadow-3xs flex items-start gap-3">
                <span className="h-7 w-7 rounded-lg bg-[#FAF5EF] text-[#BF7340] flex items-center justify-center shrink-0"><MessageSquare size={13} /></span>
                <div>
                  <div className="flex justify-between items-center w-full"><span className="text-[10px] font-bold text-[#18170F]">Inbound Enquiry captured</span> <span className="text-[8px] text-slate-400 font-mono">11:02 AM</span></div>
                  <p className="text-[11px] text-[#5C5A52] italic mt-0.5">"Looking for an institutional custom CRM setup. Budget is 1.5L..."</p>
                </div>
              </div>

              {demoStep >= 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FAF5EF] border border-[#BF7340]/30 p-3.5 rounded-2xl shadow-3xs flex items-start gap-3"
                >
                  <span className="h-7 w-7 rounded-lg bg-[#FAF5EF] text-[#BF7340] flex items-center justify-center shrink-0"><Sparkles size={13} /></span>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-[#18170F]">Requirement Parsing</span>
                    <p className="text-[11px] text-[#BF7340] font-mono mt-0.5 font-bold">Staging milestones...</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] font-bold bg-white border border-[#E2DDD5] text-[#5C5A52] px-2 py-0.5 rounded-lg shadow-3xs">Scope: CRM dev ✓</span>
                      <span className="text-[9px] font-bold bg-white border border-[#E2DDD5] text-[#5C5A52] px-2 py-0.5 rounded-lg shadow-3xs">Budget: Qualified ✓</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {demoStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#E2DDD5] p-3.5 rounded-2xl shadow-3xs flex items-start gap-3"
                >
                  <span className="h-7 w-7 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center shrink-0"><Database size={13} /></span>
                  <div>
                    <span className="text-[10px] font-bold text-[#18170F]">CRM Record Generated</span>
                    <p className="text-[11px] text-[#5C5A52] mt-0.5 font-bold">Client Name: Rajesh Kumar · India</p>
                  </div>
                </motion.div>
              )}

              {demoStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#2A4A3E] border border-emerald-500/20 p-3.5 rounded-2xl shadow-sm text-white flex items-start gap-3"
                >
                  <span className="h-7 w-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0"><Check size={13} /></span>
                  <div>
                    <span className="text-[10px] font-bold">Consultation Booked</span>
                    <p className="text-[11px] opacity-90 italic mt-0.5">"Auto-reply confirmation details dispatched to client WhatsApp ✓"</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── 2. ORIGINAL SERVICES FEATURE GRID (INJECTED NEW CONTENT) ── */}
        <section className="py-20 relative z-10 bg-[#FAF5EF] border-y border-[#E2DDD5]/60">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Our Key Pillars</span>
              <h2 className="mixed-headline-title">Tailored Software & Growth Systems</h2>
              <p className="body-md text-[#5C5A52]">
                We design and engineer solid solutions tailored according to your unique business requirements.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              
              {/* Card 1: Website Development */}
              <div className="bg-white border border-[#E2DDD5] p-6 rounded-3xl space-y-4 hover:shadow-md transition-all text-left">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] shadow-3xs">
                  <Globe size={18} />
                </span>
                <h3 className="text-sm font-bold text-[#18170F]">Website Development</h3>
                <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold">
                  Fully responsive, highly optimized custom websites constructed from scratch. We build sites that convey legitimacy and turn traffic into leads.
                </p>
                <div className="h-px bg-slate-100 my-2" />
                <ul className="space-y-1 text-[10.5px] text-[#8C8A82] font-semibold">
                  <li>• Business &amp; Company Websites</li>
                  <li>• Service &amp; Portfolio Sites</li>
                  <li>• E-commerce &amp; Landing Pages</li>
                  <li>• Mobile Responsive &amp; Fast Loading</li>
                  <li>• WhatsApp &amp; Maps Integrations</li>
                </ul>
              </div>

              {/* Card 2: CRM Development */}
              <div className="bg-[#131210] border border-[#BF7340]/30 p-6 rounded-3xl space-y-4 shadow-sm text-left relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[3.5px] bg-[#BF7340]" />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF5EF]/10 text-[#BF7340] shadow-3xs">
                  <Database size={18} />
                </span>
                <h3 className="text-sm font-bold text-white">CRM Development</h3>
                <p className="text-[11px] text-[#FAF5EF]/70 leading-relaxed font-semibold">
                  Custom-built software databases tailored exactly to your operational workflows. Streamline follow-ups, align teams, and automate raw administrative tasks.
                </p>
                <div className="h-px bg-white/10 my-2" />
                <ul className="space-y-1 text-[10.5px] text-[#FAF5EF]/55 font-semibold">
                  <li>• Lead &amp; Pipeline Tracking</li>
                  <li>• Customer &amp; Team Management</li>
                  <li>• Custom Dashboards &amp; Workflows</li>
                  <li>• Role-Based Secure Access</li>
                  <li>• WhatsApp Integrations Ready</li>
                </ul>
              </div>

              {/* Card 3: Digital Marketing */}
              <div className="bg-white border border-[#E2DDD5] p-6 rounded-3xl space-y-4 hover:shadow-md transition-all text-left">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] shadow-3xs">
                  <BarChart3 size={18} />
                </span>
                <h3 className="text-sm font-bold text-[#18170F]">Digital Marketing</h3>
                <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold">
                  We help businesses improve their online presence and generate qualified enquiries through strategic digital marketing. Honest copy, conversion analysis, and compliance.
                </p>
                <div className="h-px bg-slate-100 my-2" />
                <ul className="space-y-1 text-[10.5px] text-[#8C8A82] font-semibold">
                  <li>• Google &amp; Meta Ads Management</li>
                  <li>• Lead Generation Campaigns</li>
                  <li>• Local Business SEO Setup</li>
                  <li>• Conversion Pixel &amp; Tracking</li>
                  <li>• Landing Page Optimization</li>
                </ul>
              </div>

            </div>

            {/* Coming Soon Block - Classic Card design */}
            <div className="max-w-4xl mx-auto bg-white border border-[#E2DDD5] p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between text-left gap-6 shadow-3xs">
              <div className="space-y-2">
                <span className="text-[9.5px] bg-[#FAF5EF] border border-[#BF7340]/30 text-[#BF7340] px-2 py-0.5 rounded-full uppercase font-bold">
                  Coming Soon
                </span>
                <h4 className="text-sm font-bold text-[#18170F] mt-1">Automation Solutions</h4>
                <p className="text-xs text-[#5C5A52] leading-relaxed font-semibold max-w-xl">
                  We are currently developing advanced automation solutions that will be available soon. Future modules will integrate WhatsApp Automation, Automated follow-ups, AI Chat Assistants, and Customer support routines.
                </p>
              </div>
              <div className="shrink-0">
                <span className="text-xs font-bold text-[#8C8A82] uppercase tracking-widest border border-[#E2DDD5] bg-[#F4F2ED] rounded-lg px-4 py-2">
                  Staging Mode
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── 3. TRUST SECTION (OLD UI STYLE) ── */}
        <section className="py-20 relative z-10 bg-white">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Institutional Integrity</span>
              <h2 className="mixed-headline-title">Designed for long-term trust</h2>
              <p className="body-md text-[#5C5A52]">
                Bypass exaggerated promises. Upgraded technology and marketing services designed with compliance, transparency, and structure.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto">
              {trustItems.map((item, i) => (
                <div key={i} className="bg-[#F4F2ED] border border-[#E2DDD5] p-6 rounded-3xl space-y-3 text-left transition-all duration-200 hover:bg-white hover:shadow-3xs">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF5EF] text-[#BF7340] border border-[#E2DDD5] shadow-3xs">
                    <item.icon size={15} />
                  </span>
                  <h3 className="text-xs font-bold text-[#18170F]">{item.title}</h3>
                  <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. TRANSPARENT PRICING matrix ── */}
        <div id="pricing">
          <Pricing />
        </div>

        {/* ── 5. ORIGINAL STYLE FAQS SECTION ── */}
        <section className="py-20 md:py-24 relative z-10 bg-[#FAF5EF] border-t border-[#E2DDD5]/60">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">FAQ</span>
              <h2 className="mixed-headline-title">Pricing &amp; Scope Questions</h2>
              <p className="body-md text-[#5C5A52]">
                Get honest, direct answers regarding our services, commercial practices, and legal operations.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 text-left">
              {[
                {
                  q: "What is Trinetra Digital Solution?",
                  a: "Trinetra Digital Solution is the technology services brand of Charulata Enterprises. We build responsive websites, engineer custom CRMs, and manage strategic, ads-compliant digital marketing campaigns for growing companies."
                },
                {
                  q: "How are website development milestone payments handled?",
                  a: "Our payments are structured simply and transparently: 50% upfront to initiate wireframing, designs, and staging configuration, and 50% strictly upon project validation and approval, prior to live hosting migration."
                },
                {
                  q: "Are advertising platform budgets included in fees?",
                  a: "No. Advertising budgets spent on Google Ads or Meta Ads platforms are paid directly by the client to those platforms. Our fees cover strictly campaign creation, creative optimization, tracking setups, and ongoing strategy."
                },
                {
                  q: "Do you offer any lead guarantees?",
                  a: "We do not offer artificial, misleading lead guarantees or unrealistic revenue numbers. We help businesses improve their online presence and generate qualified enquiries through strategic digital marketing. Results depend entirely on market demand, product fit, and sales processing speeds."
                },
                {
                  q: "Is there support provided post-handover?",
                  a: "Yes. Every custom software and CRM project comes with dedicated technical support (stated inside your contract) to verify system stability, answer operational questions, and execute routine updates."
                },
                {
                  q: "Where is Trinetra Digital Solution located?",
                  a: "Trinetra Digital Solution (Charulata Enterprises) is officially registered and operated in Gorakhpur, Uttar Pradesh, India — 273001. We serve professional business clients across all states of India remotely."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-white border border-[#E2DDD5] rounded-2xl p-5 md:p-6 shadow-3xs flex gap-3.5">
                  <div className="h-6 w-6 rounded-lg bg-[#FAF5EF] text-[#BF7340] border border-[#E2DDD5] flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#18170F] mb-1.5 leading-snug">{faq.q}</h3>
                    <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. CONTACT SECTION (OLD UI STYLE FORM) ── */}
        <section id="contact" className="py-20 md:py-24 bg-white relative z-10 border-t border-[#E2DDD5]">
          <div className="max-w-5xl mx-auto px-6 grid gap-12 md:grid-cols-[1fr_1.3fr] items-start">
            
            {/* Direct Info panel */}
            <div className="space-y-8 text-left">
              <div>
                <span className="mixed-headline-eyebrow">
                  Book A Consultation
                </span>
                <h2 className="mixed-headline-title">
                  Let's discuss your roadmap
                </h2>
                <p className="text-[#5C5A52] text-xs sm:text-sm mt-3 leading-relaxed font-medium">
                  Complete our transparent consultation request form. Our team will review your business specifications and schedule a structured 1-on-1 strategy call.
                </p>
              </div>

              <div className="space-y-4">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 border border-[#E2DDD5] bg-[#FAF5EF]/30 hover:bg-[#FAF5EF]/60 rounded-2xl transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-[#FAF5EF] text-[#BF7340] flex items-center justify-center shrink-0">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#18170F]">WhatsApp Chat (Instant Reply)</p>
                    <p className="text-[10px] text-[#8C8A82] font-semibold mt-0.5">Connect instantly with our team</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 border border-[#E2DDD5] bg-[#F4F2ED]/60 rounded-2xl">
                  <div className="h-9 w-9 rounded-lg bg-[#FAF5EF] text-[#BF7340] flex items-center justify-center shrink-0">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#18170F]">Free 30-Min Strategy Call</p>
                    <p className="text-[10px] text-[#8C8A82] font-semibold mt-0.5">Structured scope assessment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form card - Styled exactly in original contact style */}
            <div className="bg-[#FAF5EF] border border-[#E2DDD5] p-6 md:p-8 rounded-2xl shadow-3xs text-left">
              <h3 className="text-sm font-bold text-[#18170F] mb-1">Get a Free Consultation</h3>
              <p className="text-xs text-[#8C8A82] font-semibold mb-6">Complete all fields. We respond within 2 business hours.</p>

              <form
                action="https://formspree.io/f/mbdbqbwy"
                method="POST"
                className="space-y-4"
              >
                <div>
                  <label htmlFor="form-name" className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Full Name *</label>
                  <input
                    id="form-name"
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    className="h-11 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-sm text-[#18170F] placeholder-[#B8B5AE] focus:outline-none focus:ring-2 focus:ring-[#BF7340]/30 focus:border-[#BF7340] transition-all"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="form-phone" className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Phone / WhatsApp *</label>
                    <input
                      id="form-phone"
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. +91 98765 43210"
                      className="h-11 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-sm text-[#18170F] placeholder-[#B8B5AE] focus:outline-none focus:ring-2 focus:ring-[#BF7340]/30 focus:border-[#BF7340] transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="form-business" className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Business Name</label>
                    <input
                      id="form-business"
                      type="text"
                      name="business"
                      placeholder="e.g. Sharma Enterprise"
                      className="h-11 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-sm text-[#18170F] placeholder-[#B8B5AE] focus:outline-none focus:ring-2 focus:ring-[#BF7340]/30 focus:border-[#BF7340] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="form-service" className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Service Interested In *</label>
                  <select
                    id="form-service"
                    name="service"
                    required
                    className="h-11 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-sm text-[#18170F] focus:outline-none focus:ring-2 focus:ring-[#BF7340]/30 focus:border-[#BF7340] transition-all cursor-pointer"
                  >
                    <option value="">Select service...</option>
                    <option value="Website Development">Website Development</option>
                    <option value="CRM Development">CRM Development</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Custom Project">Custom Staged Project</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="form-message" className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Your Requirements *</label>
                  <textarea
                    id="form-message"
                    name="message"
                    required
                    rows={4}
                    placeholder="Briefly tell us about your requirements, goals, and target timeline..."
                    className="w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 py-3 text-sm text-[#18170F] placeholder-[#B8B5AE] focus:outline-none focus:ring-2 focus:ring-[#BF7340]/30 focus:border-[#BF7340] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-forest w-full h-12 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  Submit Consultation Request <ArrowRight size={14} />
                </button>
              </form>
            </div>

          </div>
        </section>

      </div>
    </>
  );
}
