import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Tag, ArrowRight, ExternalLink, Check } from "lucide-react";
import LazyVideo from "./LazyVideo";

// Count Up Helper Component
function MetricCounter({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const numPart = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    const prefix = value.match(/^[^\d]*/)?.[0] || "";
    const suffix = value.match(/[^\d.]*$/)?.[0] || "";
    let startTime: number | null = null;
    const isFloat = value.includes(".");

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easeProgress * numPart;
      setDisplayValue(`${prefix}${isFloat ? current.toFixed(1) : Math.floor(current)}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return <span ref={ref}>{displayValue}</span>;
}

const CAPABILITIES = [
  { value: "5+", label: "Services Offered", note: "Website, SEO, Social, CRM, Software" },
  { value: "3", label: "Verified Projects", note: "MUDDLY™, Vaastu Infra & Akuafi" },
  { value: "100%", label: "Custom-Built", note: "No templates. Built for your workflow." },
];

interface PortfolioHighlight {
  title: string;
  detail: string;
}

interface PortfolioPalette {
  cream: string;
  ink: string;
  accent: string;
}

interface PortfolioItem {
  project: string;
  subtitle?: string;
  client?: string;
  category: string;
  services: string[];
  techStack?: string[];
  highlights?: PortfolioHighlight[];
  description: string;
  avatar: string;
  status: string;
  video: string;
  url: string;
  liveUrl?: string;
  inquiryService?: string;
  palette?: PortfolioPalette;
}

const PORTFOLIO: PortfolioItem[] = [
  {
    project: "MUDDLY™",
    subtitle: "D2C Indian Streetwear E-Commerce Platform",
    client: 'MUDDLY™ (Registered Indian Streetwear Label — "Mood + Daily")',
    category: "Full-Stack E-Commerce / Custom D2C Brand Platform / Automation",
    services: [],
    techStack: [
      "Next.js 15 (App Router)",
      "React 19",
      "TypeScript",
      "Tailwind CSS",
      "Supabase (PostgreSQL + RLS)",
      "Razorpay",
      "Qikink POD API",
      "Meta Conversions API (CAPI)",
      "Nodemailer",
      "WhatsApp & Telegram Alerts",
      "Cloudflare",
    ],
    highlights: [
      {
        title: "Custom High-Speed Storefront",
        detail:
          "Built with Next.js 15 App Router, dynamic product & collection pages, variant/size/colour selector, slide-over Cart Drawer, custom animated brand mascot components, and mobile-first bottom navigation.",
      },
      {
        title: "Payments & Checkout",
        detail:
          "Integrated Razorpay payment gateway with secure server-side verification, discount/promo code engine, and pan-India order tracking (/track).",
      },
      {
        title: "Automated Print-on-Demand Fulfillment",
        detail:
          "Built a custom Qikink API integration service (order push, SKU/variation mapping, automated status sync, error classification, and CSV bulk importer).",
      },
      {
        title: "Multi-Channel Notification Engine",
        detail:
          "Automated transactional & campaign emails via Nodemailer (order confirmation, welcome, review requests), WhatsApp order updates, and real-time Telegram alerts for admins.",
      },
      {
        title: "Verified Reviews & Content System",
        detail:
          "Custom customer review submission, eligibility checks, moderation queue, and dynamic Style Guides CMS.",
      },
      {
        title: "Server-Side Tracking & SEO",
        detail:
          "Implemented Meta Pixel + server-side Meta Conversions API (CAPI), custom Admin Meta Insights dashboard, Schema.org JSON-LD, Google Shopping XML feed, image sitemap, and AI-discoverability files (llms.txt & llms-full.txt).",
      },
      {
        title: "Custom Admin Operations Dashboard (/admin)",
        detail:
          "Full-featured admin portal for order lifecycle management, fulfillment monitoring, customer metrics, discount management, system health checks, and Cloudflare cache purging.",
      },
    ],
    description:
      "Engineered a complete, high-converting D2C streetwear e-commerce storefront, automated print-on-demand fulfillment pipeline, and custom admin operations suite from scratch using Next.js 15, React 19, TypeScript, Tailwind CSS, and Supabase.",
    avatar: "M",
    status: "Live",
    video: "/videos/muddlyproject.mp4",
    url: "muddly.store",
    liveUrl: "https://muddly.store",
    inquiryService: "Custom Software Development",
    palette: {
      cream: "#F8F4F0",
      ink: "#1B1A1A",
      accent: "#D35427",
    },
  },
  {
    project: "Vaastu Infra",
    category: "Real Estate",
    services: ["Business Website Development", "WhatsApp Integration", "Lead Inquiry Form Integration"],
    description:
      "Developed a professional business website for Vaastu Infra with integrated WhatsApp contact flow and a structured lead inquiry form to capture and organize incoming property inquiries.",
    avatar: "V",
    status: "Live",
    video: "/videos/vastuproject.mp4",
    url: "vaastuinfra.in",
    inquiryService: "Website Development",
  },
  {
    project: "Akuafi",
    category: "Technology / Software",
    services: [
      "Website Architecture Planning",
      "Frontend Development",
      "Backend Development",
      "Multi-Page Implementation",
      "System Structure & Workflow Design",
    ],
    description:
      "Handled complete website architecture planning, frontend and backend development, multi-page implementation, and system structure design for Akuafi — a technology-focused business requiring a well-structured digital presence.",
    avatar: "A",
    status: "Completed",
    video: "/videos/akuafiproject.mp4",
    url: "akuafi.com",
    inquiryService: "Custom Software Development",
  },
];

export default function Testimonials() {
  return (
    <section id="portfolio" className="relative overflow-hidden bg-transparent py-16 md:py-24 border-b border-white/5">
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 relative z-10">

        {/* Stats Row */}
        <div className="grid gap-0 md:grid-cols-3 mb-20 border border-white/5 bg-[#1d2022]/40 backdrop-blur-3xl rounded-2xl overflow-hidden shadow-2xl">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col items-center justify-center p-8 text-center border-b md:border-b-0 md:border-r border-white/5 last:border-0"
            >
              <span className="font-display text-[52px] leading-none text-white font-semibold mb-2 tracking-tight">
                <MetricCounter value={cap.value.replace(/[^0-9.]/g, '') || '0'} />
                {cap.value.replace(/[0-9.]/g, '')}
              </span>
              <span className="text-[10px] font-bold tracking-widest text-accent uppercase font-mono mb-1">
                {cap.label}
              </span>
              <span className="text-[10.5px] text-ink-3 font-semibold font-mono">{cap.note}</span>
            </motion.div>
          ))}
        </div>

        {/* Section header */}
        <div className="text-center mb-16 space-y-3">
          <span className="mixed-headline-eyebrow">Our Work</span>
          <h2 className="display-lg text-ink-1 tracking-tight max-w-[620px] mx-auto font-display font-bold">
            Verified portfolio projects.
          </h2>
          <p className="body-md text-ink-2 max-w-[500px] mx-auto font-medium">
            We only present projects we have actually delivered. No inflated numbers, no fabricated results.
          </p>
        </div>

        {/* Alternating project showcase layout */}
        <div className="space-y-24">
          <AnimatePresence>
            {PORTFOLIO.map((item, i) => {
              const isEven = i % 2 === 0;
              const palette = item.palette;
              return (
                <motion.div
                  key={item.project}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6 }}
                  className={`grid gap-8 lg:gap-16 items-start ${
                    isEven ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-[0.9fr_1.1fr]"
                  }`}
                >
                  {/* Video side */}
                  <div className={`${isEven ? "lg:order-1" : "lg:order-2"} group lg:sticky lg:top-24`}>
                    {/* Browser mockup frame */}
                    <div
                      className="rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 backdrop-blur-md border"
                      style={
                        palette
                          ? {
                              backgroundColor: palette.ink,
                              borderColor: `${palette.accent}45`,
                              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.6), 0 0 36px -12px ${palette.accent}35`,
                            }
                          : {
                              backgroundColor: "rgba(16, 20, 21, 0.8)",
                              borderColor: "rgba(255, 255, 255, 0.05)",
                            }
                      }
                    >
                      {/* Browser bar */}
                      <div
                        className="border-b px-4 py-2.5 flex items-center justify-between"
                        style={
                          palette
                            ? {
                                backgroundColor: palette.ink,
                                borderColor: `${palette.cream}15`,
                              }
                            : {
                                backgroundColor: "rgba(11, 15, 16, 0.8)",
                                borderColor: "rgba(255, 255, 255, 0.05)",
                              }
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                        </div>
                        {item.liveUrl ? (
                          <a
                            href={item.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-4 py-1 text-[9px] font-mono font-semibold tracking-wide transition-colors hover:bg-white/10"
                            style={palette ? { color: palette.cream } : undefined}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full animate-pulse"
                              style={{ backgroundColor: palette ? palette.accent : "#4ade80" }}
                            />
                            {item.url}
                          </a>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-md px-4 py-1 text-[9px] font-mono text-ink-2 font-semibold tracking-wide">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                            {item.url}
                          </div>
                        )}
                        {item.liveUrl ? (
                          <a
                            href={item.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${item.project} live site`}
                            className="transition-opacity hover:opacity-80"
                            style={{ color: palette ? palette.cream : undefined }}
                          >
                            <ExternalLink size={11} className={palette ? "" : "text-ink-3"} />
                          </a>
                        ) : (
                          <ExternalLink size={10} className="text-ink-3" />
                        )}
                      </div>
                      {/* Video area */}
                      <div style={{ position: "relative", aspectRatio: "16/9", width: "100%", overflow: "hidden" }}>
                        <LazyVideo
                          src={item.video}
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Content side */}
                  <div className={`${isEven ? "lg:order-2" : "lg:order-1"} space-y-5 text-left`}>
                    {/* Project meta */}
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-mono font-bold border"
                        style={
                          palette
                            ? {
                                backgroundColor: palette.ink,
                                color: palette.cream,
                                borderColor: `${palette.accent}60`,
                              }
                            : undefined
                        }
                      >
                        {!palette ? (
                          <span className="flex h-full w-full items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
                            {item.avatar}
                          </span>
                        ) : (
                          item.avatar
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                            {item.project}
                          </p>
                          <span
                            className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              !palette ? "bg-accent/10 text-accent border-accent/20" : ""
                            }`}
                            style={
                              palette
                                ? {
                                    backgroundColor: `${palette.accent}20`,
                                    color: palette.cream,
                                    borderColor: `${palette.accent}55`,
                                  }
                                : undefined
                            }
                          >
                            {item.status}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p
                            className="text-xs font-semibold mt-0.5"
                            style={{ color: palette ? palette.cream : undefined }}
                          >
                            {item.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Tag size={10} className="text-ink-3 shrink-0" />
                          <p className="text-[10px] text-ink-3 font-semibold">{item.category}</p>
                        </div>
                        {item.client && (
                          <p className="text-[10px] font-mono text-ink-3 mt-1">
                            Client: {item.client}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-ink-2 leading-relaxed font-medium">
                      {item.description}
                    </p>

                    {item.techStack && item.techStack.length > 0 && (
                      <div>
                        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-3 mb-2.5">
                          Tech Stack
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md border"
                              style={
                                palette
                                  ? {
                                      backgroundColor: palette.ink,
                                      color: palette.cream,
                                      borderColor: `${palette.accent}35`,
                                    }
                                  : {
                                      backgroundColor: "rgba(255,255,255,0.04)",
                                      borderColor: "rgba(255,255,255,0.08)",
                                    }
                              }
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.highlights && item.highlights.length > 0 && (
                      <div>
                        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-3 mb-3">
                          Key Engineering &amp; Features Implemented
                        </p>
                        <ul className="space-y-2.5">
                          {item.highlights.map((hl, hi) => (
                            <motion.li
                              key={hl.title}
                              initial={{ opacity: 0, x: -4 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3, delay: 0.04 + hi * 0.04 }}
                              className="flex items-start gap-2.5 text-xs text-ink-2 leading-relaxed"
                            >
                              <Check
                                size={13}
                                className="mt-0.5 shrink-0"
                                style={{ color: palette ? palette.accent : undefined }}
                              />
                              <span>
                                <strong className="text-white font-semibold">{hl.title}:</strong>{" "}
                                {hl.detail}
                              </span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.services.length > 0 && (
                      <div>
                        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink-3 mb-3">
                          Services Delivered
                        </p>
                        <ul className="space-y-2">
                          {item.services.map((svc, si) => (
                            <motion.li
                              key={si}
                              initial={{ opacity: 0, x: -4 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3, delay: 0.05 + si * 0.05 }}
                              className="flex items-start gap-2.5 text-xs font-semibold text-ink-2"
                            >
                              <Check size={13} className="text-accent mt-0.5 shrink-0" />
                              {svc}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-4">
                      {item.liveUrl && (
                        <a
                          href={item.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 shadow-md"
                          style={
                            palette
                              ? {
                                  backgroundColor: palette.accent,
                                  color: palette.cream,
                                }
                              : undefined
                          }
                        >
                          Visit Live Store
                          <ArrowRight size={13} />
                        </a>
                      )}
                      <Link
                        to={`/contact?service=${encodeURIComponent(
                          item.inquiryService ??
                            (item.project === "Vaastu Infra" ? "Website Development" : "Custom Software Development")
                        )}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:text-accent-hover transition-colors group"
                      >
                        Enquire about a similar system
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Honest CTA strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center p-6 md:p-8 rounded-2xl border border-white/5 bg-[#1d2022]/40 backdrop-blur-md shadow-2xl"
        >
          <p className="text-xs font-bold text-white font-mono uppercase tracking-wider mb-2">
            Building our portfolio, one honest project at a time.
          </p>
          <p className="text-xs text-ink-2 max-w-[460px] mx-auto leading-relaxed font-medium">
            We are a growing team committed to delivering quality work. Every project listed here represents a real engagement with a real business.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
