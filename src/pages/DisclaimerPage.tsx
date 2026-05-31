import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function DisclaimerPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Legal Disclaimer — Trinetra Digital Solution"
        description="Review our advertising compliance, trademark, and realistic results disclosures at Trinetra Digital Solution."
        canonical="https://trinetradigitalsolution.com/disclaimer"
        noindex={false}
      />
      <section className="bg-white pt-20 pb-16 md:pt-24 md:pb-24 border-b border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="main-container max-w-[760px] mx-auto px-4"
        >
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-2">Legal Compliance</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Legal &amp; Earnings Disclaimer</h1>
          <p className="text-xs font-bold text-slate-400 mb-10">Last updated: May 31, 2026</p>

          <div className="flex flex-col gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">1. No Guarantees of Performance or Income</h2>
              <p>Trinetra Digital Solution (a brand owned and operated under Charulata Enterprises) provides high-performance custom website development, software engineering, and strategic marketing campaign management. We do <strong>NOT</strong> make any fixed guarantees, assurances, or promises regarding: specific sales metrics, lead conversion rates, revenue generation, or profit numbers.</p>
              <p className="mt-3">Business growth and digital marketing outcomes depend on several external variables, including but not limited to: your market niche, product pricing, customer service quality, overall brand authority, sales team follow-up speeds, and general economic conditions. Any examples, historical case studies, or realistic illustrations shared on this site or in our proposals are strictly for educational demonstration and represent no guarantee of identical outcomes.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-[#2563EB] mb-3 uppercase tracking-wider font-semibold">2. Realistic Positioning &amp; Professional Copy</h2>
              <p>We help businesses improve their online presence and generate qualified enquiries through strategic digital marketing. We explicitly reject spammy, deceptive, or misleading marketing claims, "get-rich-quick" schemes, fake counters, fake client testimonials, or exaggerated "AI magic" statements. Our software solutions and websites are constructed as professional business tools to improve operational efficiency and pipeline management.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">3. Independent Professional Agency</h2>
              <p>Trinetra Digital Solution is an independent software development and digital marketing agency. We are not affiliated with, endorsed by, or partner with Meta Platforms, Inc., Google LLC, or their parent companies. <strong>Meta, Facebook, Instagram, Google, and WhatsApp</strong> are registered trademarks of their respective corporate owners. Any references to their services on this website refer strictly to our technical configuration and management abilities within those networks.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">4. Separate Platform Billing</h2>
              <p>All budgets spent on Google Ads and Meta Ads channels are paid directly by the client to those platforms. Trinetra Digital Solution holds no responsibility for click costs, impression bid changes, or billing disputes on Meta and Google accounts.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">5. Legal Corporate Ownership</h2>
              <p>Trinetra Digital Solution is a business brand operated legally under <strong>Charulata Enterprises</strong>, located in Gorakhpur, Uttar Pradesh, India — 273001.</p>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
