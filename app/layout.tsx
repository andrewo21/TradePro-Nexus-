import type { Metadata } from "next";
import "./globals.css";
import WaitlistMobileBar from "@/components/WaitlistMobileBar";
import PushNotificationProvider from "@/components/PushNotificationProvider";
import { Suspense } from "react";
import Link from "next/link";

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
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-[#0f172a] text-slate-100 antialiased">
        {children}

        {/* Global waitlist CTA strip — every page */}
        <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-6 text-center">
          <p className="text-slate-300 text-sm font-semibold mb-1">
            TradePro Nexus is launching soon.
          </p>
          <p className="text-slate-500 text-xs mb-3">
            Join the waitlist for early access and your verified spot.
          </p>
          <Link
            href="/#waitlist"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Get Early Access — Free
          </Link>
        </div>

        {/* Mobile floating waitlist bar */}
        <Suspense fallback={null}>
          <WaitlistMobileBar />
        </Suspense>

        {/* Push notification service worker registration */}
        <PushNotificationProvider />
      </body>
    </html>
  );
}
