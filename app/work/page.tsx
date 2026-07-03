"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, MapPin, Building2,
  CheckCircle, Bell, Shield, Filter, Calendar, X, Megaphone
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { ALL_TRADES, UNION_JOB_REQUIREMENTS } from "@/lib/constants";
import EmailCapture from "@/components/EmailCapture";

const COMING_FEATURES = [
  "Browse local and national construction job postings",
  "Apply directly through your Digital Trading Card",
  "GCs post opportunities visible to verified pros first",
  "Filter by trade, location, project type, and pay structure",
  "Direct hire and sub-contract opportunities",
  "Available Now status wires directly into job matching",
];

// ── Union Opportunities ─────────────────────────────────────────────────────

interface UnionJob {
  id: string;
  trade: string;
  location: string;
  jobType: string;
  unionRequirement: typeof UNION_JOB_REQUIREMENTS[number];
  prevailingWage: boolean;
  davisBacon: boolean;
  postedBy: string;
  datePosted: string;
  isSample: boolean;
}

const SAMPLE_UNION_JOBS: UnionJob[] = [
  {
    id: "sample-1",
    trade: "Electrical",
    location: "Tampa, FL",
    jobType: "Direct Hire",
    unionRequirement: "Union Only",
    prevailingWage: true,
    davisBacon: true,
    postedBy: "Gulf Coast Electrical Contractors",
    datePosted: "2026-06-05",
    isSample: true,
  },
  {
    id: "sample-2",
    trade: "Plumbing",
    location: "Houston, TX",
    jobType: "Sub-Contract",
    unionRequirement: "Union Preferred",
    prevailingWage: true,
    davisBacon: false,
    postedBy: "Lone Star Mechanical",
    datePosted: "2026-06-04",
    isSample: true,
  },
  {
    id: "sample-3",
    trade: "Structural Steel",
    location: "New York, NY",
    jobType: "Direct Hire",
    unionRequirement: "Union Only",
    prevailingWage: true,
    davisBacon: true,
    postedBy: "Empire Steel Erectors",
    datePosted: "2026-06-08",
    isSample: true,
  },
  {
    id: "sample-4",
    trade: "HVAC",
    location: "Phoenix, AZ",
    jobType: "Sub-Contract",
    unionRequirement: "Union Preferred",
    prevailingWage: false,
    davisBacon: false,
    postedBy: "Desert Air Mechanical",
    datePosted: "2026-06-02",
    isSample: true,
  },
  {
    id: "sample-5",
    trade: "Carpentry",
    location: "Chicago, IL",
    jobType: "Direct Hire",
    unionRequirement: "Union Only",
    prevailingWage: true,
    davisBacon: true,
    postedBy: "Midwest Framing Co.",
    datePosted: "2026-06-09",
    isSample: true,
  },
  {
    id: "sample-6",
    trade: "Mechanical",
    location: "Los Angeles, CA",
    jobType: "Temporary / Short-Term",
    unionRequirement: "Union Preferred",
    prevailingWage: true,
    davisBacon: false,
    postedBy: "Pacific Mechanical Group",
    datePosted: "2026-06-07",
    isSample: true,
  },
];

const UNION_REQ_STYLE: Record<string, string> = {
  "Union Only": "text-blue-400 bg-blue-900/30 border-blue-800/50",
  "Union Preferred": "text-slate-300 bg-slate-700/40 border-slate-500/50",
  "Open to All": "text-slate-400 bg-slate-800 border-slate-700",
};

function formatPostedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WorkPage() {
  // Live job postings from GCs (Section 5) — merged with seeded samples below.
  const [liveJobs, setLiveJobs] = useState<UnionJob[]>([]);

  useEffect(() => {
    const db = getSupabase() as any;
    if (!db) return;
    db.from("jobs")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }: any) => {
        if (error || !data) return;
        setLiveJobs(data.map((j: any): UnionJob => ({
          id: j.id,
          trade: j.trade,
          location: [j.location_city, j.location_state].filter(Boolean).join(", "),
          jobType: j.job_type ?? "Direct Hire",
          unionRequirement: j.union_requirement ?? "Open to All",
          prevailingWage: !!j.prevailing_wage,
          davisBacon: !!j.davis_bacon,
          postedBy: j.company_name ?? "GC Member",
          datePosted: j.created_at,
          isSample: false,
        })));
      });
  }, []);

  // Filters
  const [filterTrade, setFilterTrade] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterUnionReq, setFilterUnionReq] = useState("");
  const [filterPrevailingWage, setFilterPrevailingWage] = useState(false);
  const [filterDavisBacon, setFilterDavisBacon] = useState(false);

  const allJobs = useMemo(() => [...liveJobs, ...SAMPLE_UNION_JOBS], [liveJobs]);

  const filteredJobs = useMemo(() => {
    return allJobs.filter(j => {
      if (filterTrade && j.trade !== filterTrade) return false;
      if (filterLocation && !j.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      if (filterUnionReq && j.unionRequirement !== filterUnionReq) return false;
      if (filterPrevailingWage && !j.prevailingWage) return false;
      if (filterDavisBacon && !j.davisBacon) return false;
      return true;
    });
  }, [allJobs, filterTrade, filterLocation, filterUnionReq, filterPrevailingWage, filterDavisBacon]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">

        {/* Find Crews sponsor zone -- GCs here are highest-value audience on platform */}
        <a
          href="/advertise"
          className="flex items-center gap-4 bg-orange-950/30 border border-orange-800/50 rounded-2xl px-5 py-4 mb-8 hover:border-orange-500/70 transition-colors group"
          aria-label="Advertise on TradePro Nexus"
        >
          <div className="w-12 h-12 bg-orange-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-0.5">Sponsored</p>
            <p className="text-white font-black text-base group-hover:text-orange-400 transition-colors">
              Reach 828,487 Licensed Contractors
            </p>
            <p className="text-slate-400 text-sm">
              Founding sponsor slots available. Reserve your placement today.
            </p>
          </div>
          <span className="flex-shrink-0 px-5 py-2.5 bg-orange-600 group-hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap hidden sm:inline-flex">
            Reserve a Slot
          </span>
        </a>

        {/* ════════════════════ SECTION A — General Work Opportunities ════════════════════ */}
        <div id="general">
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-950/60 border border-orange-800/50 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider">
              <Bell className="w-3 h-3" /> Coming Soon
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
              Work Opportunities —<br />
              <span className="text-orange-400">Coming to TradePro Nexus.</span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Trade pros will be able to browse and apply for local and national
              construction opportunities directly on TradePro Nexus — matched to
              your trade, location, and verified credentials. No job boards.
              No middlemen.
            </p>
          </motion.div>

          {/* Feature preview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-slate-800 border border-slate-600 rounded-2xl p-5 mb-8"
          >
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              What&apos;s coming
            </h2>
            <div className="space-y-2.5">
              {COMING_FEATURES.map(f => (
                <div key={f} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-300 text-sm">{f}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Email capture */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-800/40 rounded-2xl p-6"
          >
            <EmailCapture
              source="work_opportunities"
              title="Get notified when it launches."
              subtitle="Be first in line — we'll notify you before the public launch."
              buttonLabel="Notify Me When It Launches"
              successTitle="You're on the list."
              successBody="We'll notify you the moment Work Opportunities goes live."
            />
          </motion.div>

          {/* Secondary CTA */}
          <p className="text-center text-sm text-slate-500 mt-8">
            Already on the platform?{" "}
            <Link href="/build" className="text-orange-400 hover:text-orange-300 transition-colors font-semibold">
              Complete your Trading Card
            </Link>{" "}
            so you&apos;re ready when opportunities go live.
          </p>
        </div>

        {/* ════════════════════ SECTION B — Union Opportunities ════════════════════ */}
        <div id="union" className="mt-16 pt-12 border-t border-slate-800">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700/40 border border-slate-500/50 text-slate-300 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
              <Shield className="w-3 h-3 text-blue-400" /> Union Opportunities
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 leading-tight">
              Union Opportunities
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Job postings for union crews and prevailing-wage projects — electricians,
              plumbers, ironworkers, carpenters, pipefitters, and more. Filter by trade,
              location, union requirement, and wage type.
            </p>
          </motion.div>

          {/* Filter bar */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              <Filter className="w-3.5 h-3.5" /> Filter Jobs
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              <select value={filterTrade} onChange={e => setFilterTrade(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
                <option value="">All Trades</option>
                {ALL_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={filterLocation} onChange={e => setFilterLocation(e.target.value)} placeholder="City or state"
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              <select value={filterUnionReq} onChange={e => setFilterUnionReq(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500">
                <option value="">Any Union Requirement</option>
                {UNION_JOB_REQUIREMENTS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFilterPrevailingWage(!filterPrevailingWage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterPrevailingWage ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-900 text-slate-400 border-slate-600 hover:border-slate-500"}`}>
                Prevailing Wage
              </button>
              <button type="button" onClick={() => setFilterDavisBacon(!filterDavisBacon)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterDavisBacon ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-900 text-slate-400 border-slate-600 hover:border-slate-500"}`}>
                Davis-Bacon
              </button>
              {(filterTrade || filterLocation || filterUnionReq || filterPrevailingWage || filterDavisBacon) && (
                <button type="button" onClick={() => { setFilterTrade(""); setFilterLocation(""); setFilterUnionReq(""); setFilterPrevailingWage(false); setFilterDavisBacon(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Job cards */}
          <div className="space-y-3 mb-8">
            {filteredJobs.length === 0 && (
              <div className="text-center py-12">
                <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold mb-1">No jobs match your filters</p>
                <p className="text-slate-600 text-sm mb-4">Try a different trade, location, or wage type.</p>
                <button
                  type="button"
                  onClick={() => { setFilterTrade(""); setFilterLocation(""); setFilterUnionReq(""); setFilterPrevailingWage(false); setFilterDavisBacon(false); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" /> Clear Filters
                </button>
              </div>
            )}
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-black text-white text-base flex items-center gap-2 flex-wrap">
                      {job.trade}
                      {job.isSample && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Sample Posting
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" /> {job.location}
                      <span className="text-slate-600">·</span>
                      <Briefcase className="w-3 h-3" /> {job.jobType}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${UNION_REQ_STYLE[job.unionRequirement]}`}>
                    {job.unionRequirement}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {job.prevailingWage && (
                    <span className="text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-1 rounded-full">
                      Prevailing Wage
                    </span>
                  )}
                  {job.davisBacon && (
                    <span className="text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-1 rounded-full">
                      Davis-Bacon
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-700/50">
                  <span>Posted by {job.postedBy}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatPostedDate(job.datePosted)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Post a Union Opportunity — links to /post-job */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Are you a GC with a union opportunity?
              </p>
              <p className="text-slate-400 text-sm mt-1">Free to post during the launch period — approved jobs appear here.</p>
            </div>
            <Link href="/post-job"
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Post a Union Opportunity
            </Link>
          </div>

          {/* Get Notified — union job alerts */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl p-6">
            <EmailCapture
              source="union_opportunities"
              fixedUserType="pro"
              title="Get notified about union jobs."
              subtitle="We'll email you when new union opportunities matching your trade are posted."
              buttonLabel="Get Union Job Alerts"
              successTitle="You're on the list."
              successBody="We'll email you when new union opportunities are posted."
            />
          </div>
        </div>

      </div>
    </div>
  );
}
