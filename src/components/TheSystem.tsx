import { useRef } from "react";
import { Check, ArrowUpRight, Globe, Cpu, BarChart } from "lucide-react";
import { gsap, useGSAP } from "../lib/gsap";
import LazyVideo from "./LazyVideo";

export default function TheSystem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current || !railRef.current) return;

    // Responsive: only run horizontal pin on desktop screens (>=1024px)
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const scrollWidth = railRef.current!.scrollWidth;
      const windowWidth = window.innerWidth;
      
      gsap.to(railRef.current, {
        x: -(scrollWidth - windowWidth),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 1,
          start: "top top",
          end: () => `+=${scrollWidth - windowWidth}`,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => mm.revert();
  }, { scope: containerRef });

  const systemSteps = [
    {
      num: "01",
      tag: "DIGITAL PRESENCE",
      icon: <Globe size={18} />,
      title: "Establishing digital legitimacy",
      desc: "We construct high-end, responsive websites from scratch that establish trust instantly and convert random traffic into highly qualified lead calls.",
      bullets: [
        "SEO-ready code architecture for organic visibility",
        "Fine animations and clean glassmorphic components",
        "Integrated Meta pixel and analytics conversion tracking",
        "Lightning-fast load times optimized for Vercel/CDN"
      ],
      video: "/videos/build-growth-automate.mp4",
      link: "services-website"
    },
    {
      num: "02",
      tag: "AUTOMATION & CRM",
      icon: <Cpu size={18} />,
      title: "Consolidating operational pipelines",
      desc: "Connect your incoming leads instantly. We deploy WhatsApp auto-responders and build central CRM databases so your sales team focus on closures.",
      bullets: [
        "Inbound WhatsApp lead auto-responders (2-sec delay)",
        "Drag-and-drop Kanban deal pipeline with probability metrics",
        "Automated follow-up campaigns and cron notification agents",
        "Developer Settings dashboard for internal analytics tracking"
      ],
      video: "/videos/why-tinetra.mp4",
      link: "services-crm"
    },
    {
      num: "03",
      tag: "SEO & ACQUISITION",
      icon: <BarChart size={18} />,
      title: "Systematizing inbound traffic",
      desc: "Generate continuous, qualified traffic for your services. We manage local SEO rankings, review collection loops, and target paid advertising.",
      bullets: [
        "Google Business Profile optimization and review campaigns",
        "Technical audit frameworks and keyword architecture setup",
        "Meta Ads and Google Search console conversions",
        "Comprehensive monthly ROI and attribution reporting"
      ],
      video: "/videos/pricing.mp4",
      link: "services-marketing"
    }
  ];

  return (
    <section
      ref={containerRef}
      className="relative bg-[#090808] border-b border-border overflow-hidden select-none"
    >
      {/* Background ambient gold ray radial glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_50%_50%,rgba(194,109,92,0.04)_0%,transparent_60%)] blur-3xl pointer-events-none" />

      {/* ── MOBILE / TABLET VIEW (Standard Stacked layouts) ── */}
      <div className="block lg:hidden py-24 px-6 space-y-16">
        <div className="text-center max-w-xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#c26d5c]/10 border border-[#c26d5c]/25 rounded-full text-accent font-mono text-[9px] uppercase tracking-wider">
            The Trinetra Core System
          </span>
          <h2 className="font-display text-[clamp(28px,4.5vw,44px)] font-light text-ink-1 leading-tight">
            One integration. <br />Every growth capability.
          </h2>
        </div>

        <div className="space-y-12 max-w-lg mx-auto">
          {systemSteps.map((step, idx) => (
            <div key={idx} className="bg-[#111010] border border-border rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-mono text-accent text-xs font-semibold">{step.num} / {step.tag}</span>
                <span className="h-8 w-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-accent">
                  {step.icon}
                </span>
              </div>
              <h3 className="font-editorial text-2xl italic text-ink-1 leading-none">{step.title}</h3>
              <p className="text-xs text-ink-2 leading-relaxed">{step.desc}</p>
              
              <div className="rounded-xl border border-border overflow-hidden relative aspect-video bg-[#090808]">
                <LazyVideo src={step.video} className="absolute inset-0 w-full h-full object-cover" />
              </div>

              <ul className="space-y-2 pt-2 border-t border-border">
                {step.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-ink-2 font-semibold">
                    <span className="h-4.5 w-4.5 rounded-full bg-[#c26d5c]/15 text-accent border border-[#c26d5c]/25 flex items-center justify-center shrink-0">
                      <Check size={10} />
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── DESKTOP STICKY SCROLL RAIL VIEW (GSAP Horizontal) ── */}
      <div className="hidden lg:block">
        <div
          ref={railRef}
          className="flex h-screen items-center"
          style={{ width: `${systemSteps.length * 100}vw` }}
        >
          {/* Header intro slide */}
          <div className="w-[85vw] h-full flex flex-col justify-center px-24 shrink-0 text-left space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c26d5c]/10 border border-[#c26d5c]/20 rounded-full text-accent font-mono text-[10px] uppercase tracking-wider w-fit">
              The Trinetra Core System
            </span>
            <h2 className="font-display text-[clamp(44px,5.5vw,72px)] font-light text-ink-1 leading-[1.05] tracking-tight">
              One engineering partner. <br />
              <span className="font-editorial italic text-accent font-light">Every growth engine</span> <br />
              consolidated in one OS.
            </h2>
            <p className="text-base text-ink-2 max-w-xl leading-relaxed">
              We design, build, and optimize every layer of your customer acquisition and operations pipeline. Scroll to reveal the pillars.
            </p>
            <div className="text-xs font-mono text-accent/50 flex items-center gap-1.5 pt-4">
              <span>Scroll to navigate</span> &rarr;
            </div>
          </div>

          {/* Core step slides */}
          {systemSteps.map((step, idx) => (
            <div
              key={idx}
              className="system-slide w-screen h-full flex items-center justify-center shrink-0 px-24"
            >
              <div className="w-full max-w-[1200px] h-[75vh] grid grid-cols-12 gap-16 items-center">
                
                {/* Left Column: Widescreen Typography */}
                <div className="col-span-6 text-left space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[56px] font-thin text-[#c26d5c]/15 leading-none">{step.num}</span>
                    <div className="h-px bg-border flex-grow" />
                    <span className="font-mono text-accent text-[10px] font-bold tracking-[0.2em] uppercase">{step.tag}</span>
                  </div>

                  <h3 className="font-editorial text-[clamp(32px,3.8vw,52px)] italic text-ink-1 leading-none tracking-normal">
                    {step.title}
                  </h3>

                  <p className="text-sm text-ink-2 leading-relaxed">
                    {step.desc}
                  </p>

                  <ul className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                    {step.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-ink-2 font-semibold">
                        <span className="h-4.5 w-4.5 rounded-full bg-[#c26d5c]/12 text-accent border border-[#c26d5c]/20 flex items-center justify-center shrink-0">
                          <Check size={10} />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Column: High Fidelity Browser Mock video */}
                <div className="col-span-6 flex justify-center">
                  <div className="w-full max-w-[480px] bg-[#111010] border border-border rounded-2xl p-3 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative group transition-transform duration-300 hover:scale-[1.01]">
                    {/* Browser top-bar mock */}
                    <div className="flex justify-between items-center pb-2 border-b border-border mb-3 px-2">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 rounded-full bg-red-500/30 group-hover:bg-red-500 transition-colors" />
                        <span className="w-2 h-2 rounded-full bg-yellow-500/30 group-hover:bg-yellow-500 transition-colors" />
                        <span className="w-2 h-2 rounded-full bg-green-500/30 group-hover:bg-green-500 transition-colors" />
                      </div>
                      <span className="text-slate-500 font-mono text-[9px]">trinetradigital.com/{step.link}</span>
                      <ArrowUpRight size={10} className="text-slate-600" />
                    </div>

                    {/* Widescreen Video container */}
                    <div className="rounded-xl border border-border overflow-hidden relative aspect-video bg-[#090808]">
                      <LazyVideo src={step.video} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
