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
  Activity
} from "lucide-react";
import SEO from "../components/seo/SEO";

export default function Home() {
  const location = useLocation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [demoStep, setDemoStep] = useState(0);

  // Auto-cycle the live AI Qualification product demo in hero
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

  return (
    <>
      <SEO
        title="Trinetra Digital Solution — Next-Gen AI WhatsApp Automation & CRM"
        description="Trinetra Digital Solution builds next-generation AI-powered WhatsApp automation and CRM operating systems for hyper-growth businesses. Qualify leads, send broadcasts, and scale operations automatically."
        canonical="https://trinetradigitalsolution.com/"
      />

      <div className="min-h-screen bg-[#F8F9FA] text-slate-800 relative overflow-hidden font-sans pt-12">
        {/* Futuristic glowing blur orbits */}
        <div className="absolute top-[5%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/35 to-teal-200/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-amber-100/20 to-orange-200/15 rounded-full blur-[140px] pointer-events-none" />
        
        {/* ── 1. FUTURISTIC HERO WIDGET ── */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-8 text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-800 text-[10px] font-bold tracking-wider uppercase"
            >
              <Sparkles size={12} className="animate-spin-slow" />
              SaaS AI CRM Operating System
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black font-display tracking-tight leading-[1.08] text-slate-900"
            >
              Your pipeline on <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 bg-clip-text text-transparent font-black italic">Conversational Autopilot</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl font-medium"
            >
              Trinetra connects high-performance WhatsApp Baileys nodes with Gemini AI to convert raw customer conversations into fully structured, qualified leads and won deals inside a state-of-the-art drag-and-drop CRM.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3.5"
            >
              <Link
                to="/admin"
                className="h-11 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] transition-all shadow-sm"
              >
                Launch CRM Console <ArrowRight size={14} />
              </Link>
              <a
                href="#pricing"
                className="h-11 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-3xs"
              >
                View SaaS Pricing
              </a>
            </motion.div>

            {/* Social proof index */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-3 border-t border-slate-200/60 pt-6"
            >
              <div className="flex -space-x-2">
                {['T', 'D', 'S', 'A'].map((char, i) => (
                  <span key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 shadow-3xs">{char}</span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Powering automation workflows for <b className="text-slate-700 font-bold">120+ scaling enterprises</b>.</p>
            </motion.div>
          </div>

          {/* Right Hero Side: Dynamic Live Walkthrough Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl p-5 md:p-6 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden"
          >
            <div className="absolute top-3 left-4 flex gap-1.5 opacity-60">
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
            </div>

            <div className="mb-6 mt-1 flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Telemetry Flow</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shadow-3xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Gemini Pipeline
              </span>
            </div>

            {/* Simulated Live Processing timeline */}
            <div className="space-y-4 text-left">
              <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-3xs flex items-start gap-3">
                <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><MessageSquare size={13} /></span>
                <div>
                  <div className="flex justify-between items-center w-full"><span className="text-[10px] font-bold text-slate-700">WhatsApp Query Inbound</span> <span className="text-[8px] text-slate-400 font-mono">11:02 AM</span></div>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">"Looking for automated pharmacy inventory CRM setup. Budget is 2.5L..."</p>
                </div>
              </div>

              {demoStep >= 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-amber-200 bg-amber-50/20 p-3.5 rounded-2xl shadow-3xs flex items-start gap-3 ring-1 ring-amber-100"
                >
                  <span className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Sparkles size={13} /></span>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-700">AI Intent Qualification</span>
                    <p className="text-[11px] text-amber-700 font-mono mt-0.5 font-bold">Analyzing BANT Score...</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] font-bold bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-lg shadow-3xs">Score: 94%</span>
                      <span className="text-[9px] font-bold bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-lg shadow-3xs">Budget: Qualified ✓</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {demoStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-3xs flex items-start gap-3"
                >
                  <span className="h-7 w-7 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center shrink-0"><Zap size={13} /></span>
                  <div>
                    <span className="text-[10px] font-bold text-slate-700">Auto CRM Record Generated</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-bold">Category: Wholesale Medical Distribution</p>
                  </div>
                </motion.div>
              )}

              {demoStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-tr from-emerald-600 to-teal-600 border border-emerald-500/20 p-3.5 rounded-2xl shadow-sm text-white flex items-start gap-3"
                >
                  <span className="h-7 w-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0"><Check size={13} /></span>
                  <div>
                    <span className="text-[10px] font-bold">WhatsApp Follow-up Scheduled</span>
                    <p className="text-[11px] opacity-90 italic mt-0.5">"Auto-reply: Demo slot secured for Sharma Medicos at 3 PM tomorrow ✓"</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── 2. FEATURE GRIDS SECTION ── */}
        <section className="py-20 relative z-10 bg-white border-y border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display">Engineered for Operational Scale</h2>
              <p className="text-xs text-slate-400 font-medium">Bypass obsolete setups. Upgrade to Trinetra's unified AI automation system.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {[
                { title: "Multi-Key WhatsApp", desc: "Powered by Baileys multi-file credential architectures, maintaining 100% paired uptime without connection drops.", icon: MessageSquare, bg: "bg-emerald-50 text-emerald-600" },
                { title: "Gemini BANT Evaluator", desc: "Qualifies target client budgets, timelines, authority, and need automatically via secure prompts.", icon: Sparkles, bg: "bg-amber-50 text-amber-600" },
                { title: "Drag-and-Drop Pipelines", desc: "Organize visual lead cards across vertical CRM status lanes. Sync updates with localized SQLite DBs.", icon: TrendingUp, bg: "bg-blue-50 text-blue-600" },
                { title: "Broadcast Automation", desc: "Design and broadcast message campaigns to targeted pipeline cohorts, scheduling trigger rules cleanly.", icon: Zap, bg: "bg-indigo-50 text-indigo-600" },
                { title: "Secure Startup Validators", desc: "Auto-checks JWT secrets, environment payloads, and process memories to shield server runtime safety.", icon: ShieldCheck, bg: "bg-rose-50 text-rose-600" },
                { title: "High-Performance Nodes", desc: "Built with WAL-journaled SQLite databases and PM2 single-instance fork-locks to operate efficiently on low-cost VPS.", icon: Activity, bg: "bg-slate-50 text-slate-600" }
              ].map((feat, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200/80 p-6 rounded-3xl space-y-4 hover:bg-white hover:shadow-3xs transition-all text-left">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${feat.bg} shadow-3xs`}>
                    <feat.icon size={16} />
                  </span>
                  <h3 className="text-xs font-bold text-slate-800">{feat.title}</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. SAAS PRICING MATRIX ── */}
        <section id="pricing" className="py-24 relative z-10">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight font-display">Optimized SaaS Billing</h2>
              <p className="text-xs text-slate-400 font-medium">Choose a flexible operating plan customized to your messaging volume.</p>
              
              {/* Billing Cycle Switcher */}
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl mt-4">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    billingCycle === 'monthly' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Monthly billing
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    billingCycle === 'annual' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Annual Save 20%
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {[
                { name: "Automation Growth", price: billingCycle === 'monthly' ? "$49" : "$39", desc: "Ideal for scaling local retail distribution setups.", features: ["3,000 WhatsApp monthly credits", "Standard SQLite database storage", "AI qualification scoring", "Email integrations support", "1 active team seat"], popular: false },
                { name: "SaaS Scale Core", price: billingCycle === 'monthly' ? "$99" : "$79", desc: "Best for high-volume sales setups & scheduling bots.", features: ["7,000 WhatsApp monthly credits", "Advanced Gemini prompt tuning", "Custom campaign broadcasters", "Dynamic webhook configurations", "5 active team seats"], popular: true },
                { name: "Enterprise Custom", price: billingCycle === 'monthly' ? "$149" : "$119", desc: "Engineered for full-scale business CRM automations.", features: ["10,000 WhatsApp monthly credits", "Unlimited database rolling backups", "Custom visual workflow nodes", "PM2 stateful auto-restart setups", "25 active team seats"], popular: false }
              ].map((plan, i) => (
                <div 
                  key={i} 
                  className={`bg-white/70 backdrop-blur-md border rounded-3xl p-6 shadow-3xs relative overflow-hidden flex flex-col justify-between text-left ${
                    plan.popular ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200/80'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute top-3 right-3 text-[8px] font-extrabold uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded-full">POPULAR</span>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">{plan.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{plan.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1 pt-2">
                      <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-display">{plan.price}</span>
                      <span className="text-slate-400 text-xs font-medium">/mo</span>
                    </div>

                    <ul className="space-y-2.5 pt-4 text-[11px] text-slate-500 border-t border-slate-100">
                      {plan.features.map((feat, f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check size={12} className="text-emerald-500 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to="/admin"
                    className={`mt-6 h-10 w-full rounded-2xl flex items-center justify-center text-xs font-bold uppercase tracking-wider transition-all shadow-3xs ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Select Plan
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
