import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TradePro Nexus — The Verified Marketplace for Construction",
    template: "%s | TradePro Nexus",
  },
  description:
    "TradePro Nexus connects verified Trade Pros with GCs and General Contractors. Find vetted crews with verified payroll in seconds. Build your Digital Trade Card and get seen by $30M+ GCs.",
  metadataBase: new URL("https://tradepronexus.com"),
  openGraph: {
    type: "website",
    siteName: "TradePro Nexus",
    title: "TradePro Nexus — The Verified Construction Marketplace",
    description:
      "Find vetted crews with verified payroll in seconds. The command center for construction hiring.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[#0f172a] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
