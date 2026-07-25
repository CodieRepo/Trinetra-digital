import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import PageLayout from "@/layouts/PageLayout";
import { trackPageView } from "@/utils/metaPixel";

// ── Eager-loaded (above the fold) ─────────────────────────────────────────
import Home from "@/views/Home";

// ── Lazy-loaded (code-split, improves LCP) ────────────────────────────────
const ServicesPage     = lazy(() => import("@/views/ServicesPage"));
const PricingPage      = lazy(() => import("@/views/PricingPage"));
const ContactPage      = lazy(() => import("@/views/ContactPage"));
const AboutPage        = lazy(() => import("@/views/AboutPage"));
const BlogPage         = lazy(() => import("@/views/BlogPage"));
const BlogPostPage     = lazy(() => import("@/views/BlogPostPage"));
const PrivacyPage      = lazy(() => import("@/views/PrivacyPage"));
const TermsPage        = lazy(() => import("@/views/TermsPage"));
const RefundPage       = lazy(() => import("@/views/RefundPage"));
const DisclaimerPage   = lazy(() => import("@/views/DisclaimerPage"));
const CookiePolicy     = lazy(() => import("@/views/CookiePolicy"));
const DataUsageNotice  = lazy(() => import("@/views/DataUsageNotice"));
const NotFoundPage     = lazy(() => import("@/views/NotFoundPage"));
const AdminCrm         = lazy(() => import("@/views/admin/AdminCrm"));
const SuperAdmin       = lazy(() => import("@/views/super-admin/SuperAdmin"));

// Vertical Module Public & Staff Pages
const PublicRestaurantMenuPage = lazy(() => import("@/views/public/PublicRestaurantMenuPage"));
const OrderStatusPage          = lazy(() => import("@/views/public/OrderStatusPage"));
const StaffOpsPage             = lazy(() => import("@/views/staff/StaffOpsPage"));



// Service sub-pages
const FutureSolutions     = lazy(() => import("@/views/services/FutureSolutions"));
const CrmDevelopment      = lazy(() => import("@/views/services/CrmDevelopment"));
const WebsiteDevelopment  = lazy(() => import("@/views/services/WebsiteDevelopment"));
const DigitalMarketing    = lazy(() => import("@/views/services/DigitalMarketing"));

// Industry pages


// Local SEO pages
const Gorakhpur     = lazy(() => import("@/views/GorakhpurPage"));
const UttarPradesh  = lazy(() => import("@/views/UttarPradeshPage"));

// Loading fallback
function PageSpinner() {
  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

// Protected Route Guard Component (handled by Next.js middleware now)
/*
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("trinetra_jwt");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
*/

// AnimatePresence needs the key from useLocation
function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Track PageView on route change
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  // Redirect globally on session expiration
  useEffect(() => {
    const handleAuthExpired = () => {
      navigate("/admin", { state: { from: location } });
    };
    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, [navigate, location]);

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
          
          {/* Admin Routes */}
          <Route path="/admin"                    element={<AdminCrm />} />
          <Route path="/admin/*"                  element={<AdminCrm />} />

          {/* Super Admin */}
          <Route path="/super-admin"              element={<SuperAdmin />} />

          {/* Vertical Module Routes — Restaurant OS */}
          <Route path="/r/:tableToken"                        element={<PublicRestaurantMenuPage />} />
          <Route path="/r/:tableToken/order/:orderId"        element={<OrderStatusPage />} />
          <Route path="/staff/ops"                            element={<StaffOpsPage />} />


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
