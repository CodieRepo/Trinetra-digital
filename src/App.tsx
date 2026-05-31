import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import PageLayout from "@/layouts/PageLayout";

// ── Eager-loaded (above the fold) ─────────────────────────────────────────
import Home from "@/pages/Home";

// ── Lazy-loaded (code-split, improves LCP) ────────────────────────────────
const ServicesPage     = lazy(() => import("@/pages/ServicesPage"));
const PricingPage      = lazy(() => import("@/pages/PricingPage"));
const ContactPage      = lazy(() => import("@/pages/ContactPage"));
const AboutPage        = lazy(() => import("@/pages/AboutPage"));
const BlogPage         = lazy(() => import("@/pages/BlogPage"));
const BlogPostPage     = lazy(() => import("@/pages/BlogPostPage"));
const PrivacyPage      = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage        = lazy(() => import("@/pages/TermsPage"));
const RefundPage       = lazy(() => import("@/pages/RefundPage"));
const DisclaimerPage   = lazy(() => import("@/pages/DisclaimerPage"));
const NotFoundPage     = lazy(() => import("@/pages/NotFoundPage"));
const AdminCrm         = lazy(() => import("@/pages/admin/AdminCrm"));


// Service sub-pages
const WhatsAppAutomation  = lazy(() => import("@/pages/services/WhatsAppAutomation"));
const AiCrm               = lazy(() => import("@/pages/services/AiCrm"));
const SmartFollowup       = lazy(() => import("@/pages/services/SmartFollowup"));
const WebsiteDevelopment  = lazy(() => import("@/pages/services/WebsiteDevelopment"));
const DigitalMarketing    = lazy(() => import("@/pages/services/DigitalMarketing"));
const AiChatbots          = lazy(() => import("@/pages/services/AiChatbots"));

// Industry pages
const Healthcare    = lazy(() => import("@/pages/industries/Healthcare"));
const RealEstate    = lazy(() => import("@/pages/industries/RealEstate"));
const Coaching      = lazy(() => import("@/pages/industries/Coaching"));
const Solar         = lazy(() => import("@/pages/industries/Solar"));
const LocalBusiness = lazy(() => import("@/pages/industries/LocalBusiness"));

// Local SEO pages
const Gorakhpur     = lazy(() => import("@/pages/GorakhpurPage"));
const UttarPradesh  = lazy(() => import("@/pages/UttarPradeshPage"));

// Loading fallback
function PageSpinner() {
  return (
    <div className="min-h-screen bg-[#F9F8F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#BF7340]/30 border-t-[#BF7340] rounded-full animate-spin" />
    </div>
  );
}

// AnimatePresence needs the key from useLocation
function AnimatedRoutes() {
  const location = useLocation();

  // Scroll to top on every route change
  return (
    <PageLayout>
      <Suspense fallback={<PageSpinner />}>
        <Routes location={location} key={location.pathname}>
          {/* Core */}
          <Route path="/"                         element={<Home />} />
          <Route path="/services"                 element={<ServicesPage />} />
          <Route path="/pricing"                  element={<PricingPage />} />
          <Route path="/contact"                  element={<ContactPage />} />
          <Route path="/about"                    element={<AboutPage />} />
          <Route path="/blog"                     element={<BlogPage />} />
          <Route path="/blog/:slug"               element={<BlogPostPage />} />
          <Route path="/privacy-policy"           element={<PrivacyPage />} />
          <Route path="/terms-and-conditions"     element={<TermsPage />} />
          <Route path="/refund-policy"            element={<RefundPage />} />
          <Route path="/disclaimer"               element={<DisclaimerPage />} />
          <Route path="/admin"                    element={<AdminCrm />} />

          {/* Service Sub-pages */}
          <Route path="/services/whatsapp-automation" element={<WhatsAppAutomation />} />
          <Route path="/services/ai-crm"              element={<AiCrm />} />
          <Route path="/services/smart-followup"      element={<SmartFollowup />} />
          <Route path="/services/website-development" element={<WebsiteDevelopment />} />
          <Route path="/services/digital-marketing"   element={<DigitalMarketing />} />
          <Route path="/services/ai-chatbots"         element={<AiChatbots />} />

          {/* Industry Pages */}
          <Route path="/industries/healthcare"     element={<Healthcare />} />
          <Route path="/industries/real-estate"    element={<RealEstate />} />
          <Route path="/industries/coaching"       element={<Coaching />} />
          <Route path="/industries/solar"          element={<Solar />} />
          <Route path="/industries/local-business" element={<LocalBusiness />} />

          {/* Local SEO */}
          <Route path="/gorakhpur"     element={<Gorakhpur />} />
          <Route path="/uttar-pradesh" element={<UttarPradesh />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </PageLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <SpeedInsights />
    </BrowserRouter>
  );
}
