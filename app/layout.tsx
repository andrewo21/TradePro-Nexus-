import type { Metadata } from "next";
import "./globals.css";
import WaitlistMobileBar from "@/components/WaitlistMobileBar";
import PushNotificationProvider from "@/components/PushNotificationProvider";
import SiteTracker from "@/components/SiteTracker";
import { Suspense } from "react";
import Link from "next/link";
import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

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
        {/* Google Analytics 4 — every page */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>

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
            className="btn-glow inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm"
          >
            Get Early Access — Free
          </Link>
          {/* Cross-property link — subtle, one direction only */}
          <p className="mt-4 text-xs text-slate-600">
            Need a construction résumé?{" "}
            <a
              href="https://www.tradeprotech.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors underline"
            >
              Build it free at TradePro Tech →
            </a>
          </p>

          {/* Legal links — every page */}
          <p className="mt-3 text-xs text-slate-600">
            <Link href="/privacy-policy" className="hover:text-slate-400 transition-colors underline">Privacy Policy</Link>
            {" "}·{" "}
            <Link href="/terms-of-use" className="hover:text-slate-400 transition-colors underline">Terms of Use</Link>
          </p>
        </div>

        {/* Mobile floating waitlist bar */}
        <Suspense fallback={null}>
          <WaitlistMobileBar />
        </Suspense>

        {/* Push notification service worker registration */}
        <PushNotificationProvider />

        {/* Site visit tracker — client-side, fire-and-forget */}
        <Suspense fallback={null}>
          <SiteTracker />
        </Suspense>
      </body>
    </html>
  );
}
