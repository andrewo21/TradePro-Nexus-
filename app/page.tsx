"use client";

import Link from "next/link";
import { Suspense } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Search, Zap, HardHat, Building2, CheckCircle,
  Star, MapPin, Clock, ArrowRight, Camera, Wrench, Hammer,
  Bolt, Flame, Wind, ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import WaitlistForm from "@/components/WaitlistForm";

// ── Mock Feed Data ─────────────────────────────────────────────────────────────

const FEED_ITEMS = [
  {
    name: "Marcus T.",
    trade: "Commercial Electrician",
    location: "Chicago, IL",
    project: "39-Story Mixed-Use Tower — Phase 2 Roughin Complete",
    verified: true,
    time: "2h ago",
    color: "orange",
  },
  {
    name: "Delta Mechanical Inc.",
    trade: "HVAC / Plumbing",
    location: "Houston, TX",
    project: "Senior Living Facility — HVAC Ductwork Install, 84,000 SF",
    verified: true,
    time: "4h ago",
    color: "blue",
  },
  {
    name: "Ray V.",
    trade: "Ironworker / Structural Steel",
    location: "Newark, NJ",
    project: "Federal Courthouse Structural Steel — Topped Out",
    verified: true,
    time: "6h ago",
    color: "orange",
  },
  {
    name: "Pacific Fire Protection LLC",
    trade: "Fire Suppression",
    location: "Los Angeles, CA",
    project: "245-Unit Apartment Complex — Sprinkler System Complete",
    verified: true,
    time: "8h ago",
    color: "blue",
  },
  {
    name: "Jerome K.",
    trade: "Superintendent",
    location: "Atlanta, GA",
    project: "Hospital Renovation — TI Complete, Punch List Underway",
    verified: true,
    time: "12h ago",
    color: "orange",
  },
];

const STATS = [
  { value: "$2.4B+", label: "Bonding Capacity Tracked" },
  { value: "4,800+", label: "Verified Trade Pros" },
  { value: "340+", label: "GCs & Developers" },
  { value: "3 sec", label: "Avg. Match Time" },
];

const TRADES = [
  { icon: Bolt, label: "Electrical" },
  { icon: Flame, label: "Plumbing" },
  { icon: Wind, label: "HVAC" },
  { icon: Hammer, label: "Carpentry" },
  { icon: Wrench, label: "Mechanical" },
  { icon: HardHat, label: "Civil / Site" },
];

