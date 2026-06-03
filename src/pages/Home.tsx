import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  HelpCircle,
  FolderKanban,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Plus,
  Phone,
  Building2,
  Calendar,
  Layers3
} from "lucide-react";
import SEO from "../components/seo/SEO";

export default function Home() {
  const location = useLocation();
  const [activeJourney, setActiveJourney] = useState("build");
  const [pipelineStep, setPipelineStep] = useState(0);

  // Auto-cycle lead qualifier demo logic for the hero preview
  useEffect(() => {
    const timer = setInterval(() => {
      setPipelineStep((prev) => (prev + 1) % 4);
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

  const WA_NUMBER = "919334757759";
  const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    "Hi, I'm interested in booking a free business growth consultation with Trinetra Digital Solution."
  )}`;

  // ── JOURNEY TABS DETAILS ──
  const journeySteps = [
    { id: "build", label: "1. Build", title: "Engineering Premium Digital Foundations" },
    { id: "grow", label: "2. Grow", title: "Targeted SEO & Opportunity Generation" },
    { id: "automate", label: "3. Automate", title: "Operational Pipeline Automation" },
    { id: "scale", label: "4. Scale", title: "Custom Dashboards & Custom Software" }
  ];

  // ── SERVICES DETAILS ──
  const servicesList = [
    {
      id: "website-dev",
      title: "Website Development",
      icon: <Globe size={20} className="text-[#2A4A3E]" />,
      benefits: "Establish absolute brand authority and turn casual visitors into structured customer inquiries.",
      useCases: "Corporate profiles, services catalog, clinic scheduling frontends, real estate portals.",
      deliverables: "Responsive design, high-speed custom code layout, contact Formspree validation, GBP maps verification.",
      tag: "Build"
    },
    {
      id: "seo-optimization",
      title: "Search Engine Optimization",
      icon: <Compass size={20} className="text-[#BF7340]" />,
      benefits: "Secure high-value local visibility on search networks when customers search your services.",
      useCases: "Local business queries, Google Business Profile listings, clinic visibility keywords.",
      deliverables: "Meta tags, schema.org structures, GBP mapping audits, keyword velocity strategy.",
      tag: "Grow"
    },
    {
      id: "digital-marketing",
      title: "Digital Marketing",
      icon: <BarChart3 size={20} className="text-[#2A4A3E]" />,
      benefits: "Drive qualified client leads on demand through targeted paid advertising campaigns.",
      useCases: "Lead forms, clinic appointments, coaching registration cycles.",
      deliverables: "Ad copy layout, custom target sets, Meta Pixel event audits, Google Tag setups.",
      tag: "Grow"
    },
    {
      id: "social-media",
      title: "Social Media Management",
      icon: <Users size={20} className="text-[#BF7340]" />,
      benefits: "Maintain active authority profiles that reassure prospects of your company's active operations.",
      useCases: "Brand authority templates, educational service carousels, industry news updates.",
      deliverables: "Custom graphics templates, schedule calendars, copy briefs, profile tuning.",
      tag: "Grow"
    },
    {
      id: "crm-integration",
      title: "CRM Development",
      icon: <Database size={20} className="text-[#2A4A3E]" />,
      benefits: "Centralize customer records from various networks into a secure, single operational dashboard.",
      useCases: "Lead tracking, pipeline staging, client interaction audits.",
      deliverables: "Database schema layout, role-based controls, dashboard analytics views.",
      tag: "Automate"
    },
    {
      id: "operations-automation",
      title: "Automation Systems",
      icon: <Zap size={20} className="text-[#BF7340]" />,
      benefits: "Instantly respond to prospects to ensure lead inquiries do not go cold.",
      useCases: "WhatsApp auto-responses, follow-up alerts, appointment scheduler hooks.",
      deliverables: "WhatsApp API integrations, webhook routing configurations, follow-up chains.",
      tag: "Automate"
    },
    {
      id: "custom-software",
      title: "Custom Software",
      icon: <Layers size={20} className="text-[#2A4A3E]" />,
      benefits: "Build customized business dashboards tailored exactly around your internal operational rules.",
      useCases: "ERP panels, inventory trackers, secure booking pipelines, school portals.",
      deliverables: "Fullstack code architecture, API sync utilities, reporting widgets.",
      tag: "Scale"
    }
  ];

  // ── INDUSTRIES ──
  const industries = [
    { name: "Real Estate & Developers", desc: "Property listings, lead catalogs, WhatsApp CRM sync." },
    { name: "Clinics & Doctors", desc: "Booking schedules, reminder triggers, local patient SEO." },
    { name: "Hospitals & Networks", desc: "Multi-department portals, secure status sheets, enquiry logs." },
    { name: "Schools & Academies", desc: "Fee updates portals, enrollment registers, parent bulletins." },
    { name: "Coaching Institutes", desc: "Class registrations, batch timetables, WhatsApp follow-ups." },
    { name: "Restaurants & Cafes", desc: "Digital menu routing, location SEO visibility, review triggers." },
    { name: "Salons & Spas", desc: "Appointment schedules, local maps keywords, price cards." },
    { name: "Gyms & Fitness Centers", desc: "Membership tracking systems, automated renew alerts." },
    { name: "Retail & Showrooms", desc: "Product catalog maps, enquiry routing, seasonal ads." },
    { name: "Service Businesses", desc: "Local GBP optimization, booking grids, transparent rates." },
    { name: "Manufacturing & Logistics", desc: "Custom order dashboards, internal ERP sheets, client panels." }
  ];

  // ── PROCESS ──
  const processSteps = [
    { step: "01", title: "Discovery", desc: "Audit existing business operations, map competitor frameworks, and define engineering goals." },
    { step: "02", title: "Planning", desc: "Produce clear wireframe layout structures, define API schemas, and compile project contracts." },
    { step: "03", title: "Design", desc: "Create high-fidelity visual structures in alignment with SaaS brand guidelines and typography." },
    { step: "04", title: "Development", desc: "Write clean custom React/TypeScript code, configure backend triggers, and secure API links." },
    { step: "05", title: "Deployment", desc: "Launch client solution onto private staging, complete verification testing, and migrate live." },
    { step: "06", title: "Optimization", desc: "Review database transaction speeds, trace analytics logs, and adjust support retainers." }
  ];

  // ── PACKAGES (Keep exact pricing) ──
  const packagesList = [
    {
      name: "Starter Presence",
      price: "₹14,999",
      setup: "One-time setup fee",
      monthly: "₹2,999/month Support",
      bestFor: "Ideal for local service companies and showrooms establishing online credibility.",
      businessType: "Local gyms, salons, retail showrooms, individual practitioners.",
      deliverables: [
        "1 Custom Professional Landing Page",
        "Mobile Responsive Setup",
        "WhatsApp Business CTA Trigger",
        "Formspree Secure Contact Form",
        "Google Business Profile Setup Guidance",
        "Social Media Profile Configurations",
        "8 Custom Social Posts per Month",
        "Standard Core Maintenance Support"
      ],
      popular: false
    },
    {
      name: "Growth Engine",
      price: "₹29,999",
      setup: "One-time setup fee",
      monthly: "₹5,999/month Support",
      bestFor: "Ideal for growing clinics, academies, or firms requiring structured opportunities.",
      businessType: "Private clinics, coaching institutes, real estate consultants, service providers.",
      deliverables: [
        "Complete Multi-page Responsive Website",
        "Local SEO Directory Structuring",
        "Google Business Profile Audit & Setup",
        "Lead Capture Forms & Database sync",
        "Basic WhatsApp Integration (Auto-replies)",
        "Staged Follow-up Template Setup",
        "15 Structured Social Posts per Month",
        "Monthly SEO Traffic Analytics Report",
        "Domain & Hosting Administration Support"
      ],
      popular: true
    },
    {
      name: "Sales System",
      price: "₹59,999",
      setup: "One-time setup fee",
      monthly: "₹9,999/month Support",
      bestFor: "Ideal for sales organizations looking to automate pipeline follow-up operations.",
      businessType: "Real estate developers, school networks, hospitals, established consultancies.",
      deliverables: [
        "Integrated CRM Lead Pipeline Dashboard",
        "Full WhatsApp Business API Integration",
        "Meta Ads Lead Automation sync",
        "Facebook / Instagram Auto-reply Flows",
        "Automated Meeting Booking System",
        "Lead Expiry / Follow-up Alert Rules",
        "20 Structured Social Posts per Month",
        "Weekly Strategy & Campaign Updates"
      ],
      popular: false
    },
    {
      name: "Business OS",
      price: "₹1,49,999+",
      setup: "One-time setup fee",
      monthly: "₹19,999+/month Support",
      bestFor: "Ideal for enterprises requiring custom operational dashboards and database portals.",
      businessType: "Manufacturing partners, transport operators, custom booking platforms, SaaS apps.",
      deliverables: [
        "Custom Software Portal Development (ERP/CRM)",
        "Advanced Relational Database Engineering",
        "Custom Dashboard Analytics Widgets",
        "Role-Based Security Configuration",
        "Third-party Legacy Software Sync",
        "Comprehensive SEO and Content Support",
        "Dedicated Engineering Support Officer",
        "Custom Integration Webhook Hooks"
      ],
      popular: false
    }
  ];

  // ── ADD-ONS (Keep exact pricing) ──
  const addonGroups = [
    {
      category: "Website Development",
      items: [
        { name: "Single-Page Landing Page", price: "₹14,999" },
        { name: "Standard Business Website", price: "₹29,999" },
        { name: "Premium Corporate Website", price: "₹49,999" },
        { name: "Custom Web Application", price: "₹75,000+" }
      ]
    },
    {
      category: "SEO Services",
      items: [
        { name: "Local SEO Directory Package", price: "₹7,999/month" },
        { name: "Comprehensive Business SEO", price: "₹14,999/month" },
        { name: "Enterprise Market Domination", price: "₹24,999/month" }
      ]
    },
    {
      category: "Social Media Support",
      items: [
        { name: "Brand Social Presence", price: "₹5,999/month" },
        { name: "Strategic Social Growth", price: "₹9,999/month" },
        { name: "Corporate Content & Brand Identity", price: "₹14,999/month" }
      ]
    },
    {
      category: "Ads Management",
      items: [
        { name: "Starter Ad Campaigns Setup", price: "₹7,999/month" },
        { name: "Growth Ad Campaigns Setup", price: "₹14,999/month" },
        { name: "Enterprise Ad Campaigns Setup", price: "₹24,999/month" }
      ]
    },
    {
      category: "Automation Integrations",
      items: [
        { name: "WhatsApp Business Setup", price: "₹14,999 Setup" },
        { name: "Business Process Automation", price: "₹34,999 Setup" },
        { name: "Custom AI Sales Assistant", price: "₹59,999 Setup" }
      ]
    },
    {
      category: "Custom Business Software",
      items: [
        { name: "SMB Dashboard Module", price: "₹49,999+" },
        { name: "Enterprise Operations Panel", price: "₹1,49,999+" },
        { name: "Custom Software Architecture", price: "Custom Quote" }
      ]
    }
  ];

  return (
    <>
      <SEO
        title="Trinetra Digital Solution — Custom Website Development, CRM & Business Growth Systems"
        description="Trinetra Digital Solution (Charulata Enterprises) is a professional technology partner in Gorakhpur, UP. We design websites, manage local SEO & digital ads, automate CRMs, and build custom business software."
        canonical="https://trinetradigitalsolution.com/"
      />

      {/* Main container with clean light SaaS theme (avoiding dark background) */}
      <div className="bg-[#F9F8F5] text-[#18170F] relative font-sans pt-12 overflow-x-hidden">
        
        {/* Subtle, premium light background layout grids */}
        <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />

        {/* ── 1. HERO SECTION ── */}
        <section className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-10 pt-20 pb-20 border-b border-[#E2DDD5]/50">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            
            {/* Left side text column */}
            <div className="space-y-8 text-left">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0ED] border border-[#2A4A3E]/10 text-[#2A4A3E] text-[10px] font-bold tracking-wider uppercase"
              >
                <Sparkles size={11} className="text-[#BF7340] fill-[#BF7340]/10" />
                Complete Business Technology Partner
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-6xl font-normal font-display tracking-tight leading-[1.08] text-[#18170F]"
              >
                Build. Grow. <br />
                <span className="italic text-[#BF7340]">Automate.</span> Scale.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[#5C5A52] text-sm sm:text-base leading-relaxed max-w-xl font-medium"
              >
                We design custom high-converting websites, execute local SEO &amp; digital marketing campaigns, build pipeline CRM solutions, and engineer custom software systems for startups and service providers across India. Establish absolute credibility, automate follow-ups, and scale your business operations systematically.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
              >
                <a href="#contact" className="btn-primary-forest text-xs font-bold tracking-wider uppercase h-11 flex items-center justify-center gap-2">
                  Get Free Consultation <ArrowRight size={14} />
                </a>
                <a href="#pricing" className="btn-secondary-outlined text-xs font-semibold tracking-wider uppercase h-11 flex items-center justify-center">
                  Explore Pricing Packages
                </a>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#BF7340] hover:text-[#A6612E] transition-colors flex items-center justify-center gap-1.5 self-center mt-2 sm:mt-0"
                >
                  💬 WhatsApp Us
                </a>
              </motion.div>

              {/* Service Discovery Shortcuts */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="border-t border-[#E2DDD5]/60 pt-6 mt-8"
              >
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82] mb-3">Select your immediate operational priority:</p>
                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                  {[
                    { label: "High-Performance Website", anchor: "website-dev" },
                    { label: "Local SEO & Opportunities", anchor: "seo-optimization" },
                    { label: "CRM Pipeline Automation", anchor: "crm-integration" },
                    { label: "Custom Software Solutions", anchor: "custom-software" }
                  ].map((pathway, idx) => (
                    <a
                      key={idx}
                      href={`#${pathway.anchor}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById(pathway.anchor);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="inline-flex items-center justify-center h-10 px-4 text-xs font-semibold text-[#18170F] bg-white border border-[#E2DDD5] rounded-lg hover:border-[#BF7340] hover:text-[#BF7340] transition-all duration-200 shadow-xs cursor-pointer text-center"
                    >
                      {pathway.label} &rarr;
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right side live timelines card mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white border border-[#E2DDD5] rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-3 left-4 flex gap-1.5 opacity-60">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
              </div>

              <div className="mb-6 mt-1 flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Operations Pipeline</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#2A4A3E] bg-[#E8F0ED] px-2.5 py-0.5 rounded-full shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2D6A4F] animate-pulse" />
                  Live Preview
                </span>
              </div>

              <div className="space-y-4 text-left">
                {/* Stage 0 */}
                <div className="bg-white border border-[#E2DDD5] p-3.5 rounded-xl shadow-xs flex items-start gap-3">
                  <span className="h-7 w-7 rounded-lg bg-[#FAF5EF] text-[#BF7340] flex items-center justify-center shrink-0"><MessageSquare size={13} /></span>
                  <div>
                    <div className="flex justify-between items-center w-full gap-8">
                      <span className="text-[10px] font-bold text-[#18170F]">Lead Inquiry Captured</span>
                      <span className="text-[8px] text-slate-400 font-mono">11:02 AM</span>
                    </div>
                    <p className="text-[11px] text-[#5C5A52] italic mt-0.5">"Looking for a custom CRM dashboard and website. Let's schedule a call."</p>
                  </div>
                </div>

                {/* Stage 1 */}
                {pipelineStep >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FAF5EF] border border-[#BF7340]/25 p-3.5 rounded-xl shadow-xs flex items-start gap-3"
                  >
                    <span className="h-7 w-7 rounded-lg bg-white text-[#BF7340] border border-[#BF7340]/10 flex items-center justify-center shrink-0"><Sparkles size={13} /></span>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-[#18170F]">Requirement Parsing</span>
                      <p className="text-[11px] text-[#BF7340] font-mono mt-0.5 font-bold">Matching parameters...</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[9px] bg-white border border-[#E2DDD5] text-[#5C5A52] px-2 py-0.5 rounded-md shadow-xs">Scope: Custom CRM ✓</span>
                        <span className="text-[9px] bg-white border border-[#E2DDD5] text-[#5C5A52] px-2 py-0.5 rounded-md shadow-xs">Portal: Web ✓</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stage 2 */}
                {pipelineStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#E2DDD5] p-3.5 rounded-xl shadow-xs flex items-start gap-3"
                  >
                    <span className="h-7 w-7 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center shrink-0"><Database size={13} /></span>
                    <div>
                      <span className="text-[10px] font-bold text-[#18170F]">CRM Record Generated</span>
                      <p className="text-[11px] text-[#5C5A52] mt-0.5 font-bold">Contact Logged · Gorakhpur, UP</p>
                    </div>
                  </motion.div>
                )}

                {/* Stage 3 */}
                {pipelineStep >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#2A4A3E] border border-[#2A4A3E]/10 p-3.5 rounded-xl text-white flex items-start gap-3"
                  >
                    <span className="h-7 w-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0"><Check size={13} /></span>
                    <div>
                      <span className="text-[10px] font-bold">Follow-up Auto-dispatched</span>
                      <p className="text-[11px] opacity-90 italic mt-0.5">"Consultation template sent to client. Complete ✓"</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 2. INTERACTIVE BUSINESS JOURNEY ── */}
        <section className="py-24 relative z-10 bg-[#FAF5EF] border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 text-center space-y-12">
            <div className="max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Interactive Journey</span>
              <h2 className="mixed-headline-title">See how we build, grow, automate &amp; scale</h2>
              <p className="body-md text-[#5C5A52]">
                Explore our roadmap capabilities. Select each phase below to see how we transform offline operations into structured, digital workflows.
              </p>
            </div>

            {/* Tab Switched Buttons */}
            <div className="flex justify-center overflow-x-auto pb-1">
              <div className="inline-flex gap-1.5 bg-[#EEEAE3] p-1.5 rounded-xl border border-[#E2DDD5] shrink-0">
                {journeySteps.map((step) => {
                  const isActive = activeJourney === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveJourney(step.id)}
                      className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                        isActive ? "bg-white text-[#18170F] shadow-xs" : "text-[#5C5A52] hover:text-[#18170F]"
                      }`}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Content Display Card */}
            <div className="max-w-4xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeJourney}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center bg-white border border-[#E2DDD5] rounded-2xl p-6 md:p-10 shadow-xs text-left"
                >
                  {/* Left Column: text details */}
                  <div className="space-y-6">
                    <span className="text-[10px] bg-[#F2E8DC] text-[#BF7340] border border-[#BF7340]/10 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Phase {activeJourney.toUpperCase()}
                    </span>
                    <h3 className="heading-lg text-[#18170F] leading-tight">{journeySteps.find(s => s.id === activeJourney)?.title}</h3>
                    
                    {activeJourney === "build" && (
                      <>
                        <p className="body-md text-[#5C5A52]">
                          We build high-speed, SEO-compliant business websites. No generic page builders or bloated setups. Every visual component and line of code is structured to convey brand authority.
                        </p>
                        <ul className="space-y-3">
                          {["Responsive layout across mobile, tablet, and desktops.", "Secure Formspree data endpoints with spam filter guards.", "Optimized static build pipelines for sub-second LCP speeds."].map((pt, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                              <span className="h-5 w-5 rounded-full bg-[#E8F0ED] text-[#2A4A3E] flex items-center justify-center shrink-0"><Check size={12} /></span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {activeJourney === "grow" && (
                      <>
                        <p className="body-md text-[#5C5A52]">
                          We drive opportunities through local maps dominance and search advertisements. We write compliant ad copy and verify tracking scripts are mapped before launch.
                        </p>
                        <ul className="space-y-3">
                          {["Google Business Profile structures and keyword indexing.", "Targeted Meta & Google ads configured within platform rules.", "Consistent social media calendars establishing active presence."].map((pt, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                              <span className="h-5 w-5 rounded-full bg-[#E8F0ED] text-[#2A4A3E] flex items-center justify-center shrink-0"><Check size={12} /></span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {activeJourney === "automate" && (
                      <>
                        <p className="body-md text-[#5C5A52]">
                          We replace scattered chat logs with pipeline databases. Custom CRMs ensure inbound requests trigger auto-responders so leads are processed instantly.
                        </p>
                        <ul className="space-y-3">
                          {["WhatsApp API triggers connecting inbound requests.", "Client dashboards outlining pipeline deal stages.", "Automated meeting booking workflows removing manual call delays."].map((pt, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                              <span className="h-5 w-5 rounded-full bg-[#E8F0ED] text-[#2A4A3E] flex items-center justify-center shrink-0"><Check size={12} /></span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {activeJourney === "scale" && (
                      <>
                        <p className="body-md text-[#5C5A52]">
                          We write specialized software tools. Custom operations dashboards allow directors to oversee team production, trace inventory sheets, and generate reports.
                        </p>
                        <ul className="space-y-3">
                          {["ERP panels mapping customer logs, inventory levels, and jobs.", "Role-based database authorization parameters (RBAC).", "Custom third-party integrations linking legacy legacy files."].map((pt, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs text-[#5C5A52]">
                              <span className="h-5 w-5 rounded-full bg-[#E8F0ED] text-[#2A4A3E] flex items-center justify-center shrink-0"><Check size={12} /></span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div className="pt-4 border-t border-[#E2DDD5]/60">
                      <a href="#contact" className="text-xs font-bold text-[#BF7340] hover:underline flex items-center gap-1.5">
                        Discuss similar capabilities for your business &rarr;
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Visual Mockup for active tab */}
                  <div className="bg-[#F4F2ED] border border-[#E2DDD5] rounded-xl p-4 md:p-6 flex flex-col justify-center min-h-[280px]">
                    {activeJourney === "build" && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white border border-[#E2DDD5] rounded-lg p-2.5 shadow-xs">
                          <span className="text-[10px] font-mono text-[#8C8A82]">yourwebsite.com</span>
                          <span className="h-2 w-2 rounded-full bg-[#2D6A4F] animate-pulse" />
                        </div>
                        <div className="bg-white border border-[#E2DDD5] rounded-lg p-3 shadow-xs">
                          <div className="h-2 w-24 bg-[#BF7340]/30 rounded mb-2" />
                          <div className="h-3 w-40 bg-[#18170F]/80 rounded mb-3" />
                          <div className="h-1.5 w-32 bg-slate-200 rounded mb-1" />
                          <div className="h-1.5 w-28 bg-slate-200 rounded mb-3" />
                          <div className="flex gap-2">
                            <span className="h-6 w-16 bg-[#2A4A3E] rounded shadow-xs" />
                            <span className="h-6 w-14 bg-transparent border border-[#E2DDD5] rounded" />
                          </div>
                        </div>
                        <span className="text-[9px] text-[#2A4A3E] bg-[#E8F0ED] border border-[#2D6A4F]/10 px-2 py-0.5 rounded font-bold uppercase self-center text-center">
                          Performance Score: 98%
                        </span>
                      </div>
                    )}

                    {activeJourney === "grow" && (
                      <div className="space-y-4">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#8C8A82] block text-center border-b border-[#E2DDD5] pb-2">Campaign Monitor</span>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div className="bg-white border border-[#E2DDD5] rounded p-2 shadow-xs">
                            <span className="text-[8px] text-[#8C8A82] uppercase tracking-wider block">Google Search</span>
                            <span className="text-xs font-bold text-[#18170F]">Rank #2</span>
                          </div>
                          <div className="bg-white border border-[#E2DDD5] rounded p-2 shadow-xs">
                            <span className="text-[8px] text-[#8C8A82] uppercase tracking-wider block">Ad CTR</span>
                            <span className="text-xs font-bold text-[#BF7340]">4.82%</span>
                          </div>
                        </div>
                        <div className="bg-white border border-[#E2DDD5] rounded p-3 text-left text-[10px] text-[#5C5A52] flex justify-between items-center shadow-xs">
                          <span>Google maps visibility</span>
                          <span className="text-[#2D6A4F] font-bold">+28.4% MoM</span>
                        </div>
                      </div>
                    )}

                    {activeJourney === "automate" && (
                      <div className="space-y-3 text-left">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#8C8A82] block text-center border-b border-[#E2DDD5] pb-2">Deal Pipeline</span>
                        <div className="bg-white border border-[#E2DDD5] rounded p-2.5 shadow-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 bg-[#E8F5EE] text-[#2D6A4F] rounded flex items-center justify-center text-[10px] font-bold">M</span>
                            <div>
                              <p className="text-[10px] font-bold text-[#18170F]">Dr. Mehta</p>
                              <p className="text-[8px] text-slate-400">Clinic Integration</p>
                            </div>
                          </div>
                          <span className="text-[8px] bg-[#BF7340]/10 text-[#BF7340] border border-[#BF7340]/10 font-bold px-1.5 py-0.5 rounded uppercase">Qualified</span>
                        </div>
                        <div className="bg-white border border-[#E2DDD5] rounded p-2.5 shadow-xs text-[10px] text-[#5C5A52]">
                          <p className="font-bold text-[#18170F] mb-1">Auto-Response dispatch:</p>
                          <p className="italic">"Hi Dr. Mehta, we've scheduled your onboarding call for Fri at 10 AM..."</p>
                        </div>
                      </div>
                    )}

                    {activeJourney === "scale" && (
                      <div className="space-y-3">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#8C8A82] block text-center border-b border-[#E2DDD5] pb-2">Operations Dashboard</span>
                        <div className="bg-white border border-[#E2DDD5] rounded p-3 shadow-xs text-left space-y-2">
                          <div className="flex justify-between items-center border-b border-[#F4F2ED] pb-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">System Sync</span>
                            <span className="text-[8px] text-[#2D6A4F] bg-[#E8F5EE] px-1.5 py-0.5 rounded font-bold">Stable</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-medium text-[#5C5A52]">Total Records</span>
                            <span className="text-xs font-bold text-[#18170F]">1,482</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-medium text-[#5C5A52]">Pending Tasks</span>
                            <span className="text-xs font-bold text-[#BF7340]">0</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ── 3. SERVICES ECOSYSTEM ── */}
        <section className="py-24 relative z-10 bg-white border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Services Ecosystem</span>
              <h2 className="mixed-headline-title">Capabilities built around your operations</h2>
              <p className="body-md text-[#5C5A52]">
                We don't sell general services. We deliver structured digital blocks configured strictly around your team's rules and goals.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {servicesList.map((svc) => (
                <div
                  key={svc.id}
                  id={svc.id}
                  className="bg-[#F9F8F5] border border-[#E2DDD5] p-6 rounded-2xl flex flex-col justify-between saas-card-glow text-left"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#E2DDD5] shadow-xs">
                        {svc.icon}
                      </span>
                      <span className="text-[8px] bg-white border border-[#E2DDD5] text-[#5C5A52] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {svc.tag}
                      </span>
                    </div>
                    <h3 className="heading-md text-[#18170F]">{svc.title}</h3>
                    
                    <div className="space-y-3.5 pt-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#8C8A82]">Core Benefit</p>
                        <p className="text-xs text-[#5C5A52] mt-0.5 font-medium">{svc.benefits}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#8C8A82]">Common Use Cases</p>
                        <p className="text-xs text-[#5C5A52] mt-0.5 font-medium">{svc.useCases}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#8C8A82]">Key Deliverables</p>
                        <p className="text-xs text-[#8C8A82] mt-0.5 font-medium">{svc.deliverables}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#E2DDD5]/60 mt-6">
                    <Link
                      to={`/contact?service=${encodeURIComponent(svc.title)}`}
                      className="text-xs font-bold text-[#BF7340] hover:text-[#A6612E] inline-flex items-center gap-1 cursor-pointer"
                    >
                      Enquire about this capability &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. INDUSTRIES WE SERVE ── */}
        <section className="py-24 relative z-10 bg-[#FAF5EF] border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Target Industries</span>
              <h2 className="mixed-headline-title">Custom frameworks for your sector</h2>
              <p className="body-md text-[#5C5A52]">
                We avoid template layouts. Every platform is designed specifically to support the operational rules of your target industry.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {industries.map((ind, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E2DDD5] p-5 rounded-xl text-left hover:shadow-xs transition-shadow duration-200"
                >
                  <div className="flex items-center gap-3.5 mb-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EF] text-[#BF7340] border border-[#BF7340]/10">
                      <Building2 size={14} />
                    </span>
                    <h3 className="text-xs font-bold text-[#18170F]">{ind.name}</h3>
                  </div>
                  <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. FEATURED PROJECTS ── */}
        <section className="py-24 relative z-10 bg-white border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Case Studies</span>
              <h2 className="mixed-headline-title">Verified client systems</h2>
              <p className="body-md text-[#5C5A52]">
                We represent actual, delivered systems. Bypass fabricated numbers — review two real projects build in Gorakhpur and India.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              
              {/* Project 1: Vaastu Infra */}
              <div className="bg-[#FAF5EF] border border-[#E2DDD5] p-8 rounded-2xl flex flex-col justify-between text-left shadow-xs">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#BF7340]/10 text-[#BF7340] font-bold flex items-center justify-center text-sm">
                        V
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#18170F]">Vaastu Infra</h3>
                        <p className="text-xs text-[#5C5A52]">Real Estate &amp; Construction</p>
                      </div>
                    </div>
                    <span className="text-[9.5px] bg-[#E8F0ED] text-[#2A4A3E] border border-[#2D6A4F]/10 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      Live Setup
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#18170F] uppercase tracking-wider mb-2">The Scope</h4>
                  <p className="text-xs text-[#5C5A52] leading-relaxed mb-6">
                    Vaastu Infra required a professional digital presence to establish trust with property buyers in the regional real estate sector. We designed a clean, mobile-optimized business site configured with property listings.
                  </p>

                  <div className="border-t border-[#E2DDD5] pt-4 mb-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C8A82] mb-2.5">Custom Implementations</p>
                    <ul className="space-y-2">
                      {["Professional Website Development", "Direct WhatsApp Intake Flow", "Formspree Qualified Contact form"].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-[#5C5A52]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#BF7340] shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2DDD5]/60 mt-auto">
                  <Link
                    to="/contact?service=Website%20Development"
                    className="text-xs font-bold text-[#BF7340] hover:text-[#A6612E] inline-flex items-center gap-1"
                  >
                    Discuss similar website systems &rarr;
                  </Link>
                </div>
              </div>

              {/* Project 2: Akuafi */}
              <div className="bg-[#FAF5EF] border border-[#E2DDD5] p-8 rounded-2xl flex flex-col justify-between text-left shadow-xs">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#BF7340]/10 text-[#BF7340] font-bold flex items-center justify-center text-sm">
                        A
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#18170F]">Akuafi</h3>
                        <p className="text-xs text-[#5C5A52]">Technology &amp; Custom Software</p>
                      </div>
                    </div>
                    <span className="text-[9.5px] bg-[#E8F0ED] text-[#2A4A3E] border border-[#2D6A4F]/10 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      Completed
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#18170F] uppercase tracking-wider mb-2">The Scope</h4>
                  <p className="text-xs text-[#5C5A52] leading-relaxed mb-6">
                    Akuafi required full website architecture planning and multi-page code construction. We delivered structured frontend frameworks, secure database sync scripts, and unified technical dashboard layout flows.
                  </p>

                  <div className="border-t border-[#E2DDD5] pt-4 mb-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C8A82] mb-2.5">Custom Implementations</p>
                    <ul className="space-y-2">
                      {["Website Architecture & Planning", "Advanced Frontend Development", "Backend Development & System sync", "Multi-page System Workflows"].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-[#5C5A52]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#BF7340] shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2DDD5]/60 mt-auto">
                  <Link
                    to="/contact?service=Custom%20Software%20Development"
                    className="text-xs font-bold text-[#BF7340] hover:text-[#A6612E] inline-flex items-center gap-1"
                  >
                    Discuss similar software systems &rarr;
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 6. PROCESS SECTION ── */}
        <section className="py-24 relative z-10 bg-[#FAF5EF] border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Execution Timeline</span>
              <h2 className="mixed-headline-title">Our Staged Engineering Process</h2>
              <p className="body-md text-[#5C5A52]">
                We avoid guessing games. We execute projects using a transparent, milestone-tracked process with clear contract scopes.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {processSteps.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E2DDD5] p-6 rounded-2xl flex flex-col justify-between min-h-[170px] text-left hover:shadow-3xs transition-shadow duration-200"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#BF7340] block mb-2 uppercase">Stage {item.step}</span>
                    <h3 className="text-xs font-bold text-[#18170F] mb-1.5">{item.title}</h3>
                    <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. PRICING PACKAGES (Keep exact structures) ── */}
        <section id="pricing" className="py-24 relative z-10 bg-white border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Project Pricing</span>
              <h2 className="mixed-headline-title">Clear Scope, Zero Hidden Charges</h2>
              <p className="body-md text-[#5C5A52]">
                Choose the solution matching your business scale. Setup payments are billed 50% upfront and 50% upon final staged approval.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto items-stretch">
              {packagesList.map((plan, i) => {
                if (plan.popular) {
                  return (
                    <div
                      key={plan.name}
                      className="flex flex-col justify-between rounded-2xl border-2 border-[#BF7340] bg-[#131210] p-6 md:p-8 shadow-md text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#BF7340]" />
                      
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#FAF5EF]/60">{plan.name}</span>
                          <span className="text-[9px] bg-[#BF7340] text-[#FAF5EF] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Sparkles size={8} /> Recommended
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-[#BF7340]">{plan.setup}</p>
                          <span className="font-display text-4xl font-bold text-[#F9F8F5]">{plan.price}</span>
                          <p className="text-xs text-[#FAF5EF]/60 font-medium">{plan.monthly}</p>
                        </div>
                        
                        <div className="h-px bg-white/10" />
                        
                        <div className="space-y-2">
                          <p className="text-[9px] uppercase tracking-wider text-[#BF7340] font-bold">Best For</p>
                          <p className="text-xs text-[#FAF5EF]/90 leading-relaxed font-semibold">{plan.bestFor}</p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-[9px] uppercase tracking-wider text-[#FAF5EF]/40 font-bold">Ideal Sector</p>
                          <p className="text-xs text-[#FAF5EF]/80 font-semibold">{plan.businessType}</p>
                        </div>

                        <div className="h-px bg-white/10" />

                        <div className="space-y-3">
                          <p className="text-[9px] uppercase tracking-wider text-[#FAF5EF]/40 font-bold">Included Deliverables</p>
                          <ul className="space-y-2.5 text-xs text-[#FAF5EF]/80">
                            {plan.deliverables.map((feat, f) => (
                              <li key={f} className="flex items-start gap-2.5">
                                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E] mt-0.5">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="pt-8">
                        <a
                          href={WA_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary-forest w-full text-xs font-bold uppercase tracking-wider bg-[#2A4A3E] text-white hover:bg-[#1E3630] border-0 h-11 flex items-center justify-center rounded-lg"
                        >
                          Enquire About {plan.name}
                        </a>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={plan.name}
                    className="flex flex-col justify-between rounded-2xl border border-[#E2DDD5] bg-[#F9F8F5] p-6 md:p-8 shadow-xs hover:shadow-md transition-shadow duration-350 text-left"
                  >
                    <div className="space-y-6">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#8C8A82]">{plan.name}</span>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#BF7340]">{plan.setup}</p>
                        <span className="font-display text-4xl font-bold text-[#18170F]">{plan.price}</span>
                        <p className="text-xs text-[#5C5A52] font-semibold">{plan.monthly}</p>
                      </div>
                      
                      <div className="h-px bg-[#E2DDD5]/60" />
                      
                      <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-wider text-[#BF7340] font-bold">Best For</p>
                        <p className="text-xs text-[#5C5A52] leading-relaxed font-semibold">{plan.bestFor}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-wider text-[#8C8A82] font-bold">Ideal Sector</p>
                        <p className="text-xs text-[#5C5A52] font-semibold">{plan.businessType}</p>
                      </div>

                      <div className="h-px bg-[#E2DDD5]/60" />

                      <div className="space-y-3">
                        <p className="text-[9px] uppercase tracking-wider text-[#8C8A82] font-bold">Included Deliverables</p>
                        <ul className="space-y-2.5 text-xs text-[#5C5A52]">
                          {plan.deliverables.map((feat, f) => (
                            <li key={f} className="flex items-start gap-2.5">
                              <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E] mt-0.5">
                                <Check size={10} strokeWidth={3} />
                              </span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="pt-8">
                      <a
                        href={WA_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-outlined w-full text-xs font-bold uppercase tracking-wider h-11 flex items-center justify-center rounded-lg"
                      >
                        Enquire About {plan.name}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compliant Ad Spends Strip */}
            <div className="max-w-[720px] mx-auto p-5 bg-[#FAF5EF] border border-[#BF7340]/15 rounded-xl text-center">
              <p className="text-[11px] leading-relaxed text-[#5C5A52] font-semibold">
                <strong>Ad Spends Policy Notice:</strong> All digital advertising budgets spent on channels such as Google Search Ads or Meta Paid Ads (Facebook/Instagram) are transacted directly to those platforms by the client and are <strong>strictly separate and excluded</strong> from Trinetra's agency packages fees.
              </p>
            </div>
          </div>
        </section>

        {/* ── 8. ADD-ON SERVICES ── */}
        <section className="py-24 relative z-10 bg-[#FAF5EF] border-b border-[#E2DDD5]/50">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Specific Services</span>
              <h2 className="mixed-headline-title">Add-On Component Pricing</h2>
              <p className="body-md text-[#5C5A52]">
                Need to procure a specific digital component? We offer transparent standard pricing cards for separate deliverables.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {addonGroups.map((group, gi) => (
                <div key={gi} className="bg-white border border-[#E2DDD5] rounded-2xl p-6 shadow-xs text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus size={14} className="text-[#BF7340]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#BF7340]">{group.category}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="flex items-center justify-between border-b border-[#F4F2ED] pb-2 last:border-0 last:pb-0">
                        <span className="text-xs font-semibold text-[#18170F]">{item.name}</span>
                        <span className="text-xs font-bold text-[#BF7340] shrink-0 ml-3">{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={WA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-center gap-2 h-9 rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors"
                  >
                    Enquire about {group.category}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. EXTENSIVE FAQ SECTION ── */}
        <section className="py-24 relative z-10 bg-white border-b border-[#E2DDD5]/50">
          <div className="max-w-[1000px] mx-auto px-4 md:px-10 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="mixed-headline-eyebrow">Questions &amp; Scope Details</span>
              <h2 className="mixed-headline-title">Frequently Asked Questions</h2>
              <p className="body-md text-[#5C5A52]">
                Get transparent, direct information explaining our business policies, pricing structures, and engineering parameters.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 text-left max-w-4xl mx-auto">
              {[
                {
                  q: "What legal entity operates Trinetra Digital Solution?",
                  a: "Trinetra Digital Solution is the official digital growth, technology services, and custom software brand owned and operated legally by the registered entity Charulata Enterprises (Gorakhpur, Uttar Pradesh). All proposals, client invoices, contracts, and banking details are processed strictly under Charulata Enterprises."
                },
                {
                  q: "How are website development milestone payments structured?",
                  a: "Our payments follow a structured 50/50 pathway. We bill 50% upfront to commit scheduling and initiate wireframes on staging servers. The final 50% is billed strictly upon client approval and project sign-off, prior to launching the live domain."
                },
                {
                  q: "Are paid advertisement budgets included in your fees?",
                  a: "No. Advertising budgets spent directly on Google Search Ads or Meta (Facebook/Instagram) Paid Ads are paid directly to those respective companies by the client. Our packages cover strategic campaign configuration, conversion pixel mapping, copy layout, and weekly optimization updates."
                },
                {
                  q: "Do you guarantee search ranking results or lead numbers?",
                  a: "We do not issue misleading guarantees, fixed lead numbers, or promise exact Google search rankings. We build high-performance custom websites, local SEO frameworks, and compliant ad configurations. Actual sales volumes depend entirely on local demand, your product quality, pricing structures, and internal sales speeds."
                },
                {
                  q: "Is ongoing developer support provided post-handover?",
                  a: "Yes. Every custom software and CRM implementation is supported by contract engineering cycles to ensure database security, trace system errors, and execute routine framework upgrades."
                },
                {
                  q: "Can we migrate our existing files and customer logs?",
                  a: "Yes. During our discovery phase, we audit your legacy data models (such as Excel sheets or manual registries) and construct clean CSV formatting routines to safely import your customer records into the new CRM."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-[#FAF5EF] border border-[#E2DDD5] rounded-2xl p-6 shadow-3xs space-y-3">
                  <div className="flex gap-3">
                    <span className="h-6 w-6 rounded-lg bg-white border border-[#E2DDD5] text-[#BF7340] flex items-center justify-center shrink-0 text-xs font-bold">
                      Q
                    </span>
                    <h3 className="text-xs font-bold text-[#18170F] mt-0.5 leading-snug">{faq.q}</h3>
                  </div>
                  <p className="text-[11px] text-[#5C5A52] leading-relaxed font-semibold pl-9 border-l border-[#E2DDD5]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. CONSULTATION CTA & FORM ── */}
        <section id="contact" className="py-24 relative z-10 bg-[#FAF5EF]">
          <div className="max-w-[1200px] mx-auto px-4 md:px-10 grid gap-12 md:grid-cols-[1.1fr_0.9fr] items-start">
            
            {/* Left direct contact details */}
            <div className="space-y-8 text-left">
              <div>
                <span className="mixed-headline-eyebrow">Free Consultation</span>
                <h2 className="mixed-headline-title">Schedule a 1-on-1 Strategy Review</h2>
                <p className="body-md text-[#5C5A52]">
                  Discuss your business growth goals. Complete our secure assessment form below, and our engineering team will evaluate your operational priorities within 2 business hours.
                </p>
              </div>

              <div className="space-y-4">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 border border-[#E2DDD5] bg-white hover:border-[#BF7340] rounded-xl transition-all shadow-xs group"
                >
                  <span className="h-9 w-9 rounded-lg bg-[#E8F5EE] text-[#2D6A4F] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#18170F]">Instant WhatsApp Chat</p>
                    <p className="text-[10px] text-[#8C8A82] font-semibold mt-0.5">Chat directly with a tech representative</p>
                  </div>
                </a>

                <a
                  href="tel:+919334757759"
                  className="flex items-center gap-4 p-4 border border-[#E2DDD5] bg-white hover:border-[#BF7340] rounded-xl transition-all shadow-xs group"
                >
                  <span className="h-9 w-9 rounded-lg bg-[#FAF5EF] text-[#BF7340] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Phone size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#18170F]">+91 9334757759</p>
                    <p className="text-[10px] text-[#8C8A82] font-semibold mt-0.5">Call our office desk (Mon-Sat, 9am - 7pm IST)</p>
                  </div>
                </a>

                {/* GBP Maps integration */}
                <div className="flex items-center gap-4 p-4 border border-[#E2DDD5] bg-white rounded-xl shadow-xs">
                  <span className="h-9 w-9 rounded-lg bg-[#E8F0ED] text-[#2A4A3E] flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#18170F]">Registered Office Address</p>
                    <p className="text-[10px] text-[#8C8A82] font-semibold mt-0.5">Gorakhpur, Uttar Pradesh, India — 273001</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side contact form */}
            <div className="bg-white border border-[#E2DDD5] p-6 md:p-8 rounded-2xl shadow-sm text-left">
              <h3 className="heading-xs text-[#18170F] mb-1 font-bold">Request Project Review</h3>
              <p className="text-[11px] text-[#8C8A82] font-semibold mb-6">Complete all fields. We respond with a structured scope assess proposal.</p>

              <form
                action="https://formspree.io/f/mbdbqbwy"
                method="POST"
                className="space-y-4"
              >
                <div>
                  <label htmlFor="name" className="text-[9.5px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Full Name *</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Anand Varma"
                    className="h-10 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-xs text-[#18170F] focus:outline-none focus:ring-1 focus:ring-[#BF7340] focus:border-[#BF7340] transition-all"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className="text-[9.5px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">WhatsApp / Phone *</label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      required
                      placeholder="e.g. +91 98765 43210"
                      className="h-10 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-xs text-[#18170F] focus:outline-none focus:ring-1 focus:ring-[#BF7340] focus:border-[#BF7340] transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="business" className="text-[9.5px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Business Name</label>
                    <input
                      id="business"
                      type="text"
                      name="business"
                      placeholder="e.g. Varma Enterprises"
                      className="h-10 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 text-xs text-[#18170F] focus:outline-none focus:ring-1 focus:ring-[#BF7340] focus:border-[#BF7340] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="service" className="text-[9.5px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Service interested in *</label>
                  <select
                    id="service"
                    name="service"
                    required
                    className="h-10 w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3 text-xs text-[#18170F] focus:outline-none focus:ring-1 focus:ring-[#BF7340] focus:border-[#BF7340] transition-all cursor-pointer"
                  >
                    <option value="">Select option...</option>
                    <option value="Website Development">Website Development</option>
                    <option value="Local SEO & Opportunities">Local SEO &amp; Opportunities</option>
                    <option value="CRM Pipeline Automation">CRM Pipeline Automation</option>
                    <option value="Custom Business Software">Custom Business Software</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="requirements" className="text-[9.5px] font-bold text-[#8C8A82] uppercase tracking-widest block mb-1.5">Project Goals *</label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    required
                    rows={4}
                    placeholder="Briefly describe your business operation, requirements, and target timeline..."
                    className="w-full rounded-lg border border-[#E2DDD5] bg-[#F9F8F5] px-3.5 py-2.5 text-xs text-[#18170F] focus:outline-none focus:ring-1 focus:ring-[#BF7340] focus:border-[#BF7340] transition-all resize-none"
                  />
                </div>

                {/* Consent checkbox for Meta/Google/WhatsApp policies */}
                <div className="flex items-start gap-2.5 py-1">
                  <input
                    id="policy-consent"
                    type="checkbox"
                    required
                    className="mt-0.5 rounded border-[#E2DDD5] text-[#2A4A3E] focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <label htmlFor="policy-consent" className="text-[10px] text-[#8C8A82] font-semibold leading-tight cursor-pointer">
                    I agree to the <Link to="/privacy-policy" className="text-[#BF7340] hover:underline">Privacy Policy</Link> and authorize Trinetra representatives to contact me via phone or WhatsApp.
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary-forest w-full h-11 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
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
