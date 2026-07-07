"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";

export default function RaffleHomeBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    fetch("/api/raffle/config")
      .then(res => res.ok ? res.json() : null)
      .then(data => setActive(!!data?.active))
      .catch(() => {});
  }, []);

  if (!active) return null;

  return (
    <div className="bg-[#0f172a] border-y border-[#f97316]/30 py-10 px-4 text-center">
      <div className="max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 bg-[#f97316]/15 border border-[#f97316]/40 text-[#f97316] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
          <Gift className="w-3.5 h-3.5" /> Giveaway
        </span>
        <h2 className="text-white font-black text-2xl md:text-3xl mb-2">
          Win a Milwaukee M18 Combo Kit
        </h2>
        <p className="text-[#94a3b8] text-base mb-6">
          Valued at $299.99. Sign up free, post once, refer 2 friends. Drawing August 1st.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#f97316] hover:bg-[#ea580c] text-white font-black rounded-xl text-base transition-colors"
        >
          Enter to Win <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-[#475569] text-xs mt-4">
          No purchase necessary. Open to US residents 18 and older. One entry per person.
        </p>
      </div>
    </div>
  );
}
