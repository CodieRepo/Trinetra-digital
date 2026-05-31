import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function TermsPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Terms & Conditions — Trinetra Digital Solution"
        description="Review the Terms & Conditions governing website development, CRM engineering, and marketing services by Trinetra Digital Solution."
        canonical="https://trinetradigitalsolution.com/terms-and-conditions"
        noindex={false}
      />
      <section className="bg-white pt-20 pb-16 md:pt-24 md:pb-24 border-b border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="main-container max-w-[760px] mx-auto px-4"
        >
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-2">Legal Compliance</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Terms &amp; Conditions</h1>
          <p className="text-xs font-bold text-slate-400 mb-10">Last updated: May 31, 2026</p>

          <div className="flex flex-col gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">1. Agreement to Terms</h2>
              <p>By accessing this website, booking a consultation, or engaging the services of Trinetra Digital Solution (a brand owned by Charulata Enterprises), you agree to be bound by these Terms &amp; Conditions. If you disagree with any clause outlined in this document, you must cease site access and refrain from executing project contracts.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">2. Services Scope &amp; Milestones</h2>
              <p>We provide website development, custom CRM software development, and digital marketing consulting. Each engagement is governed by a detailed written Project Proposal or Service Agreement detailing: specific page counts, feature specifications, deliverables, schedules, and costs. Any additional functionality or out-of-scope work requested post-signing will be billed at standard custom hourly engineering rates.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">3. Transparent Payment Terms</h2>
              <p>For one-time projects (Web Development &amp; Custom CRM Development), payments are strictly structured in milestone increments (e.g., 50% advance onboarding, 50% on project completion and prior to hosting migration), unless specified otherwise in writing. Monthly support retainers (such as Digital Marketing Management) are billed upfront on a recurring 30-day billing cycle. Delay in milestone payments may result in immediate suspension of development or server deployment tasks.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">4. Client Responsibilities &amp; Media Assets</h2>
              <p>To deliver high-performance portals within target timelines, the client must provide necessary copywriting text, product photographs, branding guidelines, login credentials (where applicable), and active domain/hosting configurations. We are not liable for timeline extensions resulting from client delays in assets delivery.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">5. Intellectual Property Rights</h2>
              <p>Upon final milestone clearance, full ownership rights of the custom frontend code, database configurations, landing pages, and visual assets are transferred entirely to the client. Trinetra Digital Solution retains normal portfolio rights to showcase work screenshots on its official website for agency promotional purposes, unless a strict non-disclosure agreement (NDA) is actively executed between parties.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">6. Advertising Platforms &amp; Budget Accountability</h2>
              <p>Clients are solely responsible for setting up billing credentials on Meta Ads Manager and Google Ads consoles and paying respective ad budgets directly to Google and Meta. We are responsible strictly for strategic campaign management, conversion tracking setup, and ad copywriting. We are not responsible for any platform suspensions, ad account reviews, or merchant payment failures triggered by the advertising networks.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">7. Governing Law</h2>
              <p>These terms and all project covenants are governed strictly under the laws of the Republic of India. Any legal disputes, mediation claims, or arbitration processes arising from our services are subject exclusively to the jurisdiction of the local courts located in Gorakhpur, Uttar Pradesh, India.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">8. Corporate Information &amp; Entity</h2>
              <p>Trinetra Digital Solution is the technology and service brand operated and legally owned by the registered parent entity <strong>Charulata Enterprises</strong>. All agreements, commercial covenants, and transactions are legally executed under <strong>Charulata Enterprises</strong>.</p>
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-semibold space-y-1">
                <p>Legal Entity: Charulata Enterprises</p>
                <p>Office Location: Gorakhpur, Uttar Pradesh, India — 273001</p>
                <p>Official Contact: info@trinetradigitalsolution.com · +91 9334757759</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
