import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import SEO from "../../components/seo/SEO";

interface ServicePageProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  features: string[];
  howItWorks: { step: string; title: string; desc: string }[];
  schema: object;
  relatedLinks: { label: string; href: string }[];
}

export default function ServicePageTemplate({
  title,
  metaTitle,
  metaDescription,
  canonical,
  eyebrow,
  headline,
  subheadline,
  features,
  howItWorks,
  schema,
  relatedLinks,
}: ServicePageProps) {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  const WA_URL = `https://wa.me/918810721068?text=${encodeURIComponent(`Hi, I'm interested in ${title} from Trinetra Digital Solution.`)}`;

  return (
    <>
      <SEO title={metaTitle} description={metaDescription} canonical={canonical} schema={schema} />

      {/* Hero */}
      <section className="bg-surface-2 pt-20 pb-16 md:pt-28 md:pb-20 border-b border-border">
        <div className="main-container max-w-[740px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">{eyebrow}</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="display-lg text-ink-1 tracking-tight mt-2 mb-5 font-display font-bold"
          >
            {headline}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="body-lg text-ink-2 mb-8 max-w-[580px]"
          >
            {subheadline}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row flex-wrap gap-3">
            <a href={WA_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors w-full sm:w-auto cursor-pointer">
              Book Free Demo <ArrowRight size={14} />
            </a>
            <Link to="/pricing"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-white px-6 text-xs font-semibold text-ink-1 hover:bg-surface-2 transition-colors w-full sm:w-auto">
              See Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface-2 py-14 md:py-24 border-b border-border" aria-label="Key features">
        <div className="main-container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="display-md text-ink-1 tracking-tight mb-8 font-display font-bold">What's included</h2>
            <ul className="flex flex-col gap-4">
              {features.map((f, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 text-sm text-ink-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent border border-accent/15 mt-0.5">
                    <Check size={12} />
                  </span>
                  {f}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* How It Works */}
          <div className="flex flex-col gap-4">
            <h2 className="heading-md text-ink-1 mb-2 font-semibold">How it works</h2>
            {howItWorks.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex gap-4 bg-white border border-border/80 rounded-xl p-5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-light text-accent border border-accent/15 text-xs font-bold font-mono">
                  {step.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-1 mb-1 font-mono uppercase tracking-wide">{step.title}</p>
                  <p className="text-xs text-ink-2 leading-relaxed font-semibold">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Related */}
      <section className="bg-surface-2 py-14 md:py-16 border-t border-border pb-mobile-safe md:pb-16">
        <div className="main-container text-center">
          <h2 className="heading-md text-ink-1 mb-4">Ready to get started?</h2>
          <p className="body-sm text-ink-2 mb-8 max-w-[440px] mx-auto">
            Book a free 30-minute demo. We'll show you exactly how {title} works for your business — live.
          </p>
          <Link to="/contact"
            className="inline-flex items-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors mb-10 cursor-pointer">
            Book Free Demo <ArrowRight size={14} />
          </Link>
          <div className="border-t border-border pt-8">
            <p className="text-xs text-slate-400 mb-4 font-mono uppercase tracking-wider">Related services</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {relatedLinks.map((l) => (
                <Link key={l.href} to={l.href}
                  className="text-xs font-semibold text-accent border border-accent/20 bg-accent-light px-4 py-2 rounded-full hover:bg-accent-light/80 transition-colors">
                  {l.label} →
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
