import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import WhatsAppFloat from "../components/WhatsAppFloat";
import MobileStickyCTA from "../components/MobileStickyCTA";
import { FinalCTAFooter } from "../components/FinalCTA";

interface PageLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export default function PageLayout({ children, hideFooter = false }: PageLayoutProps) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <div className="bg-[#09090B] text-slate-100 antialiased selection:bg-accent/25 selection:text-slate-100 min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="bg-base text-ink-1 antialiased selection:bg-accent/20 selection:text-ink-1">
      <Navbar />
      <main className="pt-[60px]">
        {children}
      </main>
      {!hideFooter && <FinalCTAFooter />}
      <WhatsAppFloat />
      <MobileStickyCTA />
    </div>
  );
}
