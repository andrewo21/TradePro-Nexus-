"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Building2, MapPin, Users, Shield, HardHat,
  X, Loader2, ChevronRight, Zap, CheckCircle, Clock
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ALL_TRADES } from "@/lib/constants";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

type Profile = {
  slug: string;
  first_name: string | null;
  last_name: string | null;
  firm_name: string | null;
  trade: string | null;
  location_city: string | null;
  location_state: string | null;
  availability_status: string | null;
  union_member: boolean | null;
  union_name: string | null;
  union_local_number: string | null;
  crew_size: number | null;
  years_experience: number | null;
  verification_status: string | null;
  avatar_url: string | null;
  profile_type: string | null;
};

type Mode = "crews" | "union" | "gcs";

const BANNER_KEY = "fc_banner_dismissed";

export default function SearchPage() {
  const [mode, setMode] = useState<Mode>("crews");
  const [bannerDismissed, setBannerDismissed] = useState(true);

  // Shared filters (crews + union)
  const [trade, setTrade] = useState("");
  const [state, setState] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [q, setQ] = useState("");

  // Crews-only filter
  const [unionOnly, setUnionOnly] = useState(false);

  // Union directory-only filter
  const [localNum, setLocalNum] = useState("");

  const [results, setResults] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setBannerDismissed(localStorage.getItem(BANNER_KEY) === "1");
  }, []);

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, "1");
    setBannerDismissed(true);
  }

  const fetchResults = useCallback(async (p = 1) => {
    if (mode === "gcs") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (trade)         params.set("trade", trade);
      if (state)         params.set("state", state);
      if (availableOnly) params.set("available", "true");
      if (q)             params.set("q", q);

      if (mode === "union") {
        params.set("union", "true");
        if (localNum) params.set("local", localNum);
      } else {
        if (unionOnly) params.set("union", "true");
      }

      const res = await fetch(`/api/search/crews?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setPages(data.pages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, trade, state, availableOnly, unionOnly, localNum, q]);

  // Immediate fetch when dropdowns/toggles change
  useEffect(() => {
    if (mode === "gcs") return;
    setPage(1);
    fetchResults(1);
  }, [trade, state, availableOnly, unionOnly, localNum, mode, fetchResults]);

  // Debounced fetch for text inputs
  useEffect(() => {
    if (mode === "gcs") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchResults(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, localNum, mode, fetchResults]);

  function displayName(p: Profile) {
    if (p.firm_name) return p.firm_name;
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Trade Pro";
  }

  function switchMode(m: Mode) {
    setMode(m);
    setResults([]);
    setTotal(0);
  }

  const hasCrewsFilters = trade || state || unionOnly || availableOnly || q;
  const hasUnionFilters = trade || state || availableOnly || q || localNum;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Launch banner */}
        {!bannerDismissed && (
          <div className="relative mb-6 bg-orange-950/60 border border-orange-700/60 rounded-2xl px-5 py-4 flex items-start gap-4">
            <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-orange-200 text-sm font-semibold leading-relaxed">
                <span className="text-orange-400 font-black">Free during our launch period.</span>{" "}
                Find Crews is open to everyone right now. This will become a paid GC feature soon —{" "}
                <Link href="/signup" className="underline text-orange-300 hover:text-white transition-colors">
                  create a free account
                </Link>{" "}
                to lock in your access before the paywall goes up.
              </p>
            </div>
            <button onClick={dismissBanner} className="text-orange-500 hover:text-white transition-colors flex-shrink-0 mt-0.5" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header + tabs */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-4">Search</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => switchMode("crews")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === "crews" ? "bg-blue-700 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
              }`}
            >
              <Building2 className="w-4 h-4" /> Find Crews
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-600/40 text-orange-300">Free Now</span>
            </button>
            <button
              onClick={() => switchMode("union")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === "union" ? "bg-blue-800 text-white border border-blue-600" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-blue-700"
              }`}
            >
              <Shield className="w-4 h-4" /> Union Directory
            </button>
            <button
              onClick={() => switchMode("gcs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === "gcs" ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
              }`}
            >
              <HardHat className="w-4 h-4" /> Find GCs
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-600/40 text-orange-300">Free</span>
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            {mode === "crews" && "Search verified trade pros and subs by trade, state, union status, and availability. No account required."}
            {mode === "union" && "Union members only — search by local number, trade, and state. Perfect for GCs sourcing union crews."}
            {mode === "gcs"  && "Find General Contractors actively looking for qualified subs. Always free for trade pros."}
          </p>
        </div>

        {/* ── FIND CREWS tab ── */}
        {mode === "crews" && (
          <div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name, trade, company…"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={trade} onChange={e => setTrade(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 min-w-40">
                  <option value="">All Trades</option>
                  {ALL_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={state} onChange={e => setState(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                  <option value="">All States</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setUnionOnly(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${unionOnly ? "bg-blue-700 border-blue-600 text-white" : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400"}`}>
                  <Shield className="w-3.5 h-3.5" /> Union Only
                </button>
                <button onClick={() => setAvailableOnly(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${availableOnly ? "bg-green-700 border-green-600 text-white" : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400"}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Available Now
                </button>
                {hasCrewsFilters && (
                  <button onClick={() => { setTrade(""); setState(""); setUnionOnly(false); setAvailableOnly(false); setQ(""); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-600 transition-colors">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>
            <ResultsList results={results} total={total} loading={loading} page={page} pages={pages} onPage={fetchResults} displayName={displayName} />
          </div>
        )}

        {/* ── UNION DIRECTORY tab ── */}
        {mode === "union" && (
          <div>
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-2xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">
                <Shield className="w-3.5 h-3.5" /> Union Member Directory — All members below are self-reported union affiliates
              </div>

              {/* Local number search — primary field for this view */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={localNum}
                  onChange={e => setLocalNum(e.target.value)}
                  placeholder='Search by local number or union — e.g. "349" or "IBEW Local 349"'
                  className="w-full bg-slate-900 border border-blue-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Name / keyword search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name or company…"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select value={trade} onChange={e => setTrade(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 min-w-40">
                  <option value="">All Trades</option>
                  {ALL_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={state} onChange={e => setState(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">All States</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setAvailableOnly(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${availableOnly ? "bg-green-700 border-green-600 text-white" : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400"}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> Available Now
                </button>
                {hasUnionFilters && (
                  <button onClick={() => { setTrade(""); setState(""); setAvailableOnly(false); setQ(""); setLocalNum(""); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-600 transition-colors">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>
            <ResultsList results={results} total={total} loading={loading} page={page} pages={pages} onPage={fetchResults} displayName={displayName} unionMode />
          </div>
        )}

        {/* ── FIND GCs tab ── */}
        {mode === "gcs" && (
          <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-2xl">
            <Clock className="w-10 h-10 text-orange-400 mx-auto mb-3" />
            <p className="text-white font-black text-lg mb-2">GC Directory — Coming Soon</p>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              General Contractor profiles are being verified now. The GC directory will be free for all trade pros and subs — no subscription required.
            </p>
            <Link href="/#waitlist"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
              <Zap className="w-4 h-4" /> Get Notified When It Launches
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Shared results list ────────────────────────────────────────────────────────

function ResultsList({
  results, total, loading, page, pages, onPage, displayName, unionMode = false
}: {
  results: Profile[];
  total: number;
  loading: boolean;
  page: number;
  pages: number;
  onPage: (p: number) => void;
  displayName: (p: Profile) => string;
  unionMode?: boolean;
}) {
  return (
    <>
      {!loading && (
        <p className="text-xs text-slate-500 mb-3">
          {total === 0
            ? "No results"
            : `Showing ${results.length} of ${total.toLocaleString()} ${unionMode ? "union member" : "trade pro"}${total !== 1 ? "s" : ""}`}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Searching…
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-16 bg-slate-800/30 border border-slate-700/40 rounded-2xl">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold mb-1">No results match your filters</p>
          <p className="text-slate-500 text-sm">Try broadening your search or clearing some filters.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map(pro => {
            const name = displayName(pro);
            const local = pro.union_local_number ? `Local ${pro.union_local_number}` : null;
            const unionAffiliation = [pro.union_name, local].filter(Boolean).join(" · ");

            return (
              <Link
                key={pro.slug}
                href={`/pro/${pro.slug}`}
                className="block bg-slate-800/60 border border-slate-700/50 hover:border-slate-500 rounded-2xl p-4 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-700 flex-shrink-0 overflow-hidden">
                    {pro.avatar_url
                      ? <img src={pro.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-lg">
                          {name.charAt(0).toUpperCase()}
                        </div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-black text-white group-hover:text-orange-300 transition-colors truncate">{name}</p>
                      {pro.availability_status === "available" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-green-400 bg-green-900/30 border-green-800/50 flex-shrink-0">
                          Available Now
                        </span>
                      )}
                      {pro.union_member && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-blue-700 border border-blue-500 px-2 py-0.5 rounded-full flex-shrink-0">
                          <Shield className="w-3 h-3" /> UNION
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                      {pro.trade && <span className="text-orange-400 font-semibold">{pro.trade}</span>}
                      {(pro.location_city || pro.location_state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[pro.location_city, pro.location_state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {pro.crew_size && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {pro.crew_size} crew</span>
                      )}
                      {pro.years_experience && <span>{pro.years_experience}yr exp</span>}
                    </div>

                    {/* Show union affiliation in union directory view */}
                    {unionMode && unionAffiliation && (
                      <p className="text-[11px] text-blue-300 mt-1 font-semibold">{unionAffiliation}</p>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pages > 1 && !loading && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => onPage(page - 1)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => onPage(page + 1)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
            Next
          </button>
        </div>
      )}
    </>
  );
}
