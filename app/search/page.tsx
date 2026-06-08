"use client";

import { useState } from "react";
import {
  Search, Building2, MapPin, Users, ShieldCheck,
  Filter, HardHat, Lock, Clock, ArrowRight, Zap
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Coming Soon gate ───────────────────────────────────────────────────────────
// Find Crews is a paid GC feature. It is fully locked during the waitlist
// engagement period. No queries run. No data is returned. The UI below is
// a visual preview only — all interactive elements are disabled.

const PREVIEW_RESULTS = [
  { name: "Coastal Mechanical Inc.", trade: "HVAC / Plumbing", location: "Tampa, FL", bonding: "$18M", crew: 24, payroll: "82%", tier: "green" as const },
  { name: "Iron Ridge Structural", trade: "Structural Steel", location: "Atlanta, GA", bonding: "$40M", crew: 60, payroll: "91%", tier: "green" as const },
  { name: "First Choice Electric", trade: "Commercial Electrical", location: "Orlando, FL", bonding: "$9M", crew: 18, payroll: "74%", tier: "yellow" as const },
  { name: "Summit Concrete LLC", trade: "Concrete / Flatwork", location: "Nashville, TN", bonding: "$5M", crew: 12, payroll: "65%", tier: "yellow" as const },
  { name: "Clearwater Fire Protection", trade: "Fire Suppression", location: "Jacksonville, FL", bonding: "$3M", crew: 8, payroll: "100%", tier: "blue" as const },
  { name: "Atlas Drywall & Framing", trade: "Drywall / Framing", location: "Charlotte, NC", bonding: "$2M", crew: 14, payroll: "55%", tier: "blue" as const },
];

const TIER = {
  green:  { border: "border-green-700/40",  badge: "text-green-400 bg-green-900/20 border-green-800/40",  dot: "bg-green-400",  label: "Prime Match" },
  yellow: { border: "border-yellow-700/40", badge: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40", dot: "bg-yellow-400", label: "Potential" },
  blue:   { border: "border-blue-700/40",   badge: "text-blue-400 bg-blue-900/20 border-blue-800/40",   dot: "bg-blue-400",   label: "Local Force" },
};

export default function SearchPage() {
  const [mode, setMode] = useState<"crews" | "gcs">("crews");

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header + mode tabs */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-4">Search</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("crews")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === "crews" ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
              }`}
            >
              <Building2 className="w-4 h-4" /> Find Crews
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-600/40 text-blue-300">GC</span>
            </button>
            <button
              onClick={() => setMode("gcs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === "gcs" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
              }`}
            >
              <HardHat className="w-4 h-4" /> Find GCs
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-600/40 text-orange-300">Free</span>
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            {mode === "crews"
              ? "Search verified subcontractors and trade pros by project scope. Paid GC feature."
              : "Search for General Contractors in your area. Always free for Trade Pros and Subs."}
          </p>
        </div>

        {/* ── Coming Soon gate — replaces all search functionality ── */}
        <div className="relative">

          {/* Blurred preview of search form */}
          <div className="pointer-events-none select-none blur-[3px] opacity-40" aria-hidden="true">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
              <div className="mb-4">
                <div className="h-3 w-24 bg-slate-600 rounded mb-2" />
                <div className="flex flex-wrap gap-2">
                  {["All Sectors", "Healthcare", "Multifamily", "Federal / Gov't", "Industrial"].map(s => (
                    <div key={s} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-600">{s}</div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-3 text-sm text-slate-500">e.g. $5M or 5000000</div>
                <div className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-3 text-sm text-slate-500">60601</div>
              </div>
              <div className="w-full py-3 bg-blue-700/50 rounded-xl text-center text-white font-bold text-sm">Find Matching Crews</div>
            </div>

            {/* Blurred preview of results */}
            <div className="space-y-4">
              {PREVIEW_RESULTS.slice(0, 3).map((r) => {
                const t = TIER[r.tier];
                return (
                  <div key={r.name} className={`bg-slate-800/50 border ${t.border} rounded-2xl overflow-hidden`}>
                    <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border ${t.badge}`}>
                        <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.label}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="font-black text-white text-base">{r.name}</p>
                          <p className="text-sm text-slate-400">{r.trade}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" /> {r.location}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full border text-green-400 bg-green-900/30 border-green-800/50">Available Now</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                          <p className="text-sm font-black text-white">{r.bonding}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Bonding</p>
                        </div>
                        <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                          <p className="text-sm font-black text-white">{r.crew}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Crew Size</p>
                        </div>
                        <div className="bg-green-950/40 rounded-lg p-2.5 text-center">
                          <p className="text-sm font-black text-green-400">{r.payroll}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Dir. Payroll</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hard overlay gate — sits on top of everything */}
          <div className="absolute inset-0 flex items-start justify-center pt-8 z-20">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
              <div className="w-16 h-16 bg-blue-900/30 border border-blue-800/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>

              <div className="inline-flex items-center gap-1.5 bg-orange-950/60 border border-orange-800/50 text-orange-400 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
                <Clock className="w-3 h-3" /> Coming Soon
              </div>

              <h2 className="text-xl font-black text-white mb-3">
                {mode === "crews" ? "Find Crews" : "Find GCs"} is Coming Soon
              </h2>

              <p className="text-slate-400 text-sm leading-relaxed mb-2">
                {mode === "crews"
                  ? "Full verified crew search — bonding capacity, direct payroll, lead foreman Trade Cards, and match scoring — launches after our waitlist engagement period."
                  : "GC directory search for subs and trade pros launches after our waitlist engagement period."}
              </p>

              <p className="text-slate-500 text-xs mb-6">
                Join the waitlist now to be first in when we open.
              </p>

              <Link
                href="/#waitlist"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors mb-3"
              >
                <Zap className="w-4 h-4" /> Join the Waitlist — Free
              </Link>

              <Link
                href="/feed"
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-colors"
              >
                Go to Live Feed <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-slate-600 text-xs mt-5">
                Already on the list? You'll get an invite email when search goes live.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
