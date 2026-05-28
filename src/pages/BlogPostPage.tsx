import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Clock, Tag, Calendar, MessageCircle } from "lucide-react";
import SEO from "../components/seo/SEO";
import { getPostBySlug, getRelatedPosts, BLOG_POSTS } from "../data/blogPosts";

const WA_URL = `https://wa.me/919334757759?text=${encodeURIComponent(
  "Hi, I read your blog and I'd like to learn more about AI automation for my business."
)}`;

// Tag colour mapping
const TAG_STYLES: Record<string, string> = {
  copper: "bg-[#F2E8DC] text-[#BF7340]",
  green:  "bg-[#E8F0ED] text-[#2A4A3E]",
  slate:  "bg-[#EEEAE3] text-[#5C5A52]",
};

// ── Markdown component overrides (Tailwind-free, uses inline styles + classes) ──
const mdComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-[1.35rem] font-bold text-[#18170F] mt-10 mb-4 leading-snug tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[1.05rem] font-bold text-[#18170F] mt-7 mb-3 leading-snug">
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-[0.9375rem] text-[#3A3830] leading-[1.8] mb-5">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-[#18170F]">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-[#5C5A52]">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none mb-5 flex flex-col gap-2.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-5 flex flex-col gap-2.5 text-[#3A3830] text-[0.9375rem]">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex items-start gap-2.5 text-[0.9375rem] text-[#3A3830] leading-relaxed">
      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#BF7340]" />
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-[#BF7340] bg-[#F9F4EE] rounded-r-xl px-5 py-4 my-6 text-[0.9rem] text-[#5C5A52] italic leading-relaxed">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-7 rounded-xl border border-[#E2DDD5]">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-[#F4F2ED] text-[#18170F]">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-[#E2DDD5]">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => <tr>{children}</tr>,
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#5C5A52]">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-3 text-[0.875rem] text-[#3A3830] even:bg-[#FAFAF8]">{children}</td>
  ),
  hr: () => <hr className="border-[#E2DDD5] my-10" />,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      className="text-[#BF7340] font-semibold underline underline-offset-2 hover:text-[#A0602E] transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  // Bold FAQs — render **Q** as a visible FAQ entry
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-[#F0EDE7] text-[#BF7340] px-1.5 py-0.5 rounded text-[0.85em] font-mono">
      {children}
    </code>
  ),
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (slug && !post) navigate("/blog", { replace: true });
  }, [slug, post, navigate]);

  if (!post) return null;

  const relatedPosts = getRelatedPosts(post);

  const ARTICLE_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    author: { "@type": "Organization", name: "Trinetra Digital Solution" },
    publisher: {
      "@type": "Organization",
      name: "Trinetra Digital Solution",
      logo: {
        "@type": "ImageObject",
        url: "https://trinetradigitalsolution.com/android-chrome-512x512.png",
      },
    },
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    url: `https://trinetradigitalsolution.com/blog/${post.slug}`,
    keywords: post.keywords,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://trinetradigitalsolution.com/blog/${post.slug}`,
    },
  };

  const tagStyle = TAG_STYLES[post.tagColor] ?? TAG_STYLES.slate;

  return (
    <>
      <SEO
        title={post.metaTitle}
        description={post.metaDescription}
        canonical={`https://trinetradigitalsolution.com/blog/${post.slug}`}
        schema={ARTICLE_SCHEMA}
      />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-[#F9F8F5] pt-20 pb-12 md:pt-28 md:pb-16 border-b border-[#E2DDD5]">
        <div className="main-container max-w-[800px]">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-6 text-[11px] text-[#8C8A82] font-medium">
            <Link to="/" className="hover:text-[#BF7340] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-[#BF7340] transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-[#5C5A52] truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Tag + meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${tagStyle}`}>
              <Tag size={9} className="inline mr-1" />{post.tag}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#8C8A82]">
              <Calendar size={11} />{post.date}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#8C8A82]">
              <Clock size={11} />{post.readTime}
            </span>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="display-lg text-[#18170F] tracking-tight mb-5"
          >
            {post.title}
          </motion.h1>

          {/* Excerpt */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="body-lg text-[#5C5A52] leading-relaxed"
          >
            {post.excerpt}
          </motion.p>

          {/* Author chip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 mt-7 pt-6 border-t border-[#E2DDD5]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#18170F]">
              <svg viewBox="0 0 32 32" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,3 3,27 29,27" stroke="#F9F8F5" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="16" cy="11" r="2.5" fill="#BF7340" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#18170F]">Trinetra Digital Solution</p>
              <p className="text-[10px] text-[#8C8A82]">AI Automation · Gorakhpur, India</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Body + Sidebar ─────────────────────────────────────────────── */}
      <section className="bg-[#F4F2ED] py-14 md:py-20">
        <div className="main-container">
          <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:items-start">

            {/* Article body */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-[#E2DDD5] rounded-2xl px-7 py-10 md:px-12 md:py-14 shadow-xs"
              itemScope
              itemType="https://schema.org/Article"
            >
              <meta itemProp="headline" content={post.title} />
              <meta itemProp="datePublished" content={post.dateISO} />
              <div itemProp="articleBody">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents as any}
                >
                  {post.content}
                </ReactMarkdown>
              </div>

              {/* End CTA */}
              <div className="mt-14 pt-8 border-t border-[#E2DDD5]">
                <div className="bg-[#F9F4EE] border border-[#BF7340]/20 rounded-2xl p-7 md:p-9">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#BF7340] mb-2">
                    Ready to automate your business?
                  </p>
                  <h2 className="heading-sm text-[#18170F] mb-3">
                    Book a free 30-minute demo with Trinetra Digital Solution
                  </h2>
                  <p className="text-sm text-[#5C5A52] mb-6 leading-relaxed">
                    We're an AI automation company based in Gorakhpur, UP — helping Indian businesses across healthcare, real estate, coaching, and more build the operational infrastructure they need to grow.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/contact"
                      className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#2A4A3E] px-6 text-xs font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#1E3630] transition-colors"
                    >
                      Book Free Demo <ArrowRight size={13} />
                    </Link>
                    <a
                      href={WA_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E2DDD5] bg-white px-6 text-xs font-semibold text-[#18170F] hover:bg-[#F4F2ED] transition-colors"
                    >
                      <MessageCircle size={13} /> Chat on WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Back link */}
              <div className="mt-8 flex items-center gap-2">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C5A52] hover:text-[#BF7340] transition-colors"
                >
                  <ArrowLeft size={13} /> Back to all articles
                </Link>
              </div>
            </motion.article>

            {/* Sidebar */}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-24">

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-[#E2DDD5] rounded-2xl p-6"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C8A82] mb-4">
                    Related Articles
                  </p>
                  <div className="flex flex-col gap-4">
                    {relatedPosts.map((rp) => (
                      <Link
                        key={rp.slug}
                        to={`/blog/${rp.slug}`}
                        className="group flex flex-col gap-1.5 pb-4 border-b border-[#F0EDE7] last:border-0 last:pb-0"
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${TAG_STYLES[rp.tagColor]}`}>
                          {rp.tag}
                        </span>
                        <p className="text-xs font-semibold text-[#18170F] leading-snug group-hover:text-[#BF7340] transition-colors">
                          {rp.title}
                        </p>
                        <span className="text-[10px] text-[#8C8A82]">{rp.readTime}</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* All articles */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 }}
                className="bg-white border border-[#E2DDD5] rounded-2xl p-6"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C8A82] mb-4">
                  All Articles
                </p>
                <div className="flex flex-col gap-3">
                  {BLOG_POSTS.map((bp) => (
                    <Link
                      key={bp.slug}
                      to={`/blog/${bp.slug}`}
                      className={`text-xs font-semibold leading-snug transition-colors ${
                        bp.slug === post.slug
                          ? "text-[#BF7340] cursor-default"
                          : "text-[#5C5A52] hover:text-[#BF7340]"
                      }`}
                    >
                      {bp.title}
                    </Link>
                  ))}
                </div>
              </motion.div>

              {/* Quick CTA */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.34 }}
                className="bg-[#18170F] rounded-2xl p-6 text-[#F9F8F5]"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#BF7340] mb-2">
                  Free Demo
                </p>
                <p className="text-sm font-semibold leading-snug mb-4">
                  See how automation works for your business — live, in 30 minutes.
                </p>
                <Link
                  to="/contact"
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#BF7340] px-4 text-[11px] font-bold uppercase tracking-wider text-[#F9F8F5] hover:bg-[#A0602E] transition-colors"
                >
                  Book Now <ArrowRight size={12} />
                </Link>
              </motion.div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
