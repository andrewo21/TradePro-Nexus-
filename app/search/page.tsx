"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Building2, MapPin, Users, ShieldCheck, ArrowRight,
  Filter, ChevronDown, HardHat, CheckCircle, Clock, Lock,
  Zap, ChevronRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { SECTORS, TRADE_GROUPS, PROFILE_TYPES, type ProfileType } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchTier = "green" | "yellow" | "blue";
type SearchMode = "crews" | "gcs";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  trade: string;
  location: string;
  bondingCapacity: number | null;
  crewCapacity: number | null;
  directPayrollPct: number;
  galleryCount: number;
  availabilityStatus: "available" | "available_soon" | "booked";
  verificationStatus: string;
  sectorExperience: string[];
  tier: MatchTier;
  leadForeman: { name: string; slug: string; trade: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatM(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

function parseDollar(raw: string): number {
  const clean = raw.replace(/[$,\s]/g, "").toUpperCase();
  if (clean.endsWith("M")) return parseFloat(clean) * 1_000_000;
  if (clean.endsWith("K")) return parseFloat(clean) * 1_000;
  return parseFloat(clean) || 0;
}

function computeTier(r: SearchResult, projectValue: number): MatchTier {
  const bonding = r.bondingCapacity ?? 0;
  const payroll = r.directPayrollPct ?? 0;
  const photos = r.galleryCount ?? 0;
  if (projectValue > 0) {
    if (bonding >= projectValue && payroll >= 70 && photos >= 5) return "green";
    if (bonding >= projectValue * 0.9 || payroll >= 50) return "yellow";
    return "blue";
  }
  if (bonding >= 25_000_000 && payroll >= 70) return "green";
  if (bonding >= 10_000_000 || payroll >= 50) return "yellow";
  return "blue";
}

// ── Result Card ───────────────────────────────────────────────────────────────

function ResultCard({ result, locked }: { result: SearchResult; locked: boolean }) {
  const tierConfig = {
    green: { border: "border-green-700/60", header: "bg-green-950/40", badge: "text-green-400 bg-green-900/30 border-green-800/50", dot: "bg-green-400", label: "Prime", desc: "Full capacity match" },
    yellow: { border: "border-yellow-700/50", header: "bg-yellow-950/30", badge: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50", dot: "bg-yellow-400", label: "Potential", desc: "Growing capacity" },
    blue: { border: "border-blue-700/50", header: "bg-blue-950/30", badge: "text-blue-400 bg-blue-900/30 border-blue-800/50", dot: "bg-blue-400", label: "Local Force", desc: "High local rep" },
  }[result.tier];

  return (
    <div className={`bg-slate-800/50 border ${tierConfig.border} rounded-2xl overflow-hidden ${locked ? "relative" : ""}`}>
      {locked && (
        <div className="absolute inset-0 backdrop-blur-[2px] bg-slate-900/60 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl">
          <Lock className="w-6 h-6 text-slate-400" />
          <p className="text-sm font-bold text-white">GC Subscription Required</p>
          <p className="text-xs text-slate-400 text-center px-6">Find Crews is available to verified GC subscribers.</p>
          <Link href="/#waitlist" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors">
            Join the Waitlist
          </Link>
        </div>
      )}
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
            {result.location && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3" /> {result.location}
              </div>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${
            result.availabilityStatus === "available" ? "text-green-400 bg-green-900/30 border-green-800/50"
            : result.availabilityStatus === "available_soon" ? "text-yellow-400 bg-yellow-900/30 border-yellow-800/50"
            : "text-slate-400 bg-slate-800 border-slate-700"
          }`}>
            {result.availabilityStatus === "available" ? "Available Now"
              : result.availabilityStatus === "available_soon" ? "Avail. Soon"
              : "Booked"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
            <p className="text-sm font-black text-white">{result.bondingCapacity ? formatM(result.bondingCapacity) : "—"}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Bonding</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
            <p className="text-sm font-black text-white">{result.crewCapacity ?? "—"}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Crew Size</p>
          </div>
          <div className={`rounded-lg p-2.5 text-center ${result.directPayrollPct >= 80 ? "bg-green-950/40" : result.directPayrollPct >= 60 ? "bg-yellow-950/30" : "bg-slate-900/60"}`}>
            <p className={`text-sm font-black ${result.directPayrollPct >= 80 ? "text-green-400" : result.directPayrollPct >= 60 ? "text-yellow-400" : "text-slate-400"}`}>
              {result.directPayrollPct}%
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Dir. Payroll</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {result.bondingCapacity && result.bondingCapacity >= 25_000_000 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> High Bonding
            </span>
          )}
          {result.directPayrollPct >= 70 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Direct Payroll &gt;70%
            </span>
          )}
          {result.sectorExperience.slice(0, 2).map(s => (
            <span key={s} className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>

        {result.leadForeman && (
          <Link href={`/pro/${result.leadForeman.slug}`} className="flex items-center justify-between bg-orange-950/20 border border-orange-900/40 hover:border-orange-700/60 rounded-xl p-3 mb-4 transition-colors group">
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
        )}

        <div className="flex gap-2">
          <Link href={`/company/${result.slug}`} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-colors">
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>("crews");
  const [sector, setSector] = useState("All Sectors");
  const [projectValue, setProjectValue] = useState("");
  const [zip, setZip] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("All Trades");
  const [availableNow, setAvailableNow] = useState(false);
  const [showTradeFilter, setShowTradeFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<MatchTier | "all">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGC, setIsGC] = useState<boolean | null>(null);
  const [profileTypeFilter, setProfileTypeFilter] = useState<ProfileType | "all">("all");

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    setActiveTab("all");

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      // Check if user is a GC
      const role = user?.user_metadata?.role;
      setIsGC(role === "gc");

      if (mode === "crews") {
        const db = supabase as any;

        // Profile type filter determines whether to query companies or profiles
        const isProfileTypeSearch = profileTypeFilter !== "all" && profileTypeFilter !== "sub";

        if (isProfileTypeSearch) {
          // Search individual profiles (inspectors, architects, engineers, tradepros)
          let query = db
            .from("profiles")
            .select("id, slug, first_name, last_name, trade, profile_type, firm_name, license_number, location_city, location_state, location_zip, gallery_urls, availability_status, verification_status, years_experience, type_data")
            .eq("verification_status", "verified")
            .eq("profile_type", profileTypeFilter);

          if (availableNow) query = query.eq("availability_status", "available");
          if (zip.trim()) query = query.eq("location_zip", zip.trim());

          query = query.order("availability_status").limit(30);
          const { data: profiles } = await query;

          const pv = parseDollar(projectValue);
          const mapped: SearchResult[] = (profiles ?? []).map((p: any) => {
            const r: SearchResult = {
              id: p.id, name: `${p.first_name} ${p.last_name}`,
              slug: p.slug, trade: p.trade ?? "",
              location: [p.location_city, p.location_state].filter(Boolean).join(", "),
              bondingCapacity: null, crewCapacity: p.years_experience ?? null,
              directPayrollPct: 100, galleryCount: (p.gallery_urls ?? []).length,
              availabilityStatus: p.availability_status ?? "available",
              verificationStatus: p.verification_status,
              sectorExperience: [], tier: "blue", leadForeman: null,
            };
            r.tier = computeTier(r, pv);
            return r;
          });
          setResults(mapped);
          setLoading(false);
          return;
        }

        // Default: search companies (subs/contractors)
        let query = db
          .from("companies")
          .select("id, slug, name, trade_specialties, location_city, location_state, bonding_capacity, crew_capacity, direct_payroll_percentage, gallery_urls, availability_status, verification_status, sector_experience")
          .eq("verification_status", "verified");

        if (sector !== "All Sectors") {
          query = query.contains("sector_experience", [sector]);
        }
        if (selectedTrade !== "All Trades") {
          query = query.contains("trade_specialties", [selectedTrade]);
        }
        if (availableNow) {
          query = query.eq("availability_status", "available");
        }
        if (zip.trim()) {
          query = query.eq("location_zip", zip.trim());
        }

        query = query.order("availability_status").order("bonding_capacity", { ascending: false }).limit(30);

        const { data: companies } = await query;

        if (!companies || companies.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        // Fetch lead foremen for each company
        const companyIds = companies.map((c: any) => c.id);
        const { data: foremen } = await db
          .from("profiles")
          .select("company_id, first_name, last_name, slug, trade")
          .in("company_id", companyIds)
          .eq("is_lead_foreman", true);

        const foremanMap: Record<string, any> = {};
        if (foremen) {
          for (const f of foremen) {
            foremanMap[f.company_id] = f;
          }
        }

        const pv = parseDollar(projectValue);
        const mapped: SearchResult[] = companies.map((c: any) => {
          const r: SearchResult = {
            id: c.id,
            name: c.name,
            slug: c.slug,
            trade: (c.trade_specialties ?? [])[0] ?? "General Contractor",
            location: [c.location_city, c.location_state].filter(Boolean).join(", "),
            bondingCapacity: c.bonding_capacity,
            crewCapacity: c.crew_capacity,
            directPayrollPct: c.direct_payroll_percentage ?? 0,
            galleryCount: (c.gallery_urls ?? []).length,
            availabilityStatus: c.availability_status ?? "available",
            verificationStatus: c.verification_status,
            sectorExperience: c.sector_experience ?? [],
            tier: "blue",
            leadForeman: foremanMap[c.id] ? {
              name: `${foremanMap[c.id].first_name} ${foremanMap[c.id].last_name}`,
              slug: foremanMap[c.id].slug,
              trade: foremanMap[c.id].trade,
            } : null,
          };
          r.tier = computeTier(r, pv);
          return r;
        });

        mapped.sort((a, b) => {
          const tierOrder = { green: 0, yellow: 1, blue: 2 };
          return tierOrder[a.tier] - tierOrder[b.tier];
        });

        setResults(mapped);
      } else {
        // GC search — free, queries verified profiles
        setResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mode, sector, projectValue, zip, selectedTrade, availableNow]);

  const filtered = results.filter(r => activeTab === "all" || r.tier === activeTab);
  const counts = {
    all: results.length,
    green: results.filter(r => r.tier === "green").length,
    yellow: results.filter(r => r.tier === "yellow").length,
    blue: results.filter(r => r.tier === "blue").length,
  };
  const showPaywall = mode === "crews" && isGC === false;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header + mode tabs */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-4">Search</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setMode("crews"); setHasSearched(false); setResults([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === "crews" ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
              }`}
            >
              <Building2 className="w-4 h-4" /> Find Crews
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-600/40 text-blue-300">GC</span>
            </button>
            <button
              onClick={() => { setMode("gcs"); setHasSearched(false); setResults([]); }}
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

        {/* Search form */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6">

          {/* Profile Type Filter — Phase 10 */}
          {mode === "crews" && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Profile Type</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setProfileTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${profileTypeFilter === "all" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-blue-600/50"}`}>
                  All Types
                </button>
                {(Object.entries(PROFILE_TYPES) as [ProfileType, typeof PROFILE_TYPES["tradepro"]][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setProfileTypeFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${profileTypeFilter === key ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-blue-600/50"}`}>
                    {cfg.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sectors — clickable pills */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Project Sector</label>
            <div className="flex flex-wrap gap-2">
              {["All Sectors", ...SECTORS].map((s) => (
                <button
                  key={s}
                  onClick={() => setSector(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sector === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-blue-600/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Value + ZIP */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Project Value</label>
              <input
                value={projectValue}
                onChange={(e) => setProjectValue(e.target.value)}
                placeholder="e.g. $5M or 5000000"
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

          {/* Trade filter toggle */}
          <button
            onClick={() => setShowTradeFilter(!showTradeFilter)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 mb-3 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            {showTradeFilter ? "Hide" : "Filter by"} Trade
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTradeFilter ? "rotate-180" : ""}`} />
          </button>

          {showTradeFilter && (
            <div className="mb-4 space-y-3">
              <button
                onClick={() => setSelectedTrade("All Trades")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedTrade === "All Trades" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-blue-600/50"
                }`}
              >
                All Trades
              </button>
              {TRADE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.trades.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTrade(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedTrade === t ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-blue-600/50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Available Now toggle */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setAvailableNow(!availableNow)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                availableNow
                  ? "bg-green-900/40 border-green-700 text-green-400"
                  : "bg-slate-900 border-slate-600 text-slate-400 hover:border-green-700/50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableNow ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
              Available Now Only
            </button>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching…</span>
            ) : (
              <><Search className="w-4 h-4" /> {mode === "crews" ? "Find Matching Crews" : "Find GCs Near Me"}</>
            )}
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {hasSearched && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

              {/* GC-only paywall notice */}
              {showPaywall && (
                <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-5 mb-5 flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white mb-1">Find Crews is a GC subscription feature</p>
                    <p className="text-sm text-slate-400 mb-3">
                      Full access to verified crew search — bonding capacity, payroll type, and lead foreman Trade Cards — requires a GC account.
                    </p>
                    <Link href="/#waitlist" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors">
                      Join the GC Waitlist <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Find GCs mode — empty state */}
              {mode === "gcs" && (
                <div className="text-center py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                  <HardHat className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold mb-1">GC profiles coming soon</p>
                  <p className="text-slate-600 text-sm">
                    GCs are joining the platform now. Sub→GC search goes live at launch.
                  </p>
                </div>
              )}

              {/* Crew results */}
              {mode === "crews" && results.length > 0 && (
                <>
                  {/* Tier tabs */}
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                    {[
                      { key: "all", label: `All (${counts.all})`, color: "text-slate-300" },
                      { key: "green", label: `Prime (${counts.green})`, color: "text-green-400" },
                      { key: "yellow", label: `Potential (${counts.yellow})`, color: "text-yellow-400" },
                      { key: "blue", label: `Local Force (${counts.blue})`, color: "text-blue-400" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                          activeTab === tab.key ? "bg-slate-700 text-white" : `bg-slate-800/50 ${tab.color} border border-slate-700/50 hover:border-slate-600`
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{filtered.length} results · Sorted by match score</span>
                    <span className="flex items-center gap-1 text-green-400"><HardHat className="w-3.5 h-3.5" /> Available Now first</span>
                  </div>

                  <div className="space-y-4">
                    {filtered.map((result, i) => (
                      <motion.div key={result.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
                        <ResultCard result={result} locked={showPaywall} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              {/* No results */}
              {mode === "crews" && results.length === 0 && (
                <div className="text-center py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                  <Search className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold mb-1">No verified crews match yet</p>
                  <p className="text-slate-600 text-sm mb-4">
                    The platform is filling up. New verified crews are being added daily.
                  </p>
                  <Link href="/build" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors">
                    <HardHat className="w-4 h-4" /> Are you a sub? Build your Trade Card
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state pre-search */}
        {!hasSearched && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {mode === "crews"
                ? "Select a sector and hit search to find verified crews."
                : "Hit search to find GCs in your area."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
