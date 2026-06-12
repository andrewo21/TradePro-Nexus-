"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Briefcase, MapPin, CheckCircle, Trash2, RefreshCw, Undo2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Job } from "@/types/database";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

const STATUS_STYLE: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  approved: "text-green-400 bg-green-900/30 border-green-800/50",
  removed: "text-slate-500 bg-slate-800 border-slate-700",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "removed">("pending");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const db = getSupabase();
    db?.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setAuthorized(true);
        fetchJobs();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    });
  }, [fetchJobs]);

  async function setStatus(id: string, status: "pending" | "approved" | "removed") {
    setBusyId(id);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
    }
    setBusyId(null);
  }

  async function deleteJob(id: string) {
    if (!confirm("Permanently delete this job posting?")) return;
    setBusyId(id);
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setJobs(prev => prev.filter(j => j.id !== id));
    }
    setBusyId(null);
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Not authorized.</p>
      </div>
    );
  }

  const visible = jobs.filter(j => filter === "all" || j.status === filter);
  const counts = {
    all: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    approved: jobs.filter(j => j.status === "approved").length,
    removed: jobs.filter(j => j.status === "removed").length,
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Job Postings</h1>
            <p className="text-slate-400 text-sm mt-0.5">Review and approve GC job postings for Union Opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link href="/admin/waitlist" className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-white transition-colors">
              ← Admin
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-3 mb-5">
          {[
            { key: "pending", label: `Pending (${counts.pending})` },
            { key: "approved", label: `Approved (${counts.approved})` },
            { key: "removed", label: `Removed (${counts.removed})` },
            { key: "all", label: `All (${counts.all})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === tab.key ? "bg-orange-900/40 border border-orange-800/60 text-orange-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No job postings to show.</div>
        ) : (
          <div className="space-y-3">
            {visible.map(job => (
              <div key={job.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-black text-white text-base flex items-center gap-2 flex-wrap">
                      <Briefcase className="w-4 h-4 text-orange-400" /> {job.trade}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_STYLE[job.status]}`}>{job.status}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" /> {job.location_city ? `${job.location_city}, ` : ""}{job.location_state}
                      <span className="text-slate-600">·</span> {job.job_type}
                      <span className="text-slate-600">·</span> {job.union_requirement}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{timeAgo(job.created_at)}</span>
                </div>

                <p className="text-slate-300 text-sm mb-2 line-clamp-3">{job.description}</p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{job.company_name}</span>
                  <span className="text-slate-700">·</span>
                  <span>{job.contact_email}</span>
                  {job.prevailing_wage && <span className="text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full text-[10px] font-bold">Prevailing Wage</span>}
                  {job.davis_bacon && <span className="text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full text-[10px] font-bold">Davis-Bacon</span>}
                  {job.notified_count > 0 && <span className="text-blue-400 bg-blue-900/30 border border-blue-800/40 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{job.notified_count} pros notified</span>}
                </div>

                <div className="flex items-center gap-2">
                  {job.status !== "approved" && (
                    <button onClick={() => setStatus(job.id, "approved")} disabled={busyId === job.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-800/50 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-900/50 transition-colors disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {job.status !== "removed" && (
                    <button onClick={() => setStatus(job.id, "removed")} disabled={busyId === job.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 rounded-lg text-xs font-semibold hover:text-white transition-colors disabled:opacity-50">
                      <Undo2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                  {job.status === "removed" && (
                    <button onClick={() => setStatus(job.id, "pending")} disabled={busyId === job.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 rounded-lg text-xs font-semibold hover:text-white transition-colors disabled:opacity-50">
                      <Undo2 className="w-3.5 h-3.5" /> Restore to Pending
                    </button>
                  )}
                  <button onClick={() => deleteJob(job.id)} disabled={busyId === job.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 border border-red-900/40 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-950/50 transition-colors disabled:opacity-50 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
