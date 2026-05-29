"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle, ArrowRight, ShieldCheck, Zap, Star, Lock
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { GC_TIERS, FOUNDER_LIMIT, type GCTier } from "@/lib/stripe";

const TIER_FEATURES = {
  solo: [
    "Full verified crew search",
    "Bonding, payroll & foreman details",
    "Contact info for all verified subs",
    "1–3 user seats",
    "Save and bookmark crews",
  ],
  growing: [
    "Everything in Solo",
    "Up to 10 user seats",
    "Team access management",
    "Priority crew match results",
    "Saved search filters",
  ],
  full: [
    "Everything in Growing Firm",
    "Unlimited user seats",
    "API access (coming soon)",
    "Dedicated account support",
    "Custom onboarding",
  ],
} as const;

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<GCTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState<number | null>(null);
  const [isGC, setIsGC] = useState<boolean | null>(null);

  useEffect(() => {
    // Check auth + role
    getSupabase()?.auth.getUser().then(({ data }) => {
      setIsGC(data.user?.user_metadata?.role === "gc");
    });

    // Check founder spots remaining
    fetch("/api/stripe/founder-count")
      .then(r => r.json())
      .then(d => setFounderSpotsLeft(Math.max(0, FOUNDER_LIMIT - (d.count ?? 0))))
      .catch(() => setFounderSpotsLeft(null));
  }, []);

  async function startTrial(tier: GCTier) {
    const supabase = getSupabase();
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) { router.push("/signup"); return; }

    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const tiers = (Object.entries(GC_TIERS) as [GCTier, typeof GC_TIERS["solo"]][]);
  const founderActive = founderSpotsLeft !== null && founderSpotsLeft > 0;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            <Building2 className="w-3.5 h-3.5" /> GC Access Plans
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            Find the right crews.<br />
            <span className="text-orange-500">Before the next GC calls them.</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            30-day free trial. No credit card required. Cancel any time.
          </p>

          {/* Founder badge */}
          {founderActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-950/60 border border-orange-700/60 text-orange-400 text-sm font-bold rounded-xl"
            >
              <Star className="w-4 h-4" />
              {founderSpotsLeft} founder spots remaining — rate locked forever
            </motion.div>
          )}
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {tiers.map(([key, cfg], i) => {
            const features = TIER_FEATURES[key];
            const isPopular = key === "growing";
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-slate-800/60 border rounded-2xl p-6 flex flex-col ${
                  isPopular ? "border-orange-600/60 ring-1 ring-orange-600/30" : "border-slate-700/50"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{cfg.description}</p>
                  <h2 className="text-xl font-black text-white mb-1">{cfg.label}</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">${cfg.price}</span>
                    <span className="text-slate-400 text-sm">/month</span>
                  </div>
                  {founderActive && (
                    <p className="text-xs text-orange-400 font-semibold mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Founder rate — locked forever
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 mb-6 flex-1">
                  {features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300 text-sm">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => startTrial(key)}
                  disabled={loading !== null}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                    isPopular
                      ? "bg-orange-600 hover:bg-orange-500 text-white"
                      : "bg-blue-700 hover:bg-blue-600 text-white"
                  }`}
                >
                  {loading === key ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting…</span>
                  ) : (
                    <>Start 30-Day Free Trial <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm mb-6">{error}</p>
        )}

        {/* Trust row */}
        <div className="grid sm:grid-cols-3 gap-4 text-center mb-10">
          {[
            { icon: ShieldCheck, label: "Verified credentials only", desc: "Every sub has passed document and reference verification" },
            { icon: Zap, label: "No credit card for trial", desc: "30 days free, then cancel or keep going — your call" },
            { icon: Star, label: "Founder rate locked", desc: "First 50 GCs keep their price forever, regardless of tier" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <Icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-white font-semibold text-sm mb-1">{label}</p>
              <p className="text-slate-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>

        {/* Sub CTA */}
        <div className="text-center bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-slate-400 text-sm mb-1">Are you a Trade Pro or Sub?</p>
          <p className="text-white font-semibold mb-3">
            Search for GCs is always free. Build your Digital Trade Card and get seen.
          </p>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Build My Trade Card — Free
          </Link>
        </div>
      </div>
    </div>
  );
}
