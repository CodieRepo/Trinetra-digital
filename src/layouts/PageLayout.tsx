import Navbar from "../components/Navbar";
import WhatsAppFloat from "../components/WhatsAppFloat";
import MobileStickyCTA from "../components/MobileStickyCTA";
import { FinalCTAFooter } from "../components/FinalCTA";

interface PageLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export default function PageLayout({ children, hideFooter = false }: PageLayoutProps) {
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
