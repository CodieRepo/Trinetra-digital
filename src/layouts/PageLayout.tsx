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
      <div className="bg-[#0B0A05] text-[#F3F4F6] antialiased selection:bg-[#BF7340]/25 selection:text-[#F3F4F6] min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="bg-[#F9F8F5] text-[#18170F] antialiased selection:bg-[#BF7340]/25 selection:text-[#18170F]">
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
