"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Building2, MapPin, Users, Shield, HardHat,
  X, Loader2, ChevronRight, Zap, Clock, Filter,
  CheckCircle, ChevronDown
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Filter constants ──────────────────────────────────────────────────────────

const TRADES = [
  "Electrical", "Plumbing", "HVAC", "Carpentry", "Structural Steel",
  "Mechanical", "Roofing", "Concrete", "Masonry", "Drywall",
  "Painting", "Fire Suppression", "Civil", "Demolition", "Welding", "Other",
];

const SECTORS = [
  "Commercial", "Residential", "Industrial", "Government",
  "Healthcare", "Education", "Hospitality", "Mixed Use",
];

// Only states with data in the directory
const DIRECTORY_STATES = [
  { label: "Florida", abbr: "FL" },
  { label: "California", abbr: "CA" },
  { label: "Washington", abbr: "WA" },
  { label: "Nevada", abbr: "NV" },
  { label: "Texas", abbr: "TX" },
  { label: "Ohio", abbr: "OH" },
  { label: "Georgia", abbr: "GA" },
  { label: "Tennessee", abbr: "TN" },
  { label: "New York", abbr: "NY" },
  { label: "Pennsylvania", abbr: "PA" },
  { label: "Illinois", abbr: "IL" },
  { label: "Arizona", abbr: "AZ" },
];

const SORT_OPTIONS = [
  { value: "recent",    label: "Most Recently Added" },
  { value: "available", label: "Available Now First" },
  { value: "union",     label: "Union Members First" },
  { value: "verified",  label: "Verified First" },
];

const FIRM_SIZE_OPTIONS = [
  { value: "any",   label: "Any Size" },
  { value: "1-25",  label: "1–25" },
  { value: "25-50", label: "25–50" },
  { value: "50+",   label: "50+" },
];

const UNION_OPTIONS = [
  { value: "both",      label: "Both" },
  { value: "union",     label: "Union Only" },
  { value: "non-union", label: "Non-Union" },
];

const VERIFIED_OPTIONS = [
  { value: "both",        label: "Both" },
  { value: "verified",    label: "Verified Only" },
  { value: "not-verified", label: "Not Verified" },
];

// ── Types ────────────────────────────────────────────────────────────────────

type SearchResult = {
  source: "profile" | "unclaimed";
  // Profile fields
  slug?: string;
  first_name?: string;
  last_name?: string;
  firm_name?: string;
  trade?: string;
  location_city?: string;
  location_state?: string;
  availability_status?: string;
  union_member?: boolean;
  union_name?: string;
  union_local_number?: string;
  crew_size?: number;
  years_experience?: number;
  verification_status?: string;
  avatar_url?: string;
  // Unclaimed fields
  id?: string;
  business_name?: string;
  license_type?: string;
  city?: string;
  source_state?: string;
  claim_token?: string;
  phone?: string;
  quality_score?: number;
};

type Mode = "crews" | "union" | "gcs";

const BANNER_KEY = "fc_banner_dismissed";

// ── Default filter state ──────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  q:        "",
  trade:    "",
  sector:   "",
  state:    "",
  county:   "",
  union:    "both",
  verified: "both",
  firmSize: "any",
  sort:     "recent",
  local:    "",
};
type Filters = typeof DEFAULT_FILTERS;

