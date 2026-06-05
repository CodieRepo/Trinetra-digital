import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
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
const CookiePolicy     = lazy(() => import("@/pages/CookiePolicy"));
const DataUsageNotice  = lazy(() => import("@/pages/DataUsageNotice"));
const NotFoundPage     = lazy(() => import("@/pages/NotFoundPage"));
const AdminCrm         = lazy(() => import("@/pages/admin/AdminCrm"));
const AdminPipeline    = lazy(() => import("@/pages/admin/AdminPipeline"));


// Service sub-pages
const FutureSolutions     = lazy(() => import("@/pages/services/FutureSolutions"));
const CrmDevelopment      = lazy(() => import("@/pages/services/CrmDevelopment"));
const WebsiteDevelopment  = lazy(() => import("@/pages/services/WebsiteDevelopment"));
const DigitalMarketing    = lazy(() => import("@/pages/services/DigitalMarketing"));

// Industry pages


// Local SEO pages
const Gorakhpur     = lazy(() => import("@/pages/GorakhpurPage"));
const UttarPradesh  = lazy(() => import("@/pages/UttarPradeshPage"));

// Loading fallback
function PageSpinner() {
  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
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
          <Route path="/cookie-policy"            element={<CookiePolicy />} />
          <Route path="/data-usage-notice"        element={<DataUsageNotice />} />
          <Route path="/admin"                    element={<AdminCrm />} />
          <Route path="/admin/pipeline"            element={<AdminPipeline />} />

          {/* Service Sub-pages */}
          <Route path="/services/whatsapp-automation" element={<FutureSolutions />} />
          <Route path="/services/ai-crm"              element={<Navigate to="/services/crm-development" replace />} />
          <Route path="/services/crm-development"     element={<CrmDevelopment />} />
          <Route path="/services/smart-followup"      element={<FutureSolutions />} />
          <Route path="/services/website-development" element={<WebsiteDevelopment />} />
          <Route path="/services/digital-marketing"   element={<DigitalMarketing />} />
          <Route path="/services/ai-chatbots"         element={<FutureSolutions />} />
          <Route path="/services/future-solutions"    element={<FutureSolutions />} />

          {/* Industry Pages */}
          <Route path="/industries/healthcare"     element={<Navigate to="/services" replace />} />
          <Route path="/industries/real-estate"    element={<Navigate to="/services" replace />} />
          <Route path="/industries/coaching"       element={<Navigate to="/services" replace />} />
          <Route path="/industries/solar"          element={<Navigate to="/services" replace />} />
          <Route path="/industries/local-business" element={<Navigate to="/services" replace />} />

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
