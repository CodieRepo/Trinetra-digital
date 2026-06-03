import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, ArrowRight } from "lucide-react";
import SEO from "../components/seo/SEO";

export default function NotFoundPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Page Not Found — Trinetra Digital Solution"
        description="The page you're looking for doesn't exist. Return to Trinetra Digital Solution's homepage."
        canonical="https://trinetradigitalsolution.com/404"
        noindex={true}
      />
      <section className="min-h-screen bg-surface-2 flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-[480px] mx-auto px-6"
        >
          <span className="font-display text-[120px] leading-none text-accent opacity-15 select-none block font-semibold mb-4">
            404
          </span>
          <h1 className="display-md text-ink-1 mb-4 -mt-6 font-display font-bold">Page not found</h1>
          <p className="body-md text-ink-2 mb-10 font-semibold">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 h-11 rounded-lg bg-cta px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-cta-hover transition-colors cursor-pointer"
            >
              <Home size={14} /> Go Home
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 h-11 rounded-lg border border-border bg-white px-6 text-xs font-semibold text-ink-1 hover:bg-surface-2 transition-colors"
            >
              Contact Us <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
