import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../index.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trinetra Digital Solutions - Business Automation & CRM",
  description: "WhatsApp-first CRM and Business Automation Platform for SMEs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface-2 text-foreground antialiased`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
