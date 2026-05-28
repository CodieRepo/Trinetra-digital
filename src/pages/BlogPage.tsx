import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Calendar } from "lucide-react";
import SEO from "../components/seo/SEO";
import { BLOG_POSTS } from "../data/blogPosts";

// Tag colour mapping
const TAG_STYLES: Record<string, string> = {
  copper: "bg-[#F2E8DC] text-[#BF7340]",
  green:  "bg-[#E8F0ED] text-[#2A4A3E]",
  slate:  "bg-[#EEEAE3] text-[#5C5A52]",
};

// Schema — built dynamically from central data
const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  url: "https://trinetradigitalsolution.com/blog",
  name: "Trinetra Digital Blog — AI Automation Insights",
  description:
    "Expert insights on WhatsApp automation, AI CRM, lead management, and business automation for Indian businesses.",
  publisher: { "@id": "https://trinetradigitalsolution.com/#organization" },
  blogPost: BLOG_POSTS.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    datePublished: p.dateISO,
    url: `https://trinetradigitalsolution.com/blog/${p.slug}`,
    author: { "@type": "Organization", name: "Trinetra Digital Solution" },
    keywords: p.keywords,
  })),
};

export default function BlogPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="AI Automation Insights — WhatsApp CRM & Lead Management Blog | Trinetra Digital"
        description="Expert insights on WhatsApp automation, AI CRM, lead management, and business automation for Indian businesses. Published by Trinetra Digital Solution, Gorakhpur."
        canonical="https://trinetradigitalsolution.com/blog"
        schema={SCHEMA}
      />

      {/* Hero */}
      <section className="bg-[#F9F8F5] pt-20 pb-16 md:pt-28 md:pb-20 border-b border-[#E2DDD5]">
        <div className="main-container text-center max-w-[600px]">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mixed-headline-eyebrow">
            The Trinetra Blog
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="display-lg text-[#18170F] tracking-tight mt-2 mb-4"
          >
            AI automation insights for Indian businesses
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body-lg text-[#5C5A52]"
          >
            Practical guides, case studies, and operational intelligence — from the team that builds AI automation for Indian SMBs.
          </motion.p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="bg-[#F4F2ED] py-20 md:py-28" aria-label="Blog posts">
        <div className="main-container">
          <div className="grid gap-6 md:grid-cols-2">
            {BLOG_POSTS.map((post, i) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group flex flex-col bg-white border border-[#BF7340]/20 rounded-2xl p-8 hover:shadow-md hover:border-[#BF7340]/40 transition-all duration-300"
              >
                {/* Tags + meta */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${TAG_STYLES[post.tagColor]}`}>
                    {post.tag}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-[#E8F0ED] text-[#2A4A3E] px-2.5 py-1 rounded-full">
                    Published
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-[#8C8A82]">
                    <Calendar size={10} />{post.date}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#8C8A82]">
                    <Clock size={10} />{post.readTime}
                  </span>
                </div>

                {/* Title */}
                <h2 className="heading-sm text-[#18170F] mb-3 group-hover:text-[#BF7340] transition-colors">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="body-sm text-[#5C5A52] leading-relaxed flex-1">{post.excerpt}</p>

                {/* Read link */}
                <div className="mt-6">
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BF7340] hover:underline group-hover:gap-2.5 transition-all"
                  >
                    <BookOpen size={13} /> Read Article <ArrowRight size={12} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Newsletter / CTA strip */}
          <div className="mt-16 text-center bg-white border border-[#E2DDD5] rounded-2xl p-10 max-w-[560px] mx-auto">
            <h2 className="heading-md text-[#18170F] mb-3">Want us to build this for your business?</h2>
            <p className="body-sm text-[#5C5A52] mb-6">
              Everything we write about, we build. Book a free 30-minute demo and see exactly how these systems work for your industry.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors"
            >
              Book Free Demo <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