function isFiltersDefault(f: Filters) {
  return (
    f.q === ""        && f.trade === ""   && f.sector === ""  &&
    f.state === ""    && f.county === ""  && f.union === "both" &&
    f.verified === "both" && f.firmSize === "any" &&
    f.sort === "recent" && f.local === ""
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [mode, setMode] = useState<Mode>("crews");
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [totalUnclaimed, setTotalUnclaimed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = !isFiltersDefault(filters);

  useEffect(() => {
    setBannerDismissed(localStorage.getItem(BANNER_KEY) === "1");
  }, []);

  const set = (key: keyof Filters, value: string) =>
    setFilters(f => ({ ...f, [key]: value }));

  function clearAll() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, "1");
    setBannerDismissed(true);
  }

  const fetchResults = useCallback(async (p: number, f: Filters, m: Mode) => {
    if (m === "gcs") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (f.trade)   params.set("trade",    f.trade);
      if (f.sector)  params.set("sector",   f.sector);
      if (f.state)   params.set("state",    f.state);
      if (f.county)  params.set("county",   f.county);
      if (f.local)   params.set("local",    f.local);
      if (f.q)       params.set("q",        f.q);
      if (f.sort)    params.set("sort",     f.sort);
      params.set("union",    m === "union" ? "union" : f.union);
      params.set("verified", f.verified);
      params.set("firmSize", f.firmSize);

      const res = await fetch(`/api/search/crews?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setTotalProfiles(data.totalProfiles ?? 0);
      setTotalUnclaimed(data.totalUnclaimed ?? 0);
      setPage(data.page ?? 1);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Immediate refetch on filter changes (debounced for text fields)
  useEffect(() => {
    if (mode === "gcs") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = (filters.q || filters.county || filters.local) ? 350 : 0;
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchResults(1, filters, mode);
    }, delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters, mode, fetchResults]);

  function switchMode(m: Mode) {
    setMode(m);
    setResults([]);
    setTotal(null);
    setPage(1);
  }

  // ── Result card helpers ────────────────────────────────────────────────────

  function displayName(r: SearchResult) {
    if (r.source === "unclaimed") return r.business_name ?? "Unlisted Business";
    return r.firm_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || "Trade Pro";
  }

  function displayTrade(r: SearchResult) {
    if (r.source === "profile") return r.trade ?? "";
    // Shorten verbose license type strings
    const lt = r.license_type ?? "";
    if (lt.length > 34) return lt.slice(0, 34) + "…";
    return lt;
  }

  function displayLocation(r: SearchResult) {
    if (r.source === "profile") {
      return [r.location_city, r.location_state].filter(Boolean).join(", ");
    }
    return [r.city, r.source_state].filter(Boolean).join(", ");
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        {/* Launch banner */}
        {!bannerDismissed && (
          <div className="relative mb-6 bg-orange-950/60 border border-orange-700/60 rounded-2xl px-5 py-4 flex items-start gap-4">
            <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-orange-200 text-sm font-semibold leading-relaxed">
                <span className="text-orange-400 font-black">Free during our launch period.</span>{" "}
                Find Crews is open to everyone right now. This becomes a paid GC feature soon —{" "}
                <Link href="/signup" className="underline text-orange-300 hover:text-white transition-colors">
                  create a free account
                </Link>{" "}
                to lock in your access.
              </p>
            </div>
            <button onClick={dismissBanner} className="text-orange-500 hover:text-white transition-colors flex-shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header + tabs */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-4">Contractor Directory</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => switchMode("crews")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "crews" ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"}`}>
              <Building2 className="w-4 h-4" /> Find Crews
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-600/40 text-orange-300">Free Now</span>
            </button>
            <button onClick={() => switchMode("union")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "union" ? "bg-blue-800 text-white border border-blue-600" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-blue-700"}`}>
              <Shield className="w-4 h-4" /> Union Directory
            </button>
            <button onClick={() => switchMode("gcs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${mode === "gcs" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"}`}>
              <HardHat className="w-4 h-4" /> Find GCs
            </button>
          </div>
        </div>

        {/* ── GCs tab ── */}
        {mode === "gcs" && (
          <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-2xl">
            <Clock className="w-10 h-10 text-orange-400 mx-auto mb-3" />
            <p className="text-white font-black text-lg mb-2">GC Directory — Coming Soon</p>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              GC profiles are being verified now. Always free for trade pros.
            </p>
            <Link href="/#waitlist"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
              <Zap className="w-4 h-4" /> Get Notified
            </Link>
          </div>
        )}

        {/* ── Find Crews + Union Directory ── */}
        {mode !== "gcs" && (
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── FILTER PANEL ── */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden sticky top-24">

                {/* Filter header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                  <button
                    onClick={() => setFiltersOpen(v => !v)}
                    className="flex items-center gap-2 text-sm font-bold text-white"
                  >
                    <Filter className="w-3.5 h-3.5 text-orange-400" />
                    Filters
                    {isDirty && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isDirty && (
                    <button onClick={clearAll}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-400 transition-colors font-semibold">
                      <X className="w-3 h-3" /> Clear All
                    </button>
                  )}
                </div>

                {filtersOpen && (
                  <div className="p-4 space-y-5">

                    {/* Keyword search */}
                    <div>
                      <label className="filter-label">Keyword</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          value={filters.q}
                          onChange={e => set("q", e.target.value)}
                          placeholder="Name, company, trade…"
                          className="filter-input pl-8"
                        />
                      </div>
                    </div>

                    {/* Trade */}
                    <div>
                      <label className="filter-label">Trade</label>
                      <select value={filters.trade} onChange={e => set("trade", e.target.value)} className="filter-input">
                        <option value="">All Trades</option>
                        {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="filter-label">Sector</label>
                      <select value={filters.sector} onChange={e => set("sector", e.target.value)} className="filter-input">
                        <option value="">All Sectors</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* State */}
                    <div>
                      <label className="filter-label">State</label>
                      <select value={filters.state} onChange={e => set("state", e.target.value)} className="filter-input">
                        <option value="">All States</option>
                        {DIRECTORY_STATES.map(s => (
                          <option key={s.abbr} value={s.label}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* City / ZIP */}
                    <div>
                      <label className="filter-label">City or ZIP</label>
                      <input
                        value={filters.county}
                        onChange={e => set("county", e.target.value)}
                        placeholder="e.g. Fort Myers, 33901"
                        className="filter-input"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">
                        {/^\d{5}$/.test(filters.county.trim())
                          ? "ZIP search applies to member profiles — registry listings will show by state only"
                          : "City name searches both member profiles and registry listings"}
                      </p>
                    </div>

                    {/* Union status */}
                    {mode === "crews" && (
                      <div>
                        <label className="filter-label">Union Status</label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-600">
                          {UNION_OPTIONS.map(opt => (
                            <button key={opt.value}
                              onClick={() => set("union", opt.value)}
                              className={`flex-1 py-1.5 text-[11px] font-bold transition-colors ${filters.union === opt.value ? "bg-blue-700 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Union local (union directory mode only) */}
                    {mode === "union" && (
                      <div>
                        <label className="filter-label">Local Number</label>
                        <input
                          value={filters.local}
                          onChange={e => set("local", e.target.value)}
                          placeholder='e.g. "349" or "IBEW 349"'
                          className="filter-input"
                        />
                      </div>
                    )}

                    {/* Verified status */}
                    <div>
                      <label className="filter-label">
                        Verified Status
                        <span className="ml-1 text-[9px] text-slate-500 font-normal">(coming soon)</span>
                      </label>
                      <div className="flex rounded-xl overflow-hidden border border-slate-600">
                        {VERIFIED_OPTIONS.map(opt => (
                          <button key={opt.value}
                            onClick={() => set("verified", opt.value)}
                            className={`flex-1 py-1.5 text-[11px] font-bold transition-colors ${filters.verified === opt.value ? "bg-green-700 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Firm size */}
                    <div>
                      <label className="filter-label">Firm Size <span className="font-normal text-slate-500">(crew)</span></label>
                      <div className="grid grid-cols-4 rounded-xl overflow-hidden border border-slate-600">
                        {FIRM_SIZE_OPTIONS.map(opt => (
                          <button key={opt.value}
                            onClick={() => set("firmSize", opt.value)}
                            className={`py-1.5 text-[11px] font-bold transition-colors ${filters.firmSize === opt.value ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="filter-label">Sort By</label>
                      <select value={filters.sort} onChange={e => set("sort", e.target.value)} className="filter-input">
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* ── RESULTS PANE ── */}
            <div className="flex-1 min-w-0">

              {/* Result count bar */}
              <div className="flex items-center justify-between mb-4 min-h-[24px]">
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                  </div>
                ) : total !== null ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-white font-black text-lg">
                      {total.toLocaleString()}
                      <span className="text-slate-400 font-normal text-sm ml-1.5">
                        contractor{total !== 1 ? "s" : ""}
                      </span>
                    </p>
                    {(totalProfiles > 0 || totalUnclaimed > 0) && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {totalProfiles > 0 && <span>{totalProfiles.toLocaleString()} claimed</span>}
                        {totalProfiles > 0 && totalUnclaimed > 0 && <span>·</span>}
                        {totalUnclaimed > 0 && <span>{totalUnclaimed.toLocaleString()} registry listings</span>}
                      </div>
                    )}
                  </div>
                ) : null}
                {isDirty && !loading && (
                  <button onClick={clearAll}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors font-semibold">
                    <X className="w-3 h-3" /> Clear filters
                  </button>
                )}
              </div>

              {/* Empty state */}
              {!loading && total === 0 && (
                <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-2xl">
                  <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold mb-1">No contractors match your filters</p>
                  <p className="text-slate-500 text-sm mb-4">Try a different trade, state, or loosen the filters.</p>
                  <button onClick={clearAll}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm text-slate-300 font-semibold transition-colors">
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                </div>
              )}

              {/* Results */}
              {!loading && results.length > 0 && (
                <div className="space-y-2.5">
                  {results.map((r, i) =>
                    r.source === "profile"
                      ? <ProfileCard key={`p-${r.slug}-${i}`} r={r} displayName={displayName(r)} displayTrade={displayTrade(r)} displayLocation={displayLocation(r)} />
                      : <UnclaimedCard key={`u-${r.id}-${i}`} r={r} displayTrade={displayTrade(r)} displayLocation={displayLocation(r)} />
                  )}
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-slate-700 rounded w-2/5" />
                          <div className="h-3 bg-slate-700/60 rounded w-3/5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && !loading && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button disabled={page <= 1}
                    onClick={() => { setPage(p => p - 1); fetchResults(page - 1, filters, mode); }}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                    Previous
                  </button>
                  <span className="text-sm text-slate-500">Page {page} of {pages.toLocaleString()}</span>
                  <button disabled={page >= pages}
                    onClick={() => { setPage(p => p + 1); fetchResults(page + 1, filters, mode); }}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                    Next
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Inline Tailwind class definitions via a style tag since we use non-utility classes */}
      <style>{`
        .filter-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 6px;
        }
        .filter-input {
          width: 100%;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 7px 10px;
          font-size: 13px;
          color: #f1f5f9;
        }
        .filter-input:focus {
          outline: none;
          border-color: #f97316;
        }
        .filter-input option {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
}

// ── Profile result card ───────────────────────────────────────────────────────

function ProfileCard({ r, displayName, displayTrade, displayLocation }: {
  r: SearchResult; displayName: string; displayTrade: string; displayLocation: string;
}) {
  return (
    <Link href={`/pro/${r.slug}`}
      className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/50 hover:border-orange-700/40 rounded-2xl p-3.5 transition-colors group">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center font-black text-slate-400 text-base">
        {r.avatar_url
          ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
          : displayName.charAt(0).toUpperCase()
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-bold text-white group-hover:text-orange-300 transition-colors text-sm truncate">
            {displayName}
          </p>
          {r.verification_status === "verified" && (
            <span className="text-[9px] font-black text-green-400 bg-green-900/30 border border-green-800/50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              VERIFIED
            </span>
          )}
          {r.union_member && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-white bg-blue-700 border border-blue-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <Shield className="w-2.5 h-2.5" /> UNION
            </span>
          )}
          {r.availability_status === "available" && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border text-green-400 bg-green-900/30 border-green-800/50 flex-shrink-0">
              Available
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
          {displayTrade && <span className="text-orange-400 font-semibold">{displayTrade}</span>}
          {displayLocation && (
            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{displayLocation}</span>
          )}
          {r.crew_size && (
            <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{r.crew_size} crew</span>
          )}
          {r.years_experience && <span>{r.years_experience}yr</span>}
          {r.union_local_number && (
            <span className="text-blue-400">Local {r.union_local_number}</span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

// ── Unclaimed registry card ───────────────────────────────────────────────────

function UnclaimedCard({ r, displayTrade, displayLocation }: {
  r: SearchResult; displayTrade: string; displayLocation: string;
}) {
  const claimUrl = r.claim_token
    ? `/build?claim=${r.claim_token}&business=${encodeURIComponent(r.business_name ?? "")}`
    : "/build";

  return (
    <div className="flex items-start gap-3 bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/60 rounded-2xl p-3.5 transition-colors group">
      {/* Placeholder avatar */}
      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 font-black text-base">
        {(r.business_name ?? "?").charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-bold text-slate-300 text-sm truncate">{r.business_name}</p>
          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide">
            Unclaimed
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
          {displayTrade && <span className="text-slate-400">{displayTrade}</span>}
          {displayLocation && (
            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{displayLocation}</span>
          )}
          {r.phone && <span>{r.phone}</span>}
        </div>
      </div>

      <Link href={claimUrl}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-700/40 text-orange-400 hover:text-orange-300 text-[11px] font-bold rounded-xl transition-colors whitespace-nowrap">
        <CheckCircle className="w-3 h-3" /> Claim
      </Link>
    </div>
  );
}
