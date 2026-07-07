"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, X } from "lucide-react";

export default function RaffleFeedBanner({ loggedIn }: { loggedIn: boolean }) {
  const [active, setActive] = useState(false);
  const [qualified, setQualified] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("raffle_feed_banner_dismissed") === "1");
    }
    fetch("/api/raffle/config")
      .then(res => res.ok ? res.json() : null)
      .then(data => setActive(!!data?.active))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/raffle/status")
      .then(res => res.ok ? res.json() : null)
      .then(data => setQualified(!!data?.qualified))
      .catch(() => {});
  }, [loggedIn]);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("raffle_feed_banner_dismissed", "1");
  }

  if (!active || !loggedIn || qualified || dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-orange-950/40 border border-orange-700/50 rounded-xl px-4 py-3 mb-4">
      <Gift className="w-5 h-5 text-orange-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-orange-300">Win a Milwaukee M18 Combo Kit ($299.99)</p>
        <p className="text-xs text-orange-400/80">Post once and refer 2 friends to enter. Drawing August 1st.</p>
      </div>
      <Link
        href="/account"
        className="flex-shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors"
      >
        See Status
      </Link>
      <button onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0 text-orange-400/60 hover:text-orange-300 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
