import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SEO from "../components/seo/SEO";
import Hero from "../components/Hero";
import TrustBar from "../components/TrustBar";
import TheProblem from "../components/TheProblem";
import TheSystem from "../components/TheSystem";
import Workflow from "../components/Workflow";
import Services from "../components/Services";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";

const HOME_SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://trinetradigitalsolution.com/#webpage",
    "url": "https://trinetradigitalsolution.com/",
    "name": "Trinetra Digital Solution — AI WhatsApp Automation & CRM for Indian Businesses",
    "isPartOf": { "@id": "https://trinetradigitalsolution.com/#website" },
    "primaryImageOfPage": { "@id": "https://trinetradigitalsolution.com/og-image.png" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://trinetradigitalsolution.com/" }],
    },
  },
];

export default function Home() {
  const location = useLocation();

  // Handle scroll to anchor on homepage (e.g., /#pricing from other pages)
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace("#", ""));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location]);

  return (
    <>
      <SEO
        title="Trinetra Digital Solution — AI WhatsApp Automation & CRM for Indian Businesses"
        description="Trinetra Digital Solution builds AI-powered WhatsApp automation and CRM infrastructure for Indian businesses. Turn conversations into qualified leads and closed deals — without adding headcount. Based in Gorakhpur, UP."
        canonical="https://trinetradigitalsolution.com/"
        schema={HOME_SCHEMA}
      />

      <section id="main-content" aria-label="Homepage">
        <Hero />
        <TrustBar />
        <TheProblem />
        <TheSystem />
        <Workflow />
        <Services />
        <Testimonials />
        <Pricing />
      </section>
    </>
  );
}
