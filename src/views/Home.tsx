import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { trackLead, trackContact } from "../utils/metaPixel";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
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
import HeroScrollSequence from "../components/HeroScrollSequence";

// Centralized GSAP and custom typography utilities
import { gsap, useGSAP } from "../lib/gsap";
import SplitText from "../components/ui/SplitText";

export default function Home() {
  const location = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLHeadingElement>(null);
  const line2Ref = useRef<HTMLHeadingElement>(null);
  const line3Ref = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const sphereContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  useGSAP(() => {
    // 1. Entrance animation on load
    const tl = gsap.timeline({ defaults: { ease: "editorial-spring" } });
    
    // Animate grid fading in and scaling slightly
    tl.fromTo(gridRef.current, 
      { opacity: 0, scale: 1.05 },
      { opacity: 0.08, scale: 1, duration: 1.8 }
    );

    // Slide in line 1 and 3 from opposite sides
    tl.fromTo(line1Ref.current,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.2 },
      "-=1.4"
    );

    tl.fromTo(line3Ref.current,
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.2 },
      "-=1.2"
    );

    // Animate letters of line 2 rising up
    const chars = line2Ref.current?.querySelectorAll(".origin-bottom");
    if (chars && chars.length > 0) {
      tl.fromTo(chars,
        { y: "130%", rotate: 2 },
        { y: "0%", rotate: 0, duration: 1.2, stagger: 0.015 },
        "-=1.2"
      );
    }

    // Animate description, CTAs, shortcuts, and trust badge fading and rising
    tl.fromTo([descRef.current, ctasRef.current, shortcutsRef.current, trustRef.current],
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.12 },
      "-=0.7"
    );

    // Animate 3D Canvas scaling up and rotating slightly into place
    if (sphereContainerRef.current) {
      tl.fromTo(sphereContainerRef.current,
        { opacity: 0, scale: 0.75 },
        { opacity: 1, scale: 1, duration: 1.6, ease: "warm-out" },
        "-=1.2"
      );
    }

    // 2. Scroll-Triggered Kinetic Layout Parallax
    if (heroRef.current) {
      // Line 1 moves Left on scroll
      gsap.fromTo(line1Ref.current,
        { x: 0, opacity: 1 },
        {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
          x: -80,
          opacity: 0.15,
          ease: "none"
        }
      );

      // Line 2 moves Right on scroll
      gsap.fromTo(line2Ref.current,
        { x: 0, opacity: 1 },
        {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
          x: 60,
          opacity: 0.2,
          ease: "none"
        }
      );

      // Line 3 moves Left on scroll
      gsap.fromTo(line3Ref.current,
        { x: 0, opacity: 1 },
        {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
          x: -40,
          opacity: 0.15,
          ease: "none"
        }
      );

      // Description moves slightly up and fades
      gsap.fromTo(descRef.current,
        { y: 0, opacity: 1 },
        {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
          y: -20,
          opacity: 0.1,
          ease: "none"
        }
      );

      // 2D Trinetra Eye container scales up slightly and shifts opacity
      gsap.fromTo(sphereContainerRef.current,
        { scale: 1, y: 0, rotation: 0, opacity: 1 },
        {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
          scale: 1.12,
          y: 30,
          rotation: 0.4,
          opacity: 0.3,
          ease: "none"
        }
      );

      // Background mesh grid shifts down
      gsap.fromTo(gridRef.current,
        { y: 0, opacity: 0.08 },
        {
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
          y: 50,
          opacity: 0.02,
          ease: "none"
        }
      );
    }
  }, { scope: heroRef });

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
          className="relative min-h-[92svh] md:min-h-[100svh] flex items-center justify-center pt-24 pb-12 overflow-hidden bg-base"
        >
          {/* Elegant geometric warm bronze mesh grid background */}
          <div
            ref={gridRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(197, 168, 128, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(197, 168, 128, 0.06) 1px, transparent 1px)`,
              backgroundSize: "100px 100px",
              backgroundPosition: "center center",
            }}
          />

          <div className="mx-auto max-w-[1300px] w-full px-6 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            
            {/* Left Column: Headline and CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start gap-8 z-20">
              
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full border border-border">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-accent uppercase">
                  PIONEERING BUSINESS AUTOMATION
                </span>
              </div>

              {/* Main headline - Kinetic Horizontal Slit reveals */}
              <div className="flex flex-col gap-1 overflow-hidden select-none w-full">
                <h1
                  ref={line1Ref}
                  className="font-display text-[clamp(26px,4.2vw,44px)] font-light leading-none tracking-tight text-ink-1 uppercase whitespace-nowrap"
                >
                  We engineer foundations
                </h1>
                <h2
                  ref={line2Ref}
                  className="font-editorial text-[clamp(36px,5.8vw,68px)] italic text-accent font-light leading-none tracking-normal whitespace-nowrap overflow-hidden py-1"
                >
                  <SplitText mode="chars">that lead &amp; scale</SplitText>
                </h2>
                <h3
                  ref={line3Ref}
                  className="font-display text-[clamp(26px,4.2vw,44px)] font-light leading-none tracking-tight text-ink-1 uppercase whitespace-nowrap"
                >
                  your business.
                </h3>
              </div>

              {/* Subtitle */}
              <p
                ref={descRef}
                className="text-sm md:text-base text-ink-2 leading-relaxed max-w-xl font-medium"
              >
                We construct high-end websites, build secure CRM pipelines, and integrate conversational AI systems to eliminate manual inefficiencies and scale your revenue.
              </p>

              {/* CTA Row */}
              <div
                ref={ctasRef}
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
                  className="inline-flex items-center justify-center h-11 px-5 rounded-lg border border-border bg-surface-1 text-ink-1 hover:bg-surface-2 transition-colors text-xs font-semibold uppercase tracking-wider backdrop-blur-md"
                >
                  Explore Pricing
                </a>

                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContact()}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-[#c5a880]/10 border border-[#c5a880]/20 text-accent hover:bg-[#c5a880]/20 transition-all text-xs font-semibold"
                >
                  💬 WhatsApp Us
                </a>
              </div>

              {/* Quick nav shortcuts */}
              <div
                ref={shortcutsRef}
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
                    className="inline-flex items-center h-8 px-3 rounded-md border border-border bg-surface-1 hover:bg-surface-2 text-[10px] font-semibold text-ink-3 transition-colors font-mono tracking-wide"
                  >
                    {pathway.label} →
                  </a>
                ))}
              </div>

              {/* Trust proof strip */}
              <div
                ref={trustRef}
                className="flex items-center gap-3 mt-4"
              >
                <div className="flex -space-x-2">
                  {['T', 'D', 'S', 'A'].map((char, i) => (
                    <span
                      key={i}
                      className="h-7 w-7 rounded-full border border-border bg-surface-1 flex items-center justify-center text-[9px] font-mono font-bold text-ink-2"
                    >
                      {char}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-ink-3 font-semibold font-mono uppercase tracking-wider">
                  Serving professional brands across India
                </p>
              </div>
            </div>

            {/* Right Column: Immersive Pinned Hero Scroll Sequence */}
            <div 
              ref={sphereContainerRef}
              className="lg:col-span-5 relative w-full aspect-square flex items-center justify-center"
            >
              <HeroScrollSequence />
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-6 z-20 flex flex-col items-center gap-1.5"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            <span className="text-[9px] font-mono font-bold text-ink-4 uppercase tracking-[0.2em]">
              Scroll
            </span>
            <div
              className="w-5 h-7 rounded-full border border-border flex items-start justify-center pt-1.5"
            >
              <div className="w-0.5 h-1.5 rounded-full bg-accent/60" />
            </div>
          </div>
        </section>

        {/* ── 2. FEATURED PROJECTS (CREDIBILITY UPFRONT) ── */}
        <div className="bg-transparent py-24 border-b border-white/5">
          <Testimonials />
        </div>

        {/* ── 3. THE PROBLEM SECTION ── */}
        <TheProblem />

        {/* ── 4. THE SYSTEM (SOLUTION) SECTION ── */}
        <TheSystem />

        {/* ── 5. SERVICES BENTO GRID (4 PILLARS) ── */}
        <section className="py-24 relative z-10 bg-transparent border-b border-border">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 space-y-16">
            
            {/* Bento Header */}
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider">
                Our Core Expertise
              </span>
              <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight">
                Tailored Software &amp; Growth Systems
              </h2>
              <p className="body-md text-ink-2 max-w-[480px] mx-auto">
                We design and engineer high-fidelity solutions tailored explicitly according to your enterprise requirements.
              </p>
            </div>

            {/* Bento Layout Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto">
              
              {/* Card 1: Website Development (Span 2) */}
              <div id="services-website" className="md:col-span-2 bg-[#111010] border border-border p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-start md:items-center justify-between text-left hover:border-accent/30 hover:shadow-[0_0_30px_rgba(194,109,92,0.05)] group transition-all duration-300">
                <div className="space-y-5 max-w-sm">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-border text-accent shadow-xs">
                    <Globe size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 uppercase tracking-wider font-mono">Website Development</h3>
                  <p className="text-[11.5px] text-ink-2 leading-relaxed">
                    Fully responsive, highly optimized custom websites constructed from scratch. We build sites that convey legitimacy and turn traffic into leads.
                  </p>
                  <ul className="grid grid-cols-2 gap-2 text-[10px] text-ink-3 font-semibold font-mono">
                    <li>• Business &amp; Company Sites</li>
                    <li>• Landing Pages &amp; Funnels</li>
                    <li>• Responsive Layouts</li>
                    <li>• Third-Party Integrations</li>
                  </ul>
                  <div className="pt-4 border-t border-border w-fit">
                    <Link to="/contact?service=Website%20Development" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer">
                      Enquire About Websites &rarr;
                    </Link>
                  </div>
                </div>
                
                {/* Visual mock right side */}
                <div className="w-full md:w-64 aspect-[4/3] rounded-xl border border-border bg-surface-2 p-3 shadow-inner relative overflow-hidden shrink-0">
                  <div className="h-full border border-border/40 rounded-lg bg-[#090808]/80 p-3 space-y-2">
                    <div className="h-1.5 w-1/3 bg-accent/25 rounded" />
                    <div className="h-8 bg-surface-2 rounded border border-border/20" />
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="h-6 bg-surface-2 rounded border border-border/10" />
                      <div className="h-6 bg-surface-2 rounded border border-border/10" />
                      <div className="h-6 bg-surface-2 rounded border border-border/10" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: SEO & Digital Marketing (Span 1) */}
              <div id="services-marketing" className="md:col-span-1 bg-[#111010] border border-border p-8 rounded-2xl flex flex-col justify-between text-left hover:border-accent/30 hover:shadow-[0_0_30px_rgba(194,109,92,0.05)] group transition-all duration-300">
                <div className="space-y-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-border text-accent shadow-xs">
                    <BarChart3 size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 uppercase tracking-wider font-mono">SEO &amp; Digital Marketing</h3>
                  <p className="text-[11.5px] text-ink-2 leading-relaxed">
                    Improve online presence and generate qualified enquiries through search rankings and target ad campaigns.
                  </p>
                  <ul className="space-y-2 text-[10px] text-ink-3 font-semibold font-mono">
                    <li>• Google &amp; Meta Ads</li>
                    <li>• Local Business SEO</li>
                    <li>• Conversion Pixels</li>
                    <li>• Attribution Reports</li>
                  </ul>
                </div>
                
                <div className="pt-6 border-t border-border mt-6">
                  <Link to="/contact?service=Digital%20Marketing" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer">
                    Enquire About Marketing &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 3: CRM Development (Span 1, Highlighted) */}
              <div id="services-crm" className="md:col-span-1 bg-[#181312] border border-[#c26d5c]/35 p-8 rounded-2xl flex flex-col justify-between text-left relative overflow-hidden shadow-2xl hover:border-[#c26d5c]/60 transition-all duration-300 group">
                <div className="space-y-5 z-10">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#c26d5c]/10 text-accent border border-[#c26d5c]/20 shadow-xs">
                      <Database size={16} />
                    </span>
                    <span className="text-[8px] bg-accent text-[#090808] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                      Most Requested
                    </span>
                  </div>
                  
                  <h3 className="text-xs font-bold text-ink-1 uppercase tracking-wider font-mono">Automation &amp; CRM</h3>
                  <p className="text-[11.5px] text-ink-2 leading-relaxed">
                    Custom-built software pipelines tailored exactly to your operational workflows. Streamline follow-ups, align teams, and organize records.
                  </p>
                  
                  <ul className="space-y-2 text-[10px] text-ink-3 font-semibold font-mono">
                    <li>• Lead &amp; Pipeline Tracking</li>
                    <li>• WhatsApp Auto Alerts</li>
                    <li>• Role-Based Secure Access</li>
                    <li>• Custom CRM Dashboards</li>
                  </ul>
                </div>
                
                <div className="pt-6 border-t border-[#c26d5c]/20 mt-6 z-10">
                  <Link to="/contact?service=CRM%20Development" className="text-xs font-bold text-accent hover:text-ink-1 inline-flex items-center gap-1 cursor-pointer">
                    Enquire About Automation &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 4: Custom Software Dev (Span 2) */}
              <div id="services-software" className="md:col-span-2 bg-[#111010] border border-border p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-start md:items-center justify-between text-left hover:border-accent/30 hover:shadow-[0_0_30px_rgba(194,109,92,0.05)] group transition-all duration-300">
                <div className="space-y-5 max-w-sm">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-border text-accent shadow-xs">
                    <Layers size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-ink-1 uppercase tracking-wider font-mono">Custom Software Dev</h3>
                  <p className="text-[11.5px] text-ink-2 leading-relaxed">
                    Tailored dashboards, ERP modules, inventory management systems, booking platforms and custom reporting built specifically for your rules.
                  </p>
                  <ul className="grid grid-cols-2 gap-2 text-[10px] text-ink-3 font-semibold font-mono">
                    <li>• Operations Panels</li>
                    <li>• Secure Database Architectures</li>
                    <li>• Legacy API Integrations</li>
                    <li>• Modular Scalable Code</li>
                  </ul>
                  <div className="pt-4 border-t border-border w-fit">
                    <Link to="/contact?service=Custom%20Project" className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer">
                      Enquire About Software &rarr;
                    </Link>
                  </div>
                </div>

                {/* Visual node flowchart right side */}
                <div className="w-full md:w-64 aspect-[4/3] rounded-xl border border-border bg-surface-2 p-4 shadow-inner relative flex items-center justify-center shrink-0">
                  <div className="space-y-3 w-full max-w-[160px] font-mono text-[9px] text-ink-3">
                    <div className="flex justify-between items-center bg-[#090808]/80 px-2.5 py-1 rounded border border-border/20">
                      <span>API Gateway</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    </div>
                    <div className="h-4.5 w-0.5 bg-accent/40 mx-auto" />
                    <div className="flex justify-between items-center bg-[#090808]/80 px-2.5 py-1 rounded border border-border/20">
                      <span>Database Node</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    </div>
                  </div>
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
        <section className="py-28 relative z-10 bg-transparent border-b border-border">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider">
                Industries We Serve
              </span>
              <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight">
                Tailored Solutions for Your Sector
              </h2>
              <p className="body-md text-ink-2">
                We don't build generic templates. We build custom solutions designed around the specific operations of your business category.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {[
                { title: "Healthcare & Clinics", desc: "Patient appointment scheduling, automated WhatsApp reminder follow-ups, and clinic landing pages.", icon: Activity },
                { title: "Real Estate & Developers", desc: "Property listing architectures, lead capture workflows, and integration with CRM status dashboards.", icon: Compass },
                { title: "Coaching & Education", desc: "Course enrollment funnels, student inquiry systems, and automated welcome follow-up alerts.", icon: Users },
                { title: "Local Service Businesses", desc: "Google Business Profile local SEO setup, booking calendars, and WhatsApp call-to-action integrations.", icon: Zap },
                { title: "B2B & Professional Services", desc: "Corporate website development, lead qualifying pipelines, and secure database workflows.", icon: ShieldCheck },
                { title: "Retail & E-commerce", desc: "Digital catalog configurations, order inquiry systems, and payment gateway configurations.", icon: Globe },
              ].map((ind, i) => (
                <div key={i} className="bg-[#111010] border border-border p-7 rounded-2xl space-y-4 text-left transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(194,109,92,0.05)] group">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-accent border border-border group-hover:bg-[#c26d5c]/10 group-hover:border-[#c26d5c]/20 transition-colors">
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
         <section ref={whyTrinetraRef} className="py-28 relative z-10 bg-transparent border-b border-border">
           <div className="max-w-[1280px] mx-auto px-6 md:px-12 space-y-16">
             <div className="text-center max-w-xl mx-auto space-y-4">
               <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider">
                 Institutional Integrity
               </span>
               <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight">
                 Designed for long-term trust
               </h2>
               <p className="body-md text-ink-2">
                 Bypass exaggerated promises. Upgraded technology and marketing services designed with compliance, transparency, and structure.
               </p>
             </div>

             <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-start max-w-5xl mx-auto">
               {/* Left Column: 6 Benefits Grid */}
               <div className="grid gap-4 sm:grid-cols-2 w-full">
                 {trustItems.map((item, i) => (
                   <div key={i} className="bg-[#111010] border border-border p-6 rounded-2xl space-y-3 text-left transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(194,109,92,0.05)] group">
                     <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-accent border border-border group-hover:bg-[#c26d5c]/10 group-hover:border-[#c26d5c]/20 transition-colors">
                       <item.icon size={14} />
                     </span>
                     <h3 className="text-xs font-bold text-ink-1 font-mono uppercase tracking-wider">{item.title}</h3>
                     <p className="text-[11px] text-ink-2 leading-relaxed font-semibold">{item.desc}</p>
                   </div>
                 ))}
               </div>

               {/* Right Column: Sticky connected ecosystem loop */}
               <div className="bg-[#111010] border border-border p-5 rounded-2xl shadow-2xl text-left h-fit lg:sticky lg:top-28 w-full max-w-[380px] mx-auto lg:mr-0">
                 <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                   <span className="text-[9px] font-mono font-bold text-ink-3 uppercase tracking-widest">Ecosystem Integration</span>
                   <span className="flex items-center gap-1.5 text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                     <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                     Synced Database
                   </span>
                 </div>
                 <div style={{ position: "relative", aspectRatio: "16/9" }} className="rounded-lg border border-border shadow-2xl overflow-hidden mb-4">
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
        <section className="py-28 relative z-10 bg-transparent border-b border-border">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider">
                How We Work
              </span>
              <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight">
                Our Staged Process
              </h2>
              <p className="body-md text-ink-2">
                We avoid guesswork. We follow a structured, transparent process with clear milestones from the initial call to post-launch support.
              </p>
            </div>

            <div className="relative">
              {/* Process connector line for desktop */}
              <div className="hidden lg:block absolute top-[50%] left-6 right-6 h-[1px] bg-gradient-to-r from-[#c26d5c]/0 via-[#c26d5c]/25 to-[#c26d5c]/0 z-0 -translate-y-1/2" />
              
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5 relative z-10">
                {[
                  { step: "01", title: "Discovery", desc: "We discuss your business needs, analyze competitors, and outline technical requirements." },
                  { step: "02", title: "Strategy & Scope", desc: "We define precise page structures, database schemas, and milestone timelines." },
                  { step: "03", title: "Custom Build", desc: "We write clean code (no bloated page builders) and set up custom backend configurations." },
                  { step: "04", title: "Staging & Review", desc: "You review and test the solution on a private staging link before final delivery." },
                  { step: "05", title: "Launch & Support", desc: "We migrate your site live, index search engines, and begin contract support." }
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#111010] border border-border p-6 rounded-2xl text-left transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(194,109,92,0.05)] flex flex-col justify-between min-h-[190px] group">
                    <div>
                      <span className="font-mono text-[28px] font-thin text-[#c26d5c]/15 leading-none block mb-3">{item.step}</span>
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
        <div id="pricing" className="bg-transparent border-b border-border">
          <Pricing />
        </div>

        {/* ── 10. FAQS SECTION ── */}
        <section className="py-28 relative z-10 bg-transparent border-b border-border">
          <div className="max-w-[1000px] mx-auto px-6 md:px-12 space-y-16">
            <div className="text-center max-w-xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider">
                FAQ
              </span>
              <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight">
                Pricing &amp; Scope Questions
              </h2>
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
                    className="bg-[#111010] border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-accent/20"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
                    >
                      <h3 className="text-xs sm:text-sm font-bold text-ink-1 font-mono uppercase tracking-wider pr-4">
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
                          <div className="px-6 pb-6 pt-1 border-t border-border text-[11px] sm:text-[12px] text-ink-2 leading-relaxed font-semibold">
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
        <section id="contact" className="py-28 bg-transparent relative z-10">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid gap-12 md:grid-cols-[1fr_1.3fr] items-start">
            
            {/* Direct Info panel */}
            <div className="space-y-8 text-left">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider mb-4">
                  Book A Consultation
                </span>
                <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight mt-3">
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
