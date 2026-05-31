import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe,
  Database,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  MessageCircle,
  Users,
  Compass,
  Zap
} from "lucide-react";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";

const WA_NUMBER = "919334757759";
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in booking a consultation with Trinetra Digital Solution.")}`;

export default function Home() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

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

  return (
    <>
      <SEO
        title="Trinetra Digital Solution — Custom Website Development, CRM & Digital Solutions"
        description="Trinetra Digital Solution is a trusted technology and growth agency. We engineer custom websites, business CRM systems, and performance marketing campaigns for growing companies."
        canonical="https://trinetradigitalsolution.com/"
      />

      <div className="min-h-screen bg-white text-slate-800 relative overflow-hidden font-sans pt-10">
        
        {/* Subtle background decoration blurs (Premium SaaS styling) */}
        <div className="absolute top-[5%] left-[-10%] w-[450px] h-[450px] bg-gradient-to-tr from-blue-100/30 to-indigo-100/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[35%] right-[-10%] w-[550px] h-[550px] bg-gradient-to-br from-slate-100/40 to-blue-50/30 rounded-full blur-[120px] pointer-events-none" />

        {/* ── 1. HERO SECTION ── */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="text-center max-w-3xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10.5px] font-bold tracking-wider uppercase"
            >
              <CheckCircle size={11} className="text-blue-600" />
              Technology & Growth Partner
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 font-display"
            >
              We engineer custom <span className="text-[#2563EB]">websites</span>, business <span className="text-[#2563EB]">CRMs</span>, and strategic digital growth.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium"
            >
              A professional digital partner providing transparent software engineering and marketing services. Establish instant corporate credibility, streamline workflows, and acquire qualified enquiries with ease.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3.5 justify-center pt-2"
            >
              <Link
                to="/contact"
                className="h-12 px-7 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                Get Free Consultation <ArrowRight size={14} />
              </Link>
              <a
                href="#pricing"
                className="h-12 px-7 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                Explore Pricing
              </a>
            </motion.div>

            {/* Compliance Proof Line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center justify-center gap-2 border-t border-slate-100 pt-6 max-w-md mx-auto"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Meta & Google Ads Platform Compliant
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── 2. PROMINENT SERVICES SECTION ── */}
        <section className="py-20 md:py-24 relative z-10 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block">
                Our Services
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Software & growth systems.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                We design and engineer solid solutions tailored according to your unique business requirements.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              
              {/* Service 1: Website Development */}
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-3xs flex flex-col justify-between text-left transition-all duration-300 hover:shadow-md">
                <div>
                  <div className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] flex mb-6">
                    <Globe size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 mb-3">Website Development</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                    Fully responsive, highly optimized custom websites constructed from scratch. We build sites that convey legitimacy and turn traffic into leads.
                  </p>
                  
                  <div className="h-px bg-slate-100 my-4" />
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Custom sites for:</p>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-semibold mb-6">
                    <li>• Business Websites</li>
                    <li>• Service Portals</li>
                    <li>• Company Websites</li>
                    <li>• Landing Pages</li>
                    <li>• Portfolio Sites</li>
                    <li>• E-commerce Platforms</li>
                  </ul>
                  
                  <div className="h-px bg-slate-100 my-4" />
                  
                  <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Mobile Responsive</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Fast Loading Speed</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> SEO Friendly Structure</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> WhatsApp & Maps Integration</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Hosting & Domain Guidance</li>
                  </ul>
                </div>
                <Link to="/contact" className="mt-8 flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
                  Inquire Now →
                </Link>
              </div>

              {/* Service 2: CRM Development */}
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-3xs flex flex-col justify-between text-left transition-all duration-300 hover:shadow-md">
                <div>
                  <div className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] flex mb-6">
                    <Database size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 mb-3">CRM Development</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                    Custom-built software databases tailored exactly to your operational workflows. Streamline follow-ups, align teams, and automate raw administrative tasks.
                  </p>
                  
                  <div className="h-px bg-slate-100 my-4" />
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Core Modules Included:</p>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-semibold mb-6">
                    <li>• Lead Management</li>
                    <li>• Customer Database</li>
                    <li>• Sales Pipelines</li>
                    <li>• Follow-up Logs</li>
                    <li>• Team Management</li>
                    <li>• Custom Dashboards</li>
                  </ul>
                  
                  <div className="h-px bg-slate-100 my-4" />
                  
                  <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Custom Business Workflows</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> WhatsApp Notification Hook</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Role-Based Access Controls</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Business Automation Ready</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Complete Technical Handover</li>
                  </ul>
                </div>
                <Link to="/contact" className="mt-8 flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
                  Inquire Now →
                </Link>
              </div>

              {/* Service 3: Digital Marketing */}
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-3xs flex flex-col justify-between text-left transition-all duration-300 hover:shadow-md">
                <div>
                  <div className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB] flex mb-6">
                    <BarChart3 size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 mb-3">Digital Marketing</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                    We help businesses improve their online presence and generate qualified enquiries through strategic digital marketing. Honest copy, conversion analysis, and compliance.
                  </p>
                  
                  <div className="h-px bg-slate-100 my-4" />
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Campaign Support:</p>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-semibold mb-6">
                    <li>• Meta Ads Management</li>
                    <li>• Google Ads (Search)</li>
                    <li>• Lead Gen Campaigns</li>
                    <li>• Local Business SEO</li>
                    <li>• Social Page Setup</li>
                    <li>• Conversion Pixels</li>
                  </ul>
                  
                  <div className="h-px bg-slate-100 my-4" />
                  
                  <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Professional Creative Guidance</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Staged A/B Layout Tuning</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Absolute Ad-Platform Compliance</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Transparent Weekly Reports</li>
                    <li className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#2563EB]" /> Budget Scaling Consultation</li>
                  </ul>
                </div>
                <Link to="/contact" className="mt-8 flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
                  Inquire Now →
                </Link>
              </div>

            </div>

            {/* ── COMING SOON DECK ── */}
            <div className="max-w-4xl mx-auto bg-slate-100/50 border border-slate-200/80 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between text-left gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="text-[9.5px] font-bold bg-slate-200 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Future Systems
                </span>
                <h4 className="text-md font-bold text-slate-800">Automation Solutions (Coming Soon)</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  We are currently developing advanced automation solutions that will be available soon. Future systems include WhatsApp Automations, Automated follow-ups, AI Chat Assistants, Support triggers, and Business workflow routines.
                </p>
              </div>
              <div className="shrink-0 flex items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-200 bg-white rounded-lg px-4 py-2">
                  Development Mode
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── 3. TRUST SECTION ── */}
        <section className="py-20 md:py-24 relative z-10 bg-white">
          <div className="max-w-7xl mx-auto px-6 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block">
                Why Choose Us
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Designed for institutional trust.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
                Bypass exaggerated promises. Upgraded technology and marketing services designed with compliance, transparency, and structure.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto">
              {trustItems.map((item, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl space-y-4 text-left transition-all duration-200 hover:bg-white hover:shadow-xs">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                    <item.icon size={16} />
                  </span>
                  <h3 className="text-sm font-bold text-slate-850">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. TRANSPARENT PRICING ── */}
        <div id="pricing">
          <Pricing />
        </div>

        {/* ── 5. FAQS SECTION ── */}
        <section className="py-20 md:py-24 relative z-10 bg-slate-50 border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-3 animate-fade-in">
              <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block">
                FAQ
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Frequently asked questions.
              </h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
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
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-3xs flex gap-4">
                  <div className="h-6 w-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-2 leading-tight">{faq.q}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. CONTACT SECTION (FORM) ── */}
        <section id="contact" className="py-20 md:py-24 bg-white relative z-10 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-6 grid gap-12 md:grid-cols-[1fr_1.3fr] items-start">
            
            {/* Direct Info panel */}
            <div className="space-y-8 text-left">
              <div>
                <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-3">
                  Book A Consultation
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Let's discuss your requirements.
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed font-medium">
                  Complete our transparent consultation request form. Our team will review your business specifications and schedule a structured 1-on-1 strategy call.
                </p>
              </div>

              <div className="space-y-4">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/60 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                    <MessageCircle size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Fast Support (WhatsApp)</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Connect instantly with our team</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Free 30-Min Strategy Call</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Structured scope assessment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form card */}
            <div className="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-2xl shadow-3xs text-left">
              <h3 className="text-md font-bold text-slate-900 mb-1">Get a Free Consultation</h3>
              <p className="text-xs text-slate-400 font-semibold mb-6">Complete all fields. We respond within 2 business hours.</p>

              {/* Consultation lead form using the unified lead flow */}
              <form
                action="https://formspree.io/f/mbdbqbwy"
                method="POST"
                className="space-y-4"
              >
                <div>
                  <label htmlFor="form-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Full Name *</label>
                  <input
                    id="form-name"
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="form-phone" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Phone / WhatsApp *</label>
                    <input
                      id="form-phone"
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. +91 98765 43210"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="form-business" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Business Name</label>
                    <input
                      id="form-business"
                      type="text"
                      name="business"
                      placeholder="e.g. Sharma Enterprise"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="form-service" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Service Interested In *</label>
                  <select
                    id="form-service"
                    name="service"
                    required
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all cursor-pointer"
                  >
                    <option value="">Select service...</option>
                    <option value="Website Development">Website Development</option>
                    <option value="CRM Development">CRM Development</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Custom Project">Custom Software Integration</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="form-message" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Your Requirements *</label>
                  <textarea
                    id="form-message"
                    name="message"
                    required
                    rows={4}
                    placeholder="Briefly describe your requirements, goals, and targets..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  Submit Consultation Request <ArrowRight size={13} />
                </button>
              </form>
            </div>

          </div>
        </section>

      </div>
    </>
  );
}
