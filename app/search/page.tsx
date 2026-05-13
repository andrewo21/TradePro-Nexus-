"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Building2, MapPin, Users, ShieldCheck, ArrowRight,
  Filter, ChevronDown, HardHat, CheckCircle, Clock, Zap
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

type MatchTier = "green" | "yellow" | "blue";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  trade: string;
  location: string;
  bondingCapacity: number;
  crewCapacity: number;
  directPayrollPct: number;
  sectorPhotos: number;
  availabilityStatus: "available" | "available_soon" | "booked";
  verificationStatus: "verified" | "pending";
  sectorMatch: boolean;
  tier: MatchTier;
  yearsInBusiness: number;
  leadForeman: { name: string; slug: string; trade: string };
  bondingCompany: string;
}

// ── Mock Results ───────────────────────────────────────────────────────────────

const MOCK_RESULTS: SearchResult[] = [
  {
    id: "1",
    name: "Midwest Electrical Solutions",
    slug: "midwest-electrical-solutions",
    trade: "Commercial Electrical",
    location: "Chicago, IL",
    bondingCapacity: 35_000_000,
    crewCapacity: 85,
    directPayrollPct: 100,
    sectorPhotos: 12,
    availabilityStatus: "available",
    verificationStatus: "verified",
    sectorMatch: true,
    tier: "green",
    yearsInBusiness: 25,
    leadForeman: { name: "Marcus Thompson", slug: "marcus-thompson", trade: "Commercial Electrician" },
    bondingCompany: "Travelers Surety",
  },
  {
    id: "2",
    name: "Delta Mechanical Inc.",
    slug: "delta-mechanical",
    trade: "HVAC / Plumbing",
    location: "Houston, TX",
    bondingCapacity: 32_000_000,
    crewCapacity: 60,
    directPayrollPct: 85,
    sectorPhotos: 8,
    availabilityStatus: "available",
    verificationStatus: "verified",
    sectorMatch: true,
    tier: "green",
    yearsInBusiness: 18,
    leadForeman: { name: "Ray Vega", slug: "ray-vega", trade: "Mechanical Foreman" },
    bondingCompany: "Liberty Mutual Surety",
  },
  {
    id: "3",
    name: "Pacific Fire Protection LLC",
    slug: "pacific-fire",
    trade: "Fire Suppression",
    location: "Los Angeles, CA",
    bondingCapacity: 28_000_000,
    crewCapacity: 45,
    directPayrollPct: 75,
    sectorPhotos: 6,
    availabilityStatus: "available_soon",
    verificationStatus: "verified",
    sectorMatch: true,
    tier: "yellow",
    yearsInBusiness: 12,
    leadForeman: { name: "Ana Torres", slug: "ana-torres", trade: "Fire Protection Lead" },
    bondingCompany: "Zurich Insurance",
  },
  {
    id: "4",
    name: "Metro Concrete & Masonry",
    slug: "metro-concrete",
    trade: "Concrete / Masonry",
    location: "Newark, NJ",
    bondingCapacity: 22_000_000,
    crewCapacity: 55,
    directPayrollPct: 60,
    sectorPhotos: 9,
    availabilityStatus: "available",
    verificationStatus: "verified",
    sectorMatch: false,
    tier: "yellow",
    yearsInBusiness: 20,
    leadForeman: { name: "Jerome King", slug: "jerome-king", trade: "Concrete Superintendent" },
    bondingCompany: "Nationwide Surety",
  },
  {
    id: "5",
    name: "Southside Ironworks",
    slug: "southside-ironworks",
    trade: "Structural Steel / Ironwork",
    location: "Chicago, IL",
    bondingCapacity: 12_000_000,
    crewCapacity: 30,
    directPayrollPct: 40,
    sectorPhotos: 15,
    availabilityStatus: "available",
    verificationStatus: "verified",
    sectorMatch: true,
    tier: "blue",
    yearsInBusiness: 8,
    leadForeman: { name: "Tony Salazar", slug: "tony-salazar", trade: "Ironworker Foreman" },
    bondingCompany: "Cincinnati Insurance",
  },
];

const SECTORS = [
  "Senior Living", "Healthcare", "Federal / Gov't", "Multifamily",
  "Industrial", "K-12 Education", "Mixed-Use", "Data Centers", "Hospitality",
];

const TRADES_LIST = [
  "All Trades", "Electrical", "HVAC / Plumbing", "Structural Steel",
  "Concrete / Masonry", "Fire Suppression", "Carpentry", "Roofing",
];

