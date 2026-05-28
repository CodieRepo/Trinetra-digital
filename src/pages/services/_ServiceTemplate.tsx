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

  const WA_URL = `https://wa.me/919334757759?text=${encodeURIComponent(`Hi, I'm interested in ${title} from Trinetra Digital Solution.`)}`;

  return (
    <>
      <SEO title={metaTitle} description={metaDescription} canonical={canonical} schema={schema} />

      {/* Hero */}
      <section className="bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-20 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[740px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">{eyebrow}</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight mt-2 mb-5"
          >
            {headline}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52] mb-8 max-w-[580px]"
          >
            {subheadline}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row flex-wrap gap-3">
            <a href={WA_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors w-full sm:w-auto">
              Book Free Demo <ArrowRight size={14} />
            </a>
            <Link to="/pricing"
              className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors w-full sm:w-auto">
              See Pricing
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#F4F2ED] py-14 md:py-24 border-b border-[#E2DDD5]" aria-label="Key features">
        <div className="main-container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="display-md text-[#18170F] tracking-tight mb-8">What's included</h2>
            <ul className="flex flex-col gap-4">
              {features.map((f, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 text-sm text-[#5C5A52]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F0ED] text-[#2A4A3E] mt-0.5">
                    <Check size={12} />
                  </span>
                  {f}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* How It Works */}
          <div className="flex flex-col gap-4">
            <h2 className="heading-md text-[#18170F] mb-2">How it works</h2>
            {howItWorks.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex gap-4 bg-white border border-[#E2DDD5] rounded-xl p-5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F2E8DC] text-[#BF7340] text-xs font-bold">
                  {step.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#18170F] mb-1">{step.title}</p>
                  <p className="text-xs text-[#5C5A52] leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Related */}
      <section className="bg-[#F9F8F5] py-14 md:py-16 border-t border-[#E2DDD5] pb-mobile-safe md:pb-16">
        <div className="main-container text-center">
          <h2 className="heading-md text-[#18170F] mb-4">Ready to get started?</h2>
          <p className="body-sm text-[#5C5A52] mb-8 max-w-[440px] mx-auto">
            Book a free 30-minute demo. We'll show you exactly how {title} works for your business — live.
          </p>
          <Link to="/contact"
            className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors mb-10">
            Book Free Demo <ArrowRight size={14} />
          </Link>
          <div className="border-t border-[#E2DDD5] pt-8">
            <p className="text-xs text-[#8C8A82] mb-4">Related services</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {relatedLinks.map((l) => (
                <Link key={l.href} to={l.href}
                  className="text-xs font-semibold text-[#BF7340] border border-[#BF7340]/20 bg-[#F2E8DC] px-4 py-2 rounded-full hover:bg-[#F2E8DC]/80 transition-colors">
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