const SECTORS = [
  "Senior Living",
  "Healthcare",
  "Federal / Gov't",
  "Multifamily",
  "Industrial",
  "K-12 Education",
  "Mixed-Use",
  "Data Centers",
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 overflow-hidden">

        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(234,88,12,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(234,88,12,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-[#0f172a]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12 md:pt-28 md:pb-20">

          {/* Enterprise badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-950/60 border border-orange-800/50 text-orange-400 text-xs font-semibold rounded-full tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              TradePro Enterprises — Verified Marketplace
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-center max-w-4xl mx-auto mb-6"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-4">
              <span className="text-white">The Command Center for</span>
              <br />
              <span className="text-orange-500">Construction Hiring.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Verified bonding. Verified payroll. Verified talent. Connect the right crews
              to the right projects — in seconds, not weeks.
            </p>
          </motion.div>

          {/* Waitlist form — primary CTA */}
          <motion.div
            id="waitlist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="max-w-md mx-auto mb-6"
          >
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <Suspense fallback={null}>
                <WaitlistForm />
              </Suspense>
            </div>
          </motion.div>

          {/* Secondary links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex items-center justify-center gap-4 text-xs text-slate-500 mb-10"
          >
            <Link href="/build" className="hover:text-orange-400 transition-colors flex items-center gap-1">
              <HardHat className="w-3.5 h-3.5" /> Build Trade Card
            </Link>
            <span>·</span>
            <Link href="/search" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Find Crews
            </Link>
            <span>·</span>
            <Link href="/feed" className="hover:text-slate-300 transition-colors">
              Live Feed
            </Link>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center bg-slate-800/50 border border-slate-700/50 rounded-lg py-3 px-2">
                <p className="text-2xl font-black text-orange-400">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── LIVE FEED ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-green-400">Live Feed</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Work is Currency.</h2>
              <p className="text-slate-400 text-sm mt-1">Real progress from Verified Pros — updated continuously.</p>
            </div>
            <Link
              href="/feed"
              className="hidden sm:flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {FEED_ITEMS.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors"
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    item.color === "orange"
                      ? "bg-orange-600/20 text-orange-400 border border-orange-800/50"
                      : "bg-blue-600/20 text-blue-400 border border-blue-800/50"
                  }`}
                >
                  {item.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-bold text-white text-sm">{item.name}</span>
                    {item.verified && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> VERIFIED
                      </span>
                    )}
                    <span className="text-xs text-orange-400 font-medium">{item.trade}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-snug">{item.project}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                    <span className="flex items-center gap-1"><Camera className="w-3 h-3" />Photos attached</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Link
            href="/feed"
            className="mt-5 flex sm:hidden items-center justify-center gap-1 text-orange-400 text-sm font-semibold"
          >
            View All Feed Posts <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Two sides. One platform.</h2>
            <p className="text-slate-400">Built for the full construction supply chain.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">

            {/* Trade Pro Side */}
            <div className="bg-gradient-to-br from-orange-950/40 to-slate-900 border border-orange-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <HardHat className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-bold text-white">For Trade Pros</h3>
              </div>
              <div className="space-y-3">
                {[
                  "Build a Digital Trade Card — your public capability statement",
                  "Upload OSHA certs, bonding proof, COI, and W9 for instant AI verification",
                  "Set your availability, crew size, and project capacity",
                  "Get a shareable URL: nexus.com/pro/your-name",
                  "Show up in GC searches for your trade and region",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/build"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Build My Trade Card <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* GC Side */}
            <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-white">For GCs &amp; Subs</h3>
              </div>
              <div className="space-y-3">
                {[
                  "Search by project sector, value, and zip code",
                  "See Green / Yellow / Blue match scores based on bonding and payroll",
                  "View the lead foreman's Trade Card — see the actual talent, not just the company",
                  "Filter by 'Available Now' to find crews ready to mobilize",
                  "Access verified COIs, bonding certs, and W9s before you make the call",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/search"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Search Verified Crews <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRADE CATEGORIES ────────────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-6 text-center">All Major Trades. Every Sector.</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
            {TRADES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl py-4 px-2 hover:border-orange-800/50 hover:bg-orange-950/20 transition-colors cursor-pointer">
                <Icon className="w-6 h-6 text-orange-400" />
                <span className="text-xs font-semibold text-slate-300">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SECTORS.map((s) => (
              <span key={s} className="px-3 py-1.5 bg-blue-950/50 border border-blue-800/40 text-blue-300 text-xs font-semibold rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MATCH ENGINE PREVIEW ────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">The Match Engine</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Three tiers. Instant clarity. Know exactly which subs can execute your project
              before you pick up the phone.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="font-bold text-green-400 uppercase text-xs tracking-widest">Prime</span>
              </div>
              <p className="text-white font-semibold mb-2">Full Capacity Match</p>
              <p className="text-slate-400 text-sm">Bonding ≥ project value. Direct payroll &gt; 70%. 5+ sector-specific project photos. Ready to execute.</p>
            </div>
            <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-yellow-400 rounded-full" />
                <span className="font-bold text-yellow-400 uppercase text-xs tracking-widest">Potential</span>
              </div>
              <p className="text-white font-semibold mb-2">Growing Capacity</p>
              <p className="text-slate-400 text-sm">High skill, bonding within ±10% of project value. Strong work record, may need bonding increase to close.</p>
            </div>
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-blue-400 rounded-full" />
                <span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Local Force</span>
              </div>
              <p className="text-white font-semibold mb-2">High Local Reputation</p>
              <p className="text-slate-400 text-sm">Strong local notoriety, proven work portfolio. Uses mixed or 1099 workforce. Best for local scopes.</p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-orange-900/30"
            >
              <Search className="w-4 h-4" /> Run a Match Search
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRUST SECTION ───────────────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Verification You Can Count On</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck, label: "AI-Verified Bonding", desc: "Bonding certs read and verified automatically" },
              { icon: CheckCircle, label: "COI & Insurance", desc: "Current certificates with expiration tracking" },
              { icon: Zap, label: "W9 on File", desc: "Tax compliance verified before first call" },
              { icon: Star, label: "OSHA Certifications", desc: "Safety credentials confirmed and displayed" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <Icon className="w-7 h-7 text-orange-400 mx-auto mb-2" />
                <p className="text-white font-semibold text-sm mb-1">{label}</p>
                <p className="text-slate-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 border-t border-slate-800" id="waitlist-bottom">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Your work speaks for itself.<br />
            <span className="text-orange-500">Now let the right people hear it.</span>
          </h2>
          <p className="text-slate-400 mb-8">
            We&apos;re launching soon. Get your spot now — free forever.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <Suspense fallback={null}>
              <WaitlistForm />
            </Suspense>
          </div>
          <p className="text-xs text-slate-600 mt-5">
            A TradePro Enterprises product. Also from us:{" "}
            <a href="https://tradeprotech.ai" className="text-slate-500 hover:text-slate-400 underline">TradePro Resume Builder</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 sm:px-6 text-center">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} TradePro Enterprises. All rights reserved.
          {" "}· <Link href="/feed" className="hover:text-slate-400 transition-colors">Live Feed</Link>
          {" "}· <Link href="/search" className="hover:text-slate-400 transition-colors">Find Crews</Link>
          {" "}· <Link href="/build" className="hover:text-slate-400 transition-colors">Build Trade Card</Link>
        </p>
      </footer>
    </div>
  );
}
