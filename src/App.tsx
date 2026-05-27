import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TrustBar from "./components/TrustBar";
import TheProblem from "./components/TheProblem";
import TheSystem from "./components/TheSystem";
import Workflow from "./components/Workflow";
import Services from "./components/Services";
import Testimonials from "./components/Testimonials";
import Pricing from "./components/Pricing";
import FinalCTA from "./components/FinalCTA";
import WhatsAppFloat from "./components/WhatsAppFloat";
import MobileStickyCTA from "./components/MobileStickyCTA";

export default function App() {
  return (
    <div className="bg-[#F9F8F5] text-[#18170F] antialiased selection:bg-[#BF7340]/25 selection:text-[#18170F]">
      {/* Section 0: Sticky Navigation */}
      <Navbar />

      {/* Section 1: Hero */}
      <Hero />

      {/* Section 2: Industry Trust Marquee */}
      <TrustBar />

      {/* Section 3: The Manual Problem Case */}
      <TheProblem />

      {/* Section 4: The Trinetra System Solution tabbed layout */}
      <TheSystem />

      {/* Section 5: The Process Steps */}
      <Workflow />

      {/* Section 6: Industry Fit Cards */}
      <Services />

      {/* Section 7: Key Metrics & Testimonial Carousel */}
      <Testimonials />

      {/* Section 8: Interactive Pricing Switch */}
      <Pricing />

      {/* Section 9: Final Inverted CTA & Section 10: Footer */}
      <FinalCTA />

      {/* Global Floating Action Nudge */}
      <WhatsAppFloat />

      {/* Mobile Sticky Bottom CTA Bar */}
      <MobileStickyCTA />
    </div>
  );
}
