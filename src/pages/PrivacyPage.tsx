import { useEffect } from "react";
import { motion } from "framer-motion";
import SEO from "../components/seo/SEO";

export default function PrivacyPage() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);

  return (
    <>
      <SEO
        title="Privacy Policy — Trinetra Digital Solution"
        description="Privacy Policy for Trinetra Digital Solution. Learn how we collect, use, and protect your data."
        canonical="https://trinetradigitalsolution.com/privacy-policy"
        noindex={false}
      />
      <section className="bg-[#F9F8F5] pt-20 pb-16 md:pt-28 border-b border-[#E2DDD5]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="main-container max-w-[720px]">
          <h1 className="display-md text-[#18170F] mb-2 mt-2">Privacy Policy</h1>
          <p className="text-xs text-[#8C8A82] mb-10">Last updated: May 28, 2026</p>

          <div className="flex flex-col gap-8 body-sm text-[#5C5A52]">
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">1. Information We Collect</h2>
              <p>When you contact us via our website, WhatsApp, or phone, we collect: your name, phone number, email address (if provided), business name, and any information you share in your inquiry. We do not collect financial data or sensitive personal information.</p>
            </div>
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">2. How We Use Your Information</h2>
              <p>We use your information solely to: respond to your inquiries, provide our services, send service-related communications, and improve our offerings. We do not sell, trade, or rent your personal information to third parties.</p>
            </div>
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">3. WhatsApp & Communication Data</h2>
              <p>If you engage with our WhatsApp automation systems as part of our service delivery to a business, conversation data is processed to provide qualification and CRM services. All data is handled in accordance with WhatsApp Business API policies.</p>
            </div>
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">4. Data Security</h2>
              <p>We implement industry-standard security measures to protect your information. Our website uses HTTPS encryption. Access to customer data is restricted to authorized personnel only.</p>
            </div>
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">5. Cookies</h2>
              <p>Our website may use basic analytics cookies to understand traffic patterns. We do not use advertising cookies or track you across other websites.</p>
            </div>
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">6. Your Rights</h2>
              <p>You have the right to request access to, correction of, or deletion of your personal data. To exercise these rights, contact us at: info@trinetradigitalsolution.com</p>
            </div>
            <div>
              <h2 className="heading-xs text-[#18170F] mb-3">7. Contact</h2>
              <p>For privacy-related queries: <a href="mailto:info@trinetradigitalsolution.com" className="text-[#BF7340] hover:underline">info@trinetradigitalsolution.com</a> · +91 9334757759</p>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
