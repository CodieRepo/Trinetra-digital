import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import SEO from "../components/seo/SEO";

const BLOG_POSTS = [
  {
    title: "How WhatsApp Automation Helps Real Estate Agents Close 3x More Deals",
    excerpt: "Most real estate agents lose 30-40% of leads simply because they don't follow up fast enough. Here's how AI changes that.",
    slug: "#",
    tag: "Real Estate",
    readTime: "5 min read",
    date: "Coming Soon",
  },
  {
    title: "The Complete Guide to Setting Up AI CRM for Indian SMBs in 2026",
    excerpt: "A step-by-step walkthrough of what an AI-powered CRM actually does and why traditional CRMs fall short for Indian businesses.",
    slug: "#",
    tag: "AI CRM",
    readTime: "8 min read",
    date: "Coming Soon",
  },
  {
    title: "Why Your Business Is Losing Leads on WhatsApp (And How to Fix It)",
    excerpt: "WhatsApp is your biggest lead channel. But without automation, it's also your biggest leak. Here's the data and the fix.",
    slug: "#",
    tag: "WhatsApp",
    readTime: "4 min read",
    date: "Coming Soon",
  },
  {
    title: "5 Ways AI Follow-Up Sequences Increase Appointment Bookings for Clinics",
    excerpt: "Healthcare clinics are one of the highest-volume WhatsApp use cases. Learn how automation handles OPD bookings at scale.",
    slug: "#",
    tag: "Healthcare",
    readTime: "6 min read",
    date: "Coming Soon",
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "url": "https://trinetradigitalsolution.com/blog",
  "name": "Trinetra Digital Blog — AI Automation Insights",
  "description": "Expert insights on WhatsApp automation, AI CRM, lead management, and business automation for Indian businesses.",
  "publisher": { "@id": "https://trinetradigitalsolution.com/#organization" },
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
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group flex flex-col bg-white border border-[#E2DDD5] rounded-2xl p-8 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-[#F2E8DC] text-[#BF7340] px-2.5 py-1 rounded-full">
                    {post.tag}
                  </span>
                  <span className="text-[10px] text-[#8C8A82]">{post.date}</span>
                  <span className="text-[10px] text-[#8C8A82]">· {post.readTime}</span>
                </div>

                <h2 className="heading-sm text-[#18170F] mb-3 group-hover:text-[#BF7340] transition-colors">
                  {post.title}
                </h2>
                <p className="body-sm text-[#5C5A52] leading-relaxed flex-1">{post.excerpt}</p>

                <div className="mt-6 flex items-center gap-2">
                  <BookOpen size={14} className="text-[#8C8A82]" />
                  <span className="text-xs font-semibold text-[#8C8A82]">Publishing soon</span>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Newsletter Prompt */}
          <div className="mt-16 text-center bg-white border border-[#E2DDD5] rounded-2xl p-10 max-w-[560px] mx-auto">
            <h2 className="heading-md text-[#18170F] mb-3">Get notified when we publish</h2>
            <p className="body-sm text-[#5C5A52] mb-6">
              We write about WhatsApp automation, AI CRM, and business growth for Indian businesses. No spam, ever.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 h-11 rounded-lg bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors"
            >
              Contact Us to Stay Updated <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
