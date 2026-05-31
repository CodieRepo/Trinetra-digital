import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function PrivacyPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Privacy Policy — Trinetra Digital Solution"
        description="Privacy Policy for Trinetra Digital Solution. Learn how we collect, use, and secure your business information."
        canonical="https://trinetradigitalsolution.com/privacy-policy"
        noindex={false}
      />
      <section className="bg-white pt-20 pb-16 md:pt-24 md:pb-24 border-b border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="main-container max-w-[760px] mx-auto px-4"
        >
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-2">Legal Compliance</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-xs font-bold text-slate-400 mb-10">Last updated: May 31, 2026</p>

          <div className="flex flex-col gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">1. Information We Collect</h2>
              <p>We collect basic business and contact information when you voluntarily submit an enquiry on our website, contact us via WhatsApp, email us, or call us. This information typically includes your name, business name, phone/WhatsApp number, email address, and any specific requirements or message details you choose to share with us.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">2. How We Use Your Information</h2>
              <p>The information we collect is strictly used to process your queries, present project proposals, deliver website development, CRM development, or digital marketing support, and maintain clean ongoing client communication. We never sell, lease, trade, or distribute your contact details to third-party marketing brokers.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">3. Tracking &amp; Cookies</h2>
              <p>Our website utilizes standard, basic analytics tools (such as Vercel Speed Insights) to monitor general site traffic, load performance, and usability metrics. We do not employ intrusive tracking cookies or sell your browsing history to third-party ad networks.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">4. Data Security</h2>
              <p>We deploy robust, standard security measures to protect the confidentiality of your inquiries. Our entire web architecture is served over secure, encrypted HTTPS protocols. Database records are restricted strictly to authorized engineering and management personnel.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">5. Your Data Rights</h2>
              <p>Under local laws, you have full rights to request correction, amendment, or total deletion of your business contact information from our databases. To initiate a database deletion request, kindly email our data compliance desk at: <a href="mailto:info@trinetradigitalsolution.com" className="text-[#2563EB] hover:underline font-semibold">info@trinetradigitalsolution.com</a>. We will process your deletion request within 48 hours.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">6. Contact Information</h2>
              <p>If you have any questions, compliance concerns, or requests regarding this Privacy Policy, please reach out to our legal officer:</p>
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-semibold space-y-1">
                <p>Entity: Trinetra Digital Solution (Charulata Enterprises)</p>
                <p>Email: info@trinetradigitalsolution.com</p>
                <p>Phone: +91 9334757759</p>
                <p>Address: Gorakhpur, Uttar Pradesh, India — 273001</p>
              </div>
            </div>
            
            <div className="mt-6 pt-8 border-t border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">7. Corporate Transparency &amp; Brand Ownership</h2>
              <div className="p-5 bg-blue-50/30 border border-blue-100 rounded-2xl text-xs leading-relaxed text-slate-600 flex flex-col gap-3">
                <p>
                  <strong>Trinetra Digital Solution</strong> is the official services, technology, and software development brand operated and legally owned by the registered parent entity <strong>Charulata Enterprises</strong>. Any reference on this website to "Trinetra", "Trinetra Digital Solution", "we", "our", or "us" in relation to agreements, billing, proposals, or software operations refers to the business activities of <strong>Charulata Enterprises</strong>.
                </p>
                <p>
                  All official business transactions, client invoicing, legally binding agreements, payment gateways, and banking reconciliations are transacted strictly under the legal corporate entity name <strong>Charulata Enterprises</strong>. This statement is published for absolute clarity and legal compliance during payment merchant gateway verification, Google Merchant Center audits, Meta Business Suite verification, and local tax audits.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