function formatM(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

// ── Tier Card ──────────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SearchResult }) {
  const tierConfig = {
    green: {
      border: "border-green-700/60",
      header: "bg-green-950/40",
      badge: "text-green-400 bg-green-900/30 border-green-800/50",
      dot: "bg-green-400",
      label: "Prime",
      desc: "Full capacity match",
    },
    yellow: {
      border: "border-yellow-700/50",
      header: "bg-yellow-950/30",
      badge: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
      dot: "bg-yellow-400",
      label: "Potential",
      desc: "Growing capacity",
    },
    blue: {
      border: "border-blue-700/50",
      header: "bg-blue-950/30",
      badge: "text-blue-400 bg-blue-900/30 border-blue-800/50",
      dot: "bg-blue-400",
      label: "Local Force",
      desc: "High local rep",
    },
  }[result.tier];

  return (
    <div className={`bg-slate-800/50 border ${tierConfig.border} rounded-2xl overflow-hidden`}>
      {/* Tier header */}
      <div className={`${tierConfig.header} px-4 py-2 flex items-center justify-between border-b border-slate-700/50`}>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full border ${tierConfig.badge}`}>
          <span className={`w-2 h-2 rounded-full ${tierConfig.dot}`} />
          {tierConfig.label} — {tierConfig.desc}
        </span>
        {result.verificationStatus === "verified" && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-white text-base">{result.name}</h3>
            <p className="text-sm text-slate-400">{result.trade}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" /> {result.location}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${
            result.availabilityStatus === "available"
              ? "text-green-400 bg-green-900/30 border-green-800/50"
              : result.availabilityStatus === "available_soon"
              ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
              : "text-slate-400 bg-slate-800 border-slate-700"
          }`}>
            {result.availabilityStatus === "available" ? "Available Now"
              : result.availabilityStatus === "available_soon" ? "Avail. Soon"
              : "Booked"}
          </span>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
            <p className="text-sm font-black text-white">{formatM(result.bondingCapacity)}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Bonding</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
            <p className="text-sm font-black text-white">{result.crewCapacity}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Crew Size</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center ${
            result.directPayrollPct >= 80 ? "bg-green-950/40" : result.directPayrollPct >= 60 ? "bg-yellow-950/30" : "bg-slate-900/60"
          }`}>
            <p className={`text-sm font-black ${
              result.directPayrollPct >= 80 ? "text-green-400" : result.directPayrollPct >= 60 ? "text-yellow-400" : "text-slate-400"
            }`}>{result.directPayrollPct}%</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Dir. Payroll</p>
          </div>
        </div>

        {/* Match logic indicators */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {result.bondingCapacity >= 30_000_000 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Bond ≥ Project
            </span>
          )}
          {result.directPayrollPct >= 70 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Direct Payroll {">"}70%
            </span>
          )}
          {result.sectorPhotos >= 5 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> {result.sectorPhotos} Sector Photos
            </span>
          )}
          {result.sectorMatch && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Sector Match
            </span>
          )}
        </div>

        {/* Lead Foreman — the differentiator */}
        <Link
          href={`/pro/${result.leadForeman.slug}`}
          className="flex items-center justify-between bg-orange-950/20 border border-orange-900/40 hover:border-orange-700/60 rounded-xl p-3 mb-4 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-600/20 border border-orange-600/40 rounded-lg flex items-center justify-center font-black text-orange-400 text-xs">
              {result.leadForeman.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Lead Foreman</p>
              <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">{result.leadForeman.name}</p>
              <p className="text-xs text-slate-400">{result.leadForeman.trade}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
        </Link>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/company/${result.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Building2 className="w-4 h-4" /> View Profile
          </Link>
          <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors">
            <Zap className="w-4 h-4" /> Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [sector, setSector] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [zip, setZip] = useState("");
  const [trade, setTrade] = useState("All Trades");
  const [activeTab, setActiveTab] = useState<MatchTier | "all">("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  function handleSearch() {
    setHasSearched(true);
  }

  const filtered = MOCK_RESULTS.filter((r) =>
    activeTab === "all" ? true : r.tier === activeTab
  );

  const counts = {
    all: MOCK_RESULTS.length,
    green: MOCK_RESULTS.filter(r => r.tier === "green").length,
    yellow: MOCK_RESULTS.filter(r => r.tier === "yellow").length,
    blue: MOCK_RESULTS.filter(r => r.tier === "blue").length,
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">GC / Sub Search</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Find Verified Crews</h1>
          <p className="text-slate-400 text-sm mt-1">Search by project scope. See bonding, payroll type, and the lead foreman's Trade Card.</p>
        </div>

        {/* Search Form */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Project Sector</label>
              <div className="relative">
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-3 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 pr-8"
                >
                  <option value="">Select sector…</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Project Value</label>
              <input
                value={projectValue}
                onChange={(e) => setProjectValue(e.target.value)}
                placeholder="e.g. $39M or 39000000"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">ZIP Code</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="60601"
                maxLength={5}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 mb-3 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            {showFilters ? "Hide" : "Show"} filters
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {showFilters && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Trade</label>
              <div className="flex flex-wrap gap-2">
                {TRADES_LIST.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrade(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      trade === t ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors"
          >
            <Search className="w-4 h-4" /> Find Matching Crews
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Tier tabs */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {[
                  { key: "all", label: `All Results (${counts.all})`, color: "text-slate-300" },
                  { key: "green", label: `Prime (${counts.green})`, color: "text-green-400" },
                  { key: "yellow", label: `Potential (${counts.yellow})`, color: "text-yellow-400" },
                  { key: "blue", label: `Local Force (${counts.blue})`, color: "text-blue-400" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? "bg-slate-700 text-white"
                        : `bg-slate-800/50 ${tab.color} border border-slate-700/50 hover:border-slate-600`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Result count + sort info */}
              <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {filtered.length} results · Sorted by match score
                </span>
                <span className="flex items-center gap-1 text-green-400">
                  <HardHat className="w-3.5 h-3.5" /> Available Now first
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-4">
                {filtered.map((result, i) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.07 }}
                  >
                    <ResultCard result={result} />
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-xs text-slate-600 mt-8">
                Match scores based on verified bonding capacity, payroll type, and sector photo count.
                <Link href="/build" className="text-slate-500 hover:text-slate-400 ml-1 underline">
                  Are you a sub? Build your Trade Card.
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!hasSearched && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Enter your project details above to find verified crews.</p>
            <p className="text-slate-600 text-xs mt-1">Results are color-coded by bonding capacity, payroll type, and sector experience.</p>
          </div>
        )}
      </div>
    </div>
  );
}
