"use client";

import { useState } from "react";
import { Briefcase, CheckCircle, Loader2, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { ALL_TRADES, JOB_TYPES, UNION_JOB_REQUIREMENTS } from "@/lib/constants";

export default function PostJobPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [jobType, setJobType] = useState<typeof JOB_TYPES[number]>(JOB_TYPES[0]);
  const [unionRequirement, setUnionRequirement] = useState<typeof UNION_JOB_REQUIREMENTS[number]>(UNION_JOB_REQUIREMENTS[2]);
  const [prevailingWage, setPrevailingWage] = useState(false);
  const [davisBacon, setDavisBacon] = useState(false);
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !contactEmail.trim() || !trade || !locationState.trim() || !description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_email: contactEmail.trim(),
          trade,
          location_city: locationCity.trim(),
          location_state: locationState.trim(),
          job_type: jobType,
          union_requirement: unionRequirement,
          prevailing_wage: prevailingWage,
          davis_bacon: davisBacon,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 pt-24 pb-20">

        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-950/40 border border-green-800/50 text-green-400 text-xs font-bold rounded-full uppercase tracking-wider">
            Free to post during launch period
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-white mb-2 flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-orange-400" /> Post a Job
        </h1>
        <p className="text-slate-400 mb-8">
          Reach verified trade pros across the TradePro Nexus network. Approved postings appear
          in the Union Opportunities board and we&apos;ll notify matching trade pros in your area.
        </p>

        {done ? (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-lg font-black text-white mb-2">Job submitted for review</h2>
            <p className="text-slate-400 text-sm mb-6">
              We&apos;ve sent a confirmation to {contactEmail}. Once approved, your posting will go live
              in the Union Opportunities board and matching trade pros will be notified.
            </p>
            <Link href="/work#union" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">
              View Union Opportunities
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Company Name *</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} required
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Contact Email *</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Trade *</label>
              <select value={trade} onChange={e => setTrade(e.target.value)} required
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                <option value="">Select a trade…</option>
                {ALL_TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">City</label>
                <input value={locationCity} onChange={e => setLocationCity(e.target.value)} placeholder="e.g. Tampa"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">State *</label>
                <input value={locationState} onChange={e => setLocationState(e.target.value)} placeholder="e.g. FL" maxLength={2} required
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors uppercase" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Job Type</label>
                <select value={jobType} onChange={e => setJobType(e.target.value as typeof JOB_TYPES[number])}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Union Requirement</label>
                <select value={unionRequirement} onChange={e => setUnionRequirement(e.target.value as typeof UNION_JOB_REQUIREMENTS[number])}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                  {UNION_JOB_REQUIREMENTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPrevailingWage(!prevailingWage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${prevailingWage ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-900 text-slate-400 border-slate-600 hover:border-slate-500"}`}>
                Prevailing Wage
              </button>
              <button type="button" onClick={() => setDavisBacon(!davisBacon)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${davisBacon ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-900 text-slate-400 border-slate-600 hover:border-slate-500"}`}>
                Davis-Bacon
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Job Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={5}
                placeholder="Describe the scope of work, schedule, and requirements…"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none" />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black rounded-xl text-sm transition-colors">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                : <><Building2 className="w-4 h-4" /> Submit Job Posting</>
              }
            </button>
            <p className="text-center text-xs text-slate-600">
              Postings are reviewed before going live. Free to post during the launch period.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
