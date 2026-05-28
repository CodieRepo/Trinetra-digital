import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import SEO from "../components/seo/SEO";

const BLOG_POSTS = [
  {
    title: "How WhatsApp Automation Is Transforming Indian Businesses in 2026",
    excerpt: "The average Indian business responds to a WhatsApp lead after 4–6 hours. By then, the lead has spoken to two competitors. Here's exactly how WhatsApp Automation fixes this — with real numbers.",
    slug: "#", // /blog/whatsapp-automation-india-2026
    tag: "WhatsApp Automation",
    readTime: "7 min read",
    date: "May 28, 2026",
    featured: true,
  },
  {
    title: "Why Every Growing Business Needs an AI CRM System",
    excerpt: "A spreadsheet is not a CRM. A WhatsApp group is not a pipeline. Here's what an AI CRM actually does — and why Indian SMBs from Gorakhpur to Mumbai are switching right now.",
    slug: "#", // /blog/ai-crm-system-for-indian-businesses
    tag: "AI CRM",
    readTime: "8 min read",
    date: "May 28, 2026",
    featured: true,
  },
  {
    title: "How WhatsApp Automation Helps Real Estate Agents Close 3x More Deals",
    excerpt: "Real estate agents lose leads every day — not because of bad properties, but because of slow response. Here's how automation fixes the follow-up gap and books 2x more site visits.",
    slug: "#", // /blog/whatsapp-automation-real-estate-india
    tag: "Real Estate",
    readTime: "5 min read",
    date: "May 28, 2026",
    featured: true,
  },
  {
    title: "5 Ways AI Follow-Up Sequences Increase Appointment Bookings for Clinics",
    excerpt: "From instant OPD booking responses to automated report dispatch and Google review collection — here are 5 proven AI automation strategies that fill clinic slots and reduce no-shows.",
    slug: "#", // /blog/ai-follow-up-clinic-appointment-automation
    tag: "Healthcare",
    readTime: "6 min read",
    date: "May 28, 2026",
    featured: true,
  },
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "url": "https://trinetradigitalsolution.com/blog",
  "name": "Trinetra Digital Blog — AI Automation Insights",
  "description": "Expert insights on WhatsApp automation, AI CRM, lead management, and business automation for Indian businesses.",
  "publisher": { "@id": "https://trinetradigitalsolution.com/#organization" },
  "blogPost": [
    {
      "@type": "BlogPosting",
      "headline": "How WhatsApp Automation Is Transforming Indian Businesses in 2026",
      "datePublished": "2026-05-28",
      "url": "https://trinetradigitalsolution.com/blog/whatsapp-automation-india-2026",
      "author": { "@type": "Organization", "name": "Trinetra Digital Solution" },
      "keywords": "WhatsApp Automation India, WhatsApp CRM, Business Automation, AI Automation Company",
    },
    {
      "@type": "BlogPosting",
      "headline": "Why Every Growing Business Needs an AI CRM System",
      "datePublished": "2026-05-28",
      "url": "https://trinetradigitalsolution.com/blog/ai-crm-system-for-indian-businesses",
      "author": { "@type": "Organization", "name": "Trinetra Digital Solution" },
      "keywords": "AI CRM India, CRM for small business, Lead Management System, Sales Automation",
    },
    {
      "@type": "BlogPosting",
      "headline": "How WhatsApp Automation Helps Real Estate Agents Close 3x More Deals",
      "datePublished": "2026-05-28",
      "url": "https://trinetradigitalsolution.com/blog/whatsapp-automation-real-estate-india",
      "author": { "@type": "Organization", "name": "Trinetra Digital Solution" },
      "keywords": "WhatsApp Automation Real Estate India, Real Estate CRM, Property Lead Management",
    },
    {
      "@type": "BlogPosting",
      "headline": "5 Ways AI Follow-Up Sequences Increase Appointment Bookings for Clinics",
      "datePublished": "2026-05-28",
      "url": "https://trinetradigitalsolution.com/blog/ai-follow-up-clinic-appointment-automation",
      "author": { "@type": "Organization", "name": "Trinetra Digital Solution" },
      "keywords": "AI Automation Healthcare India, WhatsApp for Clinics, OPD Appointment Automation",
    },
  ],
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
                className={`group flex flex-col bg-white border rounded-2xl p-8 transition-all duration-300 ${
                  post.featured
                    ? "border-[#BF7340]/25 hover:shadow-md hover:border-[#BF7340]/40"
                    : "border-[#E2DDD5] hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-[#F2E8DC] text-[#BF7340] px-2.5 py-1 rounded-full">
                    {post.tag}
                  </span>
                  {post.featured ? (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-[#E8F0ED] text-[#2A4A3E] px-2.5 py-1 rounded-full">
                      Published
                    </span>
                  ) : null}
                  <span className="text-[10px] text-[#8C8A82] ml-auto">{post.date}</span>
                  <span className="text-[10px] text-[#8C8A82]">· {post.readTime}</span>
                </div>

                <h2 className={`heading-sm text-[#18170F] mb-3 transition-colors ${post.featured ? "group-hover:text-[#BF7340]" : ""}`}>
                  {post.title}
                </h2>
                <p className="body-sm text-[#5C5A52] leading-relaxed flex-1">{post.excerpt}</p>

                <div className="mt-6 flex items-center gap-2">
                  {post.featured ? (
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BF7340] hover:underline"
                    >
                      <BookOpen size={13} /> Read full article — contact us for the PDF
                    </Link>
                  ) : (
                    <>
                      <BookOpen size={14} className="text-[#8C8A82]" />
                      <span className="text-xs font-semibold text-[#8C8A82]">Publishing soon</span>
                    </>
                  )}
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

