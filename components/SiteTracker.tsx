"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fires once per page navigation, records a visit in site_daily_visits.
// Runs client-side so it never blocks SSR. Admin pages are excluded.
export default function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    fetch("/api/track", { method: "POST" }).catch(() => {});
  }, [pathname]);

  return null;
}
