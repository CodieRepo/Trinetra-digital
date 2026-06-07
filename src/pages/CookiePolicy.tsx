import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function CookiePolicy() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Cookie Policy — Trinetra Digital Solution"
        description="Review how Trinetra Digital Solution uses cookies and tracking technologies to ensure speed, accessibility, and platform compliance."
        canonical="https://trinetradigitalsolution.com/cookie-policy"
        noindex={false}
      />
      <section className="bg-white pt-20 pb-16 md:pt-24 md:pb-24 border-b border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="main-container max-w-[760px] mx-auto px-4"
        >
          <span className="text-xs font-bold tracking-widest text-accent uppercase block mb-2">Legal Compliance</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-1 mb-2 font-display">Cookie Policy</h1>
          <p className="text-xs font-bold text-slate-400 mb-10">Last updated: June 3, 2026</p>

          <div className="flex flex-col gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">1. What Are Cookies</h2>
              <p>Cookies are small text files placed on your device (computer, tablet, or mobile phone) when you browse pages online. They are widely used to make websites work more efficiently, recognize returning visitors, support basic features, and provide analytics information to website administrators.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">2. How We Use Cookies</h2>
              <p>Trinetra Digital Solution uses cookies and local browser storage to:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Essential Operation:</strong> Deliver page loading transitions, maintain menu states, and remember contact form fields as you navigate between services.</li>
                  <li><strong>Performance Monitoring:</strong> Analyze site loading speeds, page visibility metrics, and overall user flow patterns via secure, privacy-compliant analytical frameworks (such as Vercel Speed Insights). We do not record individual identities or personal credentials during this process.</li>
                  <li><strong>Ad Campaign Compliance:</strong> Provide standard page tracking to match traffic logs with Google Ads and Meta Ads referral signals. This ensures our marketing campaigns execute correctly within Meta Business Manager and Google Ads consoles without distributing sensitive customer information.</li>
                </ul>
              </p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">3. Third-Party Tracking Technologies</h2>
              <p>When clicking our advertisements on external networks (like Facebook, Instagram, or Google Search), basic conversion pixels and referral tokens may set temporary parameters in your browser to verify campaign outcomes. These parameters are governed entirely by the privacy and cookie policies of Google LLC and Meta Platforms, Inc. respectively.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">4. Managing &amp; Controlling Cookies</h2>
              <p>Most internet browsers accept cookies automatically, but you can configure your browser preferences to reject new cookies, disable existing cookies, or notify you when a website attempts to place a cookie on your device. To learn how to manage cookies, visit the support sections of your browser (e.g., Google Chrome, Apple Safari, Mozilla Firefox, Microsoft Edge).</p>
              <p className="mt-3">Please note that disabling cookies completely may impact your user experience and make some interactive features on our site inaccessible.</p>
            </div>
            
          </div>
        </motion.div>
      </section>
    </>
  );
}
