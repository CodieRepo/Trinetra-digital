import Cursor from "./components/Cursor";
import SmoothScroll from "./components/SmoothScroll";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Workflow from "./components/Workflow";
import Dashboard from "./components/Dashboard";
import Pricing from "./components/Pricing";
import Testimonials from "./components/Testimonials";
import FinalCTA from "./components/FinalCTA";

export default function App() {
  return (
    <div className="bg-[#03060c] text-white antialiased selection:bg-cyan-300 selection:text-slate-900">
      {/* Global systems */}
      <SmoothScroll />
      <Cursor />

      {/* Navigation */}
      <Navbar />

      {/* Page sections */}
      <Hero />
      <Services />
      <Workflow />
      <Dashboard />
      <Pricing />
      <Testimonials />
      <FinalCTA />
    </div>
  );
}
