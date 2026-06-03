import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function DataUsageNotice() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Data Usage Notice — Trinetra Digital Solution"
        description="Review our transparent guidelines regarding client databases, API integrations, data security, and ad network policy compliance."
        canonical="https://trinetradigitalsolution.com/data-usage-notice"
        noindex={false}
      />
      <section className="bg-white pt-20 pb-16 md:pt-24 md:pb-24 border-b border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="main-container max-w-[760px] mx-auto px-4"
        >
          <span className="text-xs font-bold tracking-widest text-accent uppercase block mb-2">Legal Compliance</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-1 mb-2 font-display">Data Usage Notice</h1>
          <p className="text-xs font-bold text-slate-400 mb-10">Last updated: June 3, 2026</p>

          <div className="flex flex-col gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">1. Scope of Data Handling</h2>
              <p>This Data Usage Notice details how Trinetra Digital Solution (a brand operated legally under Charulata Enterprises) and our client systems process, store, and integrate business inquiry records. We prioritize database integrity and strictly implement data protocols conforming to Meta Business Policies, Google Ads Policies, and local Indian data protection directives.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">2. Customer Databases &amp; Custom CRMs</h2>
              <p>For custom database and CRM solutions engineered for our clients, the following rules apply:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Data Ownership:</strong> Our clients retain 100% ownership and control over their customer, prospect, and patient databases. Trinetra Digital Solution acts strictly as a technology builder and administrator, maintaining no proprietary rights or sales access to client databases.</li>
                  <li><strong>Restricted Access:</strong> Custom dashboards are structured with role-based authentication keys (RBAC). Access to databases is restricted via encrypted tokens, preventing unauthorized network exposure.</li>
                  <li><strong>Deletion Protocols:</strong> At the conclusion of technical support retainers or upon client request, our administrators delete all staging database duplicates from our development servers.</li>
                </ul>
              </p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">3. Third-Party Integrations &amp; API Policies</h2>
              <p>We integrate several external communication channels on behalf of client portals (e.g., WhatsApp Business API, Facebook Messenger API, Instagram Graph API, Google Maps API, and various payment gateways). All such integrations are configured in strict compliance with the developers' respective terms of service:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>WhatsApp API Integration:</strong> Leads matching templates are handled using certified WhatsApp API endpoints. Automated follow-ups are opt-in based, avoiding unsolicited spam triggers.</li>
                  <li><strong>Ad Network Pixels:</strong> When configured, conversion tracking pixels pass transaction signals anonymously to Meta Ads Manager or Google Ads. No raw personal identifiers are passed to ad network systems.</li>
                </ul>
              </p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">4. Data Encryption</h2>
              <p>All client data transferred during website submission forms or dashboard workflows is encrypted using standard Transport Layer Security (TLS/HTTPS). Stored database objects employ Secure Hash Algorithms to protect critical parameters.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">5. Legal Corporate Ownership</h2>
              <p>This Data Usage Notice is maintained and legally executed under our parent entity: <strong>Charulata Enterprises</strong>, located in Gorakhpur, Uttar Pradesh, India — 273001.</p>
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-semibold space-y-1">
                <p>Corporate Office: Charulata Enterprises</p>
                <p>Email: info@trinetradigitalsolution.com</p>
                <p>Location: Gorakhpur, Uttar Pradesh, India — 273001</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
