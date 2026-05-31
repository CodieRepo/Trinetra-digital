import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function RefundPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Refund Policy — Trinetra Digital Solution"
        description="Review our transparent milestone-based refund and project cancellation policy at Trinetra Digital Solution."
        canonical="https://trinetradigitalsolution.com/refund-policy"
        noindex={false}
      />
      <section className="bg-white pt-20 pb-16 md:pt-24 md:pb-24 border-b border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="main-container max-w-[760px] mx-auto px-4"
        >
          <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase block mb-2">Legal Compliance</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Refund &amp; Cancellation Policy</h1>
          <p className="text-xs font-bold text-slate-400 mb-10">Last updated: May 31, 2026</p>

          <div className="flex flex-col gap-8 text-xs sm:text-sm text-slate-600 leading-relaxed text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">1. General Principles</h2>
              <p>At Trinetra Digital Solution (a brand operated under Charulata Enterprises), we hold our engineering quality and client satisfaction to the highest professional standards. Because we dedicate physical developer hours, designer resources, and strategic consulting hours immediately upon project kick-off, we operate under a fair, milestone-based structure outlined below.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">2. Website &amp; CRM Development Refunds</h2>
              <p>For custom website development and software engineering projects, refunds are strictly milestone-based:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Onboarding Advance (50%):</strong> Once initial design wires, visual layouts, and staging environments have been created and presented, this deposit is non-refundable. If a project is cancelled by the client *prior* to any wireframe deliverables, a partial refund minus a 15% administrative and scheduling fee will be processed.</li>
                  <li><strong>Review &amp; Staging:</strong> Once a project is deployed onto our private staging servers and client feedback/revisions are active, the mid-project assets are non-refundable.</li>
                  <li><strong>Final Handover:</strong> Once final frontend code, source assets, database files, and domain migrations have been successfully executed and handed over, no refunds can be processed.</li>
                </ul>
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">3. Digital Marketing Retainer Cancellation</h2>
              <p>Ongoing monthly digital marketing management retainers are billed on a recurring 30-day upfront cycle.
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Clients can cancel their monthly management subscription at any point. Cancellation requests must be sent in writing at least 7 days before the next upcoming billing cycle.</li>
                  <li>Upon cancellation, campaign management will continue active until the end of the current paid billing cycle. No partial refunds are processed for mid-month cancellations.</li>
                </ul>
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">4. Separate Platform Advertising Budgets</h2>
              <p>Please note that all ad budgets paid directly to Meta (Facebook/Instagram), Google, or other advertising platforms are entirely separate and <strong>strictly non-refundable by our agency</strong>. Ad networks charge directly based on target impressions/clicks, and those budgets are outside our financial custody.</p>
            </div>
            
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">5. Refund Request Processing</h2>
              <p>To submit a formal milestone query or project cancellation, kindly send a detailed email stating your project scope and specific request to: <a href="mailto:info@trinetradigitalsolution.com" className="text-[#2563EB] hover:underline font-semibold">info@trinetradigitalsolution.com</a>. Eligible refunds will be evaluated, approved, and wired back to the original source bank account within 7 to 10 working days.</p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">6. Legal &amp; Corporate Entity</h2>
              <p>This policy is legally binding and transacted under our parent registered entity: <strong>Charulata Enterprises</strong>, located in Gorakhpur, Uttar Pradesh, India — 273001.</p>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
