"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Database, Upload, RefreshCw, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, AlertCircle, Shield,
  Loader2, FileText, Eye, EyeOff, Mail, Ban
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportRun {
  id: string;
  source_state: string;
  import_type: "scrape" | "csv";
  status: string;
  records_fetched: number;
  records_promoted: number;
  records_duplicate: number;
  records_flagged: number;
  records_below_threshold: number;
  records_error: number;
  robots_blocked: boolean;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface StagingSummary {
  source_state: string;
  total: number;
  pending: number;
  promoted: number;
  duplicate: number;
  flagged: number;
  skipped: number;
  error_count: number;
  avg_quality: number;
}

interface UnclaimedSummary {
  source_state: string;
  total: number;
  claimed: number;
  unclaimed: number;
  visible: number;
  outreach_sent: number;
  outreach_eligible: number;
  remove_requested: number;
}

interface OutreachSettings {
  enabled: boolean;
  testMode: boolean;
  testEmail: string;
  batchSize: number;
}

interface StatusData {
  imports: ImportRun[];
  staging: StagingSummary[];
  unclaimed: UnclaimedSummary[];
  outreach: OutreachSettings;
}

// Available states — Florida is Session 1. Others added in Sessions 2-4.
const IMPLEMENTED_STATES = ["FL"];
const FUTURE_STATES = ["GA", "TX", "TN", "NY", "PA", "OH", "IL", "AZ", "NV", "CA", "WA"];

const STATE_NAMES: Record<string, string> = {
  FL: "Florida", GA: "Georgia", TX: "Texas", TN: "Tennessee",
  NY: "New York", PA: "Pennsylvania", OH: "Ohio", IL: "Illinois",
  AZ: "Arizona", NV: "Nevada", CA: "California", WA: "Washington",
};

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running:  "text-blue-400 bg-blue-900/30 border-blue-800/50",
    complete: "text-green-400 bg-green-900/30 border-green-800/50",
    failed:   "text-red-400 bg-red-900/20 border-red-800/40",
    partial:  "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
    blocked:  "text-orange-400 bg-orange-900/30 border-orange-800/50",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}>
      {status.toUpperCase()}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RegistryAdminPage() {
  const router = useRouter();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvState, setCsvState] = useState("FL");
  const [outreachConfirmOpen, setOutreachConfirmOpen] = useState(false);
  const [outreachPendingValue, setOutreachPendingValue] = useState(false);
  const [promoteState, setPromoteState] = useState("FL");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/admin/registry/status");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Guard: check admin auth
    getSupabase()?.auth.getUser().then(({ data: { user } }) => {
      if (user?.email !== "andrew@tradeprotech.ai") router.push("/");
    });
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchStatus, router]);

  function msg(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function triggerScrape(state: string) {
    setActionState(p => ({ ...p, [`scrape_${state}`]: true }));
    try {
      const res = await fetch(`/api/admin/registry/import/${state}`, { method: "POST" });
      const d = await res.json();
      if (res.ok) msg("ok", `${state} scrape started (importId: ${d.importId.slice(0, 8)}…)`);
      else msg("err", d.error ?? "Scrape failed.");
    } catch { msg("err", "Network error."); }
    finally { setActionState(p => ({ ...p, [`scrape_${state}`]: false })); fetchStatus(); }
  }

  async function uploadCSV() {
    if (!csvFile) return;
    setActionState(p => ({ ...p, csv_upload: true }));
    const form = new FormData();
    form.append("file", csvFile);
    try {
      const res = await fetch(`/api/admin/registry/upload/${csvState}`, { method: "POST", body: form });
      const d = await res.json();
      if (res.ok) msg("ok", `${d.staged} records staged from CSV (${d.skipped} skipped).`);
      else msg("err", d.error ?? "Upload failed.");
    } catch { msg("err", "Upload error."); }
    finally { setActionState(p => ({ ...p, csv_upload: false })); setCsvFile(null); fetchStatus(); }
  }

  async function promoteRecords() {
    setActionState(p => ({ ...p, [`promote_${promoteState}`]: true }));
    try {
      const res = await fetch("/api/admin/registry/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: promoteState, limit: 2000 }),
      });
      const d = await res.json();
      if (res.ok) msg("ok", `Promoted: ${d.promoted} | Dup: ${d.duplicate} | Flagged: ${d.flagged} | Low quality: ${d.belowThreshold}`);
      else msg("err", d.error ?? "Promote failed.");
    } catch { msg("err", "Promote error."); }
    finally { setActionState(p => ({ ...p, [`promote_${promoteState}`]: false })); fetchStatus(); }
  }

  // ── Outreach master switch ───────────────────────────────────────────────────
  // CRITICAL: outreach is OFF by default and requires explicit confirmation.

  function requestOutreachToggle(newValue: boolean) {
    if (newValue === true) {
      // Turning ON requires confirmation dialog
      setOutreachPendingValue(true);
      setOutreachConfirmOpen(true);
    } else {
      // Turning OFF is immediate, no confirmation needed
      applyOutreachSetting(false);
    }
  }

  async function applyOutreachSetting(enabled: boolean) {
    setOutreachConfirmOpen(false);
    setActionState(p => ({ ...p, outreach_switch: true }));
    try {
      await fetch("/api/admin/registry/outreach-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "outreach_enabled", value: String(enabled) }),
      });
      msg(enabled ? "err" : "ok",
        enabled ? "⚠️ Outreach ENABLED. Emails will send on next batch run." : "Outreach disabled.");
      fetchStatus();
    } catch { msg("err", "Failed to update outreach setting."); }
    finally { setActionState(p => ({ ...p, outreach_switch: false })); }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-orange-400" />
              <h1 className="text-xl font-black text-white">Registry Import Admin</h1>
            </div>
            <p className="text-slate-400 text-sm">Florida (Session 1) · 12 states total across 6 sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchStatus} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <span className="text-[10px] text-slate-600 font-mono">admin only</span>
          </div>
        </div>

        {/* Flash message */}
        {message && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${message.type === "ok" ? "bg-green-900/30 border border-green-700 text-green-300" : "bg-red-900/30 border border-red-700 text-red-300"}`}>
            {message.type === "ok" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading registry status…</div>
        ) : (
          <div className="space-y-6">

            {/* ── OUTREACH MASTER SWITCH ────────────────────────────────────────────── */}
            {/* CRITICAL SAFETY CONTROL — default OFF, confirmation required to enable */}
            <div className={`rounded-2xl p-5 border-2 ${data?.outreach.enabled ? "border-red-700/60 bg-red-950/20" : "border-slate-700 bg-slate-800/60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${data?.outreach.enabled ? "bg-red-900/40 border border-red-700" : "bg-slate-900 border border-slate-700"}`}>
                    <Mail className={`w-5 h-5 ${data?.outreach.enabled ? "text-red-400" : "text-slate-500"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-white">Outreach Master Switch</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${data?.outreach.enabled ? "text-red-400 bg-red-900/30 border-red-700" : "text-slate-400 bg-slate-800 border-slate-700"}`}>
                        {data?.outreach.enabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {data?.outreach.enabled
                        ? "⚠️ Outreach emails are ACTIVE. Batches will send on schedule."
                        : "Outreach is OFF. No emails will send regardless of other settings."}
                    </p>
                    {data?.outreach.testMode && (
                      <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Test mode ON — all emails route to {data.outreach.testEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {data?.outreach.enabled ? (
                    <button
                      onClick={() => requestOutreachToggle(false)}
                      disabled={actionState.outreach_switch}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" /> Disable Outreach
                    </button>
                  ) : (
                    <button
                      onClick={() => requestOutreachToggle(true)}
                      disabled={actionState.outreach_switch}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" /> Enable Outreach
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Outreach confirmation dialog */}
            {outreachConfirmOpen && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 border-2 border-red-700 rounded-2xl p-6 max-w-md w-full">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <h3 className="text-lg font-black text-white">Enable Outreach?</h3>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">
                    You are about to enable outreach emails. This will begin queuing emails to unclaimed profile contacts on the next batch run.
                  </p>
                  <p className="text-slate-400 text-sm mb-4">
                    <strong className="text-yellow-400">Test mode is {data?.outreach.testMode ? "ON" : "OFF"}.</strong>{" "}
                    {data?.outreach.testMode ? `All emails will go to ${data.outreach.testEmail} only.` : "Real contacts will receive emails."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOutreachConfirmOpen(false)}
                      className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition-colors hover:border-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => applyOutreachSetting(true)}
                      className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      Confirm Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── IMPORT CONTROLS ─────────────────────────────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* Scrape trigger */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-orange-400" /> Run Scraper
                </h2>
                <div className="space-y-3">
                  {IMPLEMENTED_STATES.map(state => (
                    <div key={state} className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{STATE_NAMES[state]} ({state})</span>
                      <button
                        onClick={() => triggerScrape(state)}
                        disabled={actionState[`scrape_${state}`]}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        {actionState[`scrape_${state}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Run Scraper
                      </button>
                    </div>
                  ))}
                  {FUTURE_STATES.map(state => (
                    <div key={state} className="flex items-center justify-between opacity-40">
                      <span className="text-sm text-slate-500">{STATE_NAMES[state]} ({state})</span>
                      <span className="text-xs text-slate-600 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">Session 2-4</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CSV Upload */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-blue-400" /> CSV Upload Fallback
                </h2>
                <p className="text-xs text-slate-500 mb-4">Use when scraper is blocked. Download CSV from state registry portal and upload here.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">State</label>
                    <select value={csvState} onChange={e => setCsvState(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                      {[...IMPLEMENTED_STATES, ...FUTURE_STATES].map(s => (
                        <option key={s} value={s}>{STATE_NAMES[s]} ({s})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">CSV File</label>
                    <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                      className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-200 file:text-xs file:font-semibold hover:file:bg-slate-600" />
                  </div>
                  {csvFile && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" /> {csvFile.name} ({(csvFile.size / 1024).toFixed(0)}KB)
                    </div>
                  )}
                  <button
                    onClick={uploadCSV}
                    disabled={!csvFile || actionState.csv_upload}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    {actionState.csv_upload ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload & Stage Records
                  </button>
                </div>
              </div>
            </div>

            {/* ── PROMOTE STAGING ────────────────────────────────────────────────────── */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 text-green-400" /> Promote Staging → Live Directory
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Runs duplicate detection, quality scoring (min 6/10), and inactive filtering.
                Only clean records with score ≥ 6 promote. Duplicates and low-quality records stay in staging.
              </p>
              <div className="flex items-center gap-3">
                <select value={promoteState} onChange={e => setPromoteState(e.target.value)} className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
                  {[...IMPLEMENTED_STATES, ...FUTURE_STATES].map(s => (
                    <option key={s} value={s}>{STATE_NAMES[s]} ({s})</option>
                  ))}
                </select>
                <button
                  onClick={promoteRecords}
                  disabled={actionState[`promote_${promoteState}`]}
                  className="flex items-center gap-1.5 px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {actionState[`promote_${promoteState}`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Promote 2,000 Records
                </button>
              </div>
            </div>

            {/* ── STAGING STATS ──────────────────────────────────────────────────────── */}
            {data?.staging && data.staging.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Staging Table</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700/50">
                        {["State","Total","Pending","Promoted","Duplicate","Flagged","Skipped","Errors","Avg Score"].map(h => (
                          <th key={h} className="text-left px-4 py-2 font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.staging.map(s => (
                        <tr key={s.source_state} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                          <td className="px-4 py-3 font-bold text-white">{STATE_NAMES[s.source_state] ?? s.source_state}</td>
                          <td className="px-4 py-3 text-slate-300">{s.total?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-yellow-400">{s.pending?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-green-400">{s.promoted?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-400">{s.duplicate?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-orange-400">{s.flagged?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500">{s.skipped?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-400">{s.error_count?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-300">{s.avg_quality}/10</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── UNCLAIMED PROFILE COUNTS ───────────────────────────────────────────── */}
            {data?.unclaimed && data.unclaimed.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Directory</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700/50">
                        {["State","Total","Claimed","Unclaimed","Visible","Outreach Sent","Eligible","Remove Req"].map(h => (
                          <th key={h} className="text-left px-4 py-2 font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.unclaimed.map(u => (
                        <tr key={u.source_state} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                          <td className="px-4 py-3 font-bold text-white">{STATE_NAMES[u.source_state] ?? u.source_state}</td>
                          <td className="px-4 py-3 text-slate-300">{u.total?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-green-400">{u.claimed?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-300">{u.unclaimed?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-blue-400">{u.visible?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-orange-400">{u.outreach_sent?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-400">{u.outreach_eligible?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-400">{u.remove_requested?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── RECENT IMPORT RUNS ─────────────────────────────────────────────────── */}
            {data?.imports && data.imports.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Import Runs</h2>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {data.imports.map(run => (
                    <div key={run.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">{STATE_NAMES[run.source_state] ?? run.source_state}</span>
                          <StatusBadge status={run.status} />
                          <span className="text-[10px] text-slate-500 uppercase">{run.import_type}</span>
                          {run.robots_blocked && <span className="text-[10px] text-orange-400 font-bold">ROBOTS BLOCKED</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                          <span>Fetched: <span className="text-slate-300">{run.records_fetched}</span></span>
                          <span>Promoted: <span className="text-green-400">{run.records_promoted}</span></span>
                          <span>Dup: <span className="text-slate-400">{run.records_duplicate}</span></span>
                          <span>Flagged: <span className="text-orange-400">{run.records_flagged}</span></span>
                          {run.error_message && <span className="text-red-400 truncate max-w-xs">{run.error_message}</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo(run.started_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !data?.staging?.length && !data?.imports?.length && (
              <div className="text-center py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold mb-1">No registry imports yet</p>
                <p className="text-slate-600 text-sm">Run the Florida scraper or upload a CSV to get started.</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
