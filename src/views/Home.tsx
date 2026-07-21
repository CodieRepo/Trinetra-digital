import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { trackLead, trackContact } from "../utils/metaPixel";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  Zap,
  TrendingUp,
  ShieldCheck,
  Activity,
  Globe,
  Database,
  BarChart3,
  Layers,
  Compass,
  Users
} from "lucide-react";
import SEO from "../components/seo/SEO";
import Pricing from "../components/Pricing";
import TheProblem from "../components/TheProblem";
import TheSystem from "../components/TheSystem";
import Testimonials from "../components/Testimonials";
import LazyVideo from "../components/LazyVideo";
import Hero3DSphere from "../components/Hero3DSphere";

export default function Home() {
  const location = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const whyTrinetraRef = useRef<HTMLDivElement>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const WA_NUMBER = "918810721068";
  const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in booking a free consultation with Trinetra Digital Solution.")}`;

  return (
    <>
      <SEO
        title="Trinetra Digital Solution — Custom Website Development, CRM & Digital Solutions"
        description="Trinetra Digital Solution is a trusted technology and growth agency. We engineer custom websites, business CRM systems, and performance marketing campaigns for growing companies."
        canonical="https://trinetradigitalsolution.com/"
      />

      {/* ── PAGE WRAPPER ── */}
      <div className="min-h-screen bg-base text-ink-1 relative font-sans pb-mobile-safe">

        {/* ── 1. CINEMATIC 3D HERO ── */}
        <section
          ref={heroRef}
          className="relative min-h-[92svh] md:min-h-[100svh] flex items-center justify-center pt-24 pb-12 overflow-hidden"
        >
          <div className="mx-auto max-w-[1200px] w-full px-4 md:px-10 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            
            {/* Left Column: Headline and CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start gap-6 z-20">
              
              {/* Eyebrow badge */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full"
              >
                <Sparkles size={11} className="text-accent" />
                <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-accent uppercase">
                  Complete Business Growth Partner
                </span>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="font-display text-[clamp(32px,5vw,60px)] font-extrabold leading-[1.08] tracking-tight text-ink-1"
              >
                Build, Grow,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover italic font-light">
                  Automate
                </span>{" "}
                <br className="hidden sm:block" />
                &amp; Scale Your Business.
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="text-sm md:text-base text-ink-2 leading-relaxed max-w-xl font-medium"
              >
                We design premium custom websites, build secure CRM pipelines,
                and deploy WhatsApp conversational agents that automate operations and scale local businesses across India.
              </motion.p>

              {/* CTA Row */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="flex flex-wrap gap-4 items-center"
              >
                <Link
                  to="/contact"
                  className="btn-primary-forest text-xs font-semibold tracking-wider uppercase h-11 px-6 rounded-lg bg-cta text-ink-inverse hover:bg-cta-hover glow-hover transition-all"
                >
                  Get Free Consultation &rarr;
                </Link>

                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-lg border border-white/5 bg-white/5 text-ink-1 hover:bg-white/10 transition-colors text-xs font-semibold uppercase tracking-wider backdrop-blur-md"
                >
                  Explore Pricing
                </a>

                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContact()}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-[#4ade80] hover:bg-[#25D366]/20 transition-all text-xs font-semibold"
                >
                  💬 WhatsApp Us
                </a>
              </motion.div>

              {/* Quick nav shortcuts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex flex-wrap gap-2 mt-2"
              >
                {[
                  { label: "I Need A Website", anchor: "services-website" },
                  { label: "I Need More Leads", anchor: "services-marketing" },
                  { label: "I Need Automation", anchor: "services-crm" },
                  { label: "I Need Custom Software", anchor: "services-software" },
                ].map((pathway, idx) => (
                  <a
                    key={idx}
                    href={`#${pathway.anchor}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(pathway.anchor);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="inline-flex items-center h-8 px-3 rounded-md border border-white/5 bg-white/3 hover:bg-white/8 text-[10px] font-semibold text-ink-3 transition-colors font-mono tracking-wide"
                  >
                    {pathway.label} →
                  </a>
                ))}
              </motion.div>

              {/* Trust proof strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42 }}
                className="flex items-center gap-3 mt-4"
              >
                <div className="flex -space-x-2">
                  {['T', 'D', 'S', 'A'].map((char, i) => (
                    <span
                      key={i}
                      className="h-7 w-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-[9px] font-mono font-bold text-ink-2"
                    >
                      {char}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-ink-3 font-semibold font-mono uppercase tracking-wider">
                  Serving professional brands across India
                </p>
              </motion.div>
            </div>

            {/* Right Column: Interactive 3D Sphere */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="lg:col-span-5 relative flex items-center justify-center"
            >
              <div className="w-full max-w-[450px] aspect-square relative flex items-center justify-center">
                <Hero3DSphere />
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-6 z-20 flex flex-col items-center gap-1.5"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            <span className="text-[9px] font-mono font-bold text-ink-4 uppercase tracking-[0.2em]">
              Scroll
            </span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-5 h-7 rounded-full border border-white/10 flex items-start justify-center pt-1.5"
            >
              <div className="w-0.5 h-1.5 rounded-full bg-accent/60" />
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. FEATURED PROJECTS (CREDIBILITY UPFRONT) ── */}
        <div className="bg-transparent py-24 border-b border-white/5">
          <Testimonials />
        </div>

        {/* ── 3. THE PROBLEM SECTION ── */}
        <TheProblem />

        {/* ── 4. THE SYSTEM (SOLUTION) SECTION ── */}
        <TheSystem />

        {/* ── 5. SERVICES DETAIL GRID (4 PILLARS) ── */}
        <section className="py-24 relative z-10 bg-transparent border-b border-white/5">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Our Key Pillars</span>
              <h2 className="mixed-headline-title">Tailored Software &amp; Growth Systems</h2>
              <p className="body-md text-ink-2">
                We design and engineer solid solutions tailored according to your unique business requirements.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              
              {/* Card 1: Website Development */}
              <div id="services-website" className="glass-panel p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] text-left">
                <div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-accent shadow-xs">
                    <Globe size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 mt-4 uppercase tracking-wider font-mono">Website Development</h3>
                  <p className="text-[11px] text-ink-2 leading-relaxed mt-2.5 font-medium">
                    Fully responsive, highly optimized custom websites constructed from scratch. We build sites that convey legitimacy and turn traffic into leads.
                  </p>
                  <div className="h-px bg-white/5 my-4" />
                  <ul className="space-y-2 text-[10.5px] text-ink-3 font-semibold font-mono">
                    <li>• Business &amp; Company Websites</li>
                    <li>• Service &amp; Portfolio Sites</li>
                    <li>• E-commerce &amp; Landing Pages</li>
                    <li>• Mobile Responsive &amp; Fast Loading</li>
                    <li>• Third-Party API Integrations</li>
                  </ul>
                </div>
                <div className="pt-6 border-t border-white/5 mt-6">
                  <Link to="/contact?service=Website%20Development" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer">
                    Enquire About Websites &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 2: SEO & Digital Marketing */}
              <div id="services-marketing" className="glass-panel p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] text-left">
                <div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-accent shadow-xs">
                    <BarChart3 size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 mt-4 uppercase tracking-wider font-mono">SEO &amp; Digital Marketing</h3>
                  <p className="text-[11px] text-ink-2 leading-relaxed mt-2.5 font-medium">
                    We help businesses improve their online presence and generate qualified enquiries through strategic digital marketing. Honest copy and compliance.
                  </p>
                  <div className="h-px bg-white/5 my-4" />
                  <ul className="space-y-2 text-[10.5px] text-ink-3 font-semibold font-mono">
                    <li>• Google &amp; Meta Ads Management</li>
                    <li>• Lead Generation Campaigns</li>
                    <li>• Local Business SEO Setup</li>
                    <li>• Conversion Pixel &amp; Tracking</li>
                    <li>• Landing Page Optimization</li>
                  </ul>
                </div>
                <div className="pt-6 border-t border-white/5 mt-6">
                  <Link to="/contact?service=Digital%20Marketing" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer">
                    Enquire About Marketing &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 3: CRM Development (Most Requested) */}
              <div id="services-crm" className="bg-[#1c2e30]/30 border border-accent/40 p-6 rounded-2xl flex flex-col justify-between text-left relative overflow-hidden shadow-2xl shadow-accent/5 hover:border-accent/60 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-accent border border-white/5 shadow-xs">
                      <Database size={16} />
                    </span>
                    <span className="text-[8px] bg-accent text-[#101415] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                      Most Requested
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-4 uppercase tracking-wider font-mono">Automation &amp; CRM</h3>
                  <p className="text-[11px] text-white/80 leading-relaxed mt-2.5 font-medium">
                    Custom-built software databases tailored exactly to your operational workflows. Streamline follow-ups, align teams, and organize raw administrative tasks.
                  </p>
                  <div className="h-px bg-white/10 my-4" />
                  <ul className="space-y-2 text-[10.5px] text-white/60 font-semibold font-mono">
                    <li>• Lead &amp; Pipeline Tracking</li>
                    <li>• Customer &amp; Team Management</li>
                    <li>• Custom Dashboards &amp; Workflows</li>
                    <li>• Role-Based Secure Access</li>
                    <li>• WhatsApp Follow-up Auto Alerts</li>
                  </ul>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6">
                  <Link to="/contact?service=CRM%20Development" className="text-xs font-bold text-accent hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer">
                    Enquire About Automation &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 4: Custom Software Development */}
              <div id="services-software" className="glass-panel p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] text-left">
                <div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-accent shadow-xs">
                    <Layers size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 mt-4 uppercase tracking-wider font-mono">Custom Software Dev</h3>
                  <p className="text-[11px] text-ink-2 leading-relaxed mt-2.5 font-medium">
                    Tailored dashboards, ERP modules, inventory management systems, booking platforms and custom reporting built specifically for your rules.
                  </p>
                  <div className="h-px bg-white/5 my-4" />
                  <ul className="space-y-2 text-[10.5px] text-ink-3 font-semibold font-mono">
                    <li>• Custom Operations Panels</li>
                    <li>• Legacy Software Integrations</li>
                    <li>• Business Dashboard Creation</li>
                    <li>• Secure Database Architecture</li>
                    <li>• Modular Scalable Clean Code</li>
                  </ul>
                </div>
                <div className="pt-6 border-t border-white/5 mt-6">
                  <Link to="/contact?service=Custom%20Project" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer">
                    Enquire About Software &rarr;
                  </Link>
                </div>
              </div>

            </div>

            {/* Staging Info Box */}
            <div className="max-w-4xl mx-auto glass-panel bg-[#1d2022]/40 border-white/5 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between text-left gap-6 shadow-2xl">
              <div className="space-y-2">
                <span className="text-[9px] bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Compliance &amp; Strategy
                </span>
                <h4 className="text-xs font-bold text-ink-1 mt-1 font-mono">Data Indexing &amp; Platform Guidelines</h4>
                <p className="text-xs text-ink-2 leading-relaxed font-semibold max-w-xl">
                  We build our CRM portals, websites, and marketing structures in alignment with Meta and Google privacy guidelines, protecting customer databases and ensuring ad-pixel integrity.
                </p>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] font-bold text-ink-2 uppercase tracking-widest border border-white/5 bg-white/5 rounded-lg px-4 py-2 font-mono">
                  Compliant Setup
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── 6. BUSINESS INDUSTRIES WE SERVE ── */}
        <section className="py-24 relative z-10 bg-transparent border-b border-white/5">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Industries We Serve</span>
              <h2 className="mixed-headline-title">Tailored Solutions for Your Sector</h2>
              <p className="body-md text-ink-2">
                We don't build generic templates. We build custom solutions designed around the specific operations of your business category.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {[
                { title: "Healthcare & Clinics", desc: "Patient appointment scheduling, automated WhatsApp reminder follow-ups, and clinic landing pages.", icon: Activity },
                { title: "Real Estate & Developers", desc: "Property listing architectures, lead capture workflows, and integration with CRM status dashboards.", icon: Compass },
                { title: "Coaching & Education", desc: "Course enrollment funnels, student inquiry systems, and automated welcome follow-up alerts.", icon: Users },
                { title: "Local Service Businesses", desc: "Google Business Profile local SEO setup, booking calendars, and WhatsApp call-to-action integrations.", icon: Zap },
                { title: "B2B & Professional Services", desc: "Corporate website development, lead qualifying pipelines, and secure database workflows.", icon: ShieldCheck },
                { title: "Retail & E-commerce", desc: "Digital catalog configurations, order inquiry systems, and payment gateway configurations.", icon: Globe },
              ].map((ind, i) => (
                <div key={i} className="glass-panel p-6 rounded-2xl space-y-3 text-left transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-accent border border-white/5">
                    <ind.icon size={15} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 font-mono uppercase tracking-wider">{ind.title}</h3>
                  <p className="text-[11px] text-ink-2 leading-relaxed font-semibold">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

         {/* ── 7. TRUST SECTION (BENEFITS) ── */}
         <section ref={whyTrinetraRef} className="py-24 relative z-10 bg-transparent border-b border-white/5">
           <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
             <div className="text-center max-w-xl mx-auto space-y-3">
               <span className="mixed-headline-eyebrow">Institutional Integrity</span>
               <h2 className="mixed-headline-title">Designed for long-term trust</h2>
               <p className="body-md text-ink-2">
                 Bypass exaggerated promises. Upgraded technology and marketing services designed with compliance, transparency, and structure.
               </p>
             </div>

             <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-start max-w-5xl mx-auto">
               {/* Left Column: 6 Benefits Grid */}
               <div className="grid gap-4 sm:grid-cols-2 w-full">
                 {trustItems.map((item, i) => (
                   <div key={i} className="glass-panel p-6 rounded-2xl space-y-3 text-left transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] animate-reveal">
                     <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-accent border border-white/5 shadow-xs">
                       <item.icon size={14} />
                     </span>
                     <h3 className="text-xs font-bold text-ink-1 font-mono uppercase tracking-wider">{item.title}</h3>
                     <p className="text-[11px] text-ink-2 leading-relaxed font-semibold">{item.desc}</p>
                   </div>
                 ))}
               </div>

               {/* Right Column: Sticky connected ecosystem loop */}
               <div className="glass-panel p-4 md:p-5 rounded-2xl shadow-2xl text-left h-fit lg:sticky lg:top-28 w-full max-w-[380px] mx-auto lg:mr-0 border-white/5 bg-[#1d2022]/30">
                 <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                   <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Ecosystem Integration</span>
                   <span className="flex items-center gap-1.5 text-[8px] font-mono font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                     <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                     Synced Database
                   </span>
                 </div>
                 <div style={{ position: "relative", aspectRatio: "16/9" }} className="rounded-lg border border-white/5 shadow-2xl overflow-hidden mb-4">
                   <LazyVideo src="/videos/why-tinetra.mp4" className="absolute inset-0 w-full h-full" />
                 </div>
                 <p className="text-[9.5px] text-ink-3 font-mono text-center leading-relaxed font-semibold">
                   Continuous data replication checks active.
                 </p>
               </div>
             </div>
           </div>
         </section>

        {/* ── 8. DEVELOPMENT PROCESS ── */}
        <section className="py-24 relative z-10 bg-transparent border-b border-white/5">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">How We Work</span>
              <h2 className="mixed-headline-title">Our Staged Process</h2>
              <p className="body-md text-ink-2">
                We avoid guesswork. We follow a structured, transparent process with clear milestones from the initial call to post-launch support.
              </p>
            </div>

            <div className="relative">
              {/* Process connector line for desktop */}
              <div className="hidden lg:block absolute top-[50%] left-6 right-6 h-[1px] bg-gradient-to-r from-accent/0 via-accent/30 to-accent/0 z-0 -translate-y-1/2" />
              
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 relative z-10">
                {[
                  { step: "01", title: "Discovery", desc: "We discuss your business needs, analyze competitors, and outline technical requirements." },
                  { step: "02", title: "Strategy & Scope", desc: "We define precise page structures, database schemas, and milestone timelines." },
                  { step: "03", title: "Custom Build", desc: "We write clean code (no bloated page builders) and set up custom backend configurations." },
                  { step: "04", title: "Staging & Review", desc: "You review and test the solution on a private staging link before final delivery." },
                  { step: "05", title: "Launch & Support", desc: "We migrate your site live, index search engines, and begin contract support." }
                ].map((item, idx) => (
                  <div key={idx} className="glass-panel p-6 rounded-2xl text-left transition-all duration-300 hover:bg-[#1d2022]/60 hover:border-accent/35 hover:shadow-[0_0_24px_rgba(0,229,255,0.08)] flex flex-col justify-between min-h-[190px]">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-accent block mb-2">Stage {item.step}</span>
                      <h3 className="text-xs font-bold text-ink-1 mb-2 font-mono uppercase tracking-wider">{item.title}</h3>
                      <p className="text-[11px] text-ink-2 leading-relaxed font-semibold">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. TRANSPARENT PRICING MATRIX ── */}
        <div id="pricing" className="bg-transparent border-b border-white/5">
          <Pricing />
        </div>

        {/* ── 10. FAQS SECTION ── */}
        <section className="py-24 relative z-10 bg-transparent border-t border-white/5">
          <div className="max-w-[1000px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">FAQ</span>
              <h2 className="mixed-headline-title">Pricing &amp; Scope Questions</h2>
              <p className="body-md text-ink-2">
                Get honest, direct answers regarding our services, commercial practices, and legal operations.
              </p>
            </div>

            <div className="max-w-2xl mx-auto flex flex-col gap-4 text-left">
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
              ].map((faq, i) => {
                const isOpen = activeFaq === i;
                return (
                  <div
                    key={i}
                    className="glass-panel rounded-2xl overflow-hidden transition-all duration-300 border-white/5"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
                    >
                      <h3 className="text-xs sm:text-sm font-bold text-white font-mono uppercase tracking-wider pr-4">
                        {faq.q}
                      </h3>
                      <span className={`text-accent font-mono text-sm transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                        +
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-6 pt-1 border-t border-white/3 text-[11px] sm:text-[12px] text-ink-2 leading-relaxed font-semibold">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 11. CONTACT SECTION ── */}
        <section id="contact" className="py-24 bg-transparent relative z-10">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 grid gap-12 md:grid-cols-[1fr_1.3fr] items-start">
            
            {/* Direct Info panel */}
            <div className="space-y-8 text-left">
              <div>
                <span className="mixed-headline-eyebrow">
                  Book A Consultation
                </span>
                <h2 className="mixed-headline-title">
                  Let's discuss your roadmap
                </h2>
                <p className="text-ink-2 text-xs sm:text-sm mt-3 leading-relaxed font-semibold">
                  Complete our transparent consultation request form. Our team will review your business specifications and schedule a structured 1-on-1 strategy call.
                </p>
              </div>

              <div className="space-y-4">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContact()}
                  className="flex items-center gap-4 p-4 border border-white/5 bg-[#1d2022]/40 hover:border-accent/40 hover:bg-[#1d2022]/60 rounded-2xl transition-all shadow-2xl group"
                >
                  <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 text-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-1 font-mono uppercase tracking-wider">WhatsApp Chat (Instant Reply)</p>
                    <p className="text-[10px] text-ink-3 font-semibold mt-0.5">Connect instantly with our team</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 border border-white/5 bg-[#1d2022]/40 rounded-2xl shadow-2xl">
                  <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 text-accent flex items-center justify-center shrink-0">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-1 font-mono uppercase tracking-wider">Free 30-Min Strategy Call</p>
                    <p className="text-[10px] text-ink-3 font-semibold mt-0.5">Structured scope assessment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form card */}
            <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-2xl text-left border-white/5 bg-[#1d2022]/30">
              <h3 className="text-xs font-bold text-white mb-1 font-mono uppercase tracking-wider">Get a Free Consultation</h3>
              <p className="text-[11px] text-slate-400 font-semibold mb-6">Complete all fields. We respond within 2 business hours.</p>

              <form
                action="https://formspree.io/f/mbdbqbwy"
                method="POST"
                onSubmit={() => trackLead()}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="form-name" className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Full Name *</label>
                  <input
                    id="form-name"
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    className="h-10 w-full rounded-lg border border-white/10 bg-[#101415]/60 px-3.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder-slate-500 font-semibold focus:bg-[#101415]/90"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="form-phone" className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Phone / WhatsApp *</label>
                    <input
                      id="form-phone"
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. +91 98765 43210"
                      className="h-10 w-full rounded-lg border border-white/10 bg-[#101415]/60 px-3.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder-slate-500 font-semibold focus:bg-[#101415]/90"
                    />
                  </div>
                  <div>
                    <label htmlFor="form-business" className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Business Name</label>
                    <input
                      id="form-business"
                      type="text"
                      name="business"
                      placeholder="e.g. Sharma Enterprise"
                      className="h-10 w-full rounded-lg border border-white/10 bg-[#101415]/60 px-3.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder-slate-500 font-semibold focus:bg-[#101415]/90"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="form-service" className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Service Interested In *</label>
                  <select
                    id="form-service"
                    name="service"
                    required
                    className="h-10 w-full rounded-lg border border-white/10 bg-[#101415]/60 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all cursor-pointer font-semibold focus:bg-[#101415]/90"
                  >
                    <option value="" className="bg-[#101415] text-white">Select service...</option>
                    <option value="Website Development" className="bg-[#101415] text-white">Website Development</option>
                    <option value="CRM Development" className="bg-[#101415] text-white">CRM Development</option>
                    <option value="Digital Marketing" className="bg-[#101415] text-white">Digital Marketing</option>
                    <option value="Custom Project" className="bg-[#101415] text-white">Custom Staged Project</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="form-message" className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Your Requirements *</label>
                  <textarea
                    id="form-message"
                    name="message"
                    required
                    rows={4}
                    placeholder="Briefly tell us about your requirements, goals, and target timeline..."
                    className="w-full rounded-lg border border-white/10 bg-[#101415]/60 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all resize-none placeholder-slate-500 font-semibold focus:bg-[#101415]/90"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-forest w-full h-11 bg-cta hover:bg-cta-hover text-[#101415] flex items-center justify-center gap-2 cursor-pointer shadow-2xl glow-hover rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
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
