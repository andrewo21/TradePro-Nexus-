"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Database, Upload, RefreshCw, AlertTriangle, CheckCircle,
  ChevronRight, AlertCircle, Loader2, Mail, Ban,
  Search, ChevronLeft, ChevronDown, Eye, Building2, Settings
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSupabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportRun {
  id: string;
  source_state: string;
  import_type: "scrape" | "csv" | "promote";
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

interface StagingRecord {
  id: string;
  import_id: string;
  source_state: string;
  business_name: string | null;
  license_type: string | null;
  license_number: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  license_status: string;
  quality_score: number;
  status: string;
  duplicate_type: string | null;
  flagged_for_review: boolean;
  review_reason: string[] | null;
  error_detail: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

interface OutreachSettings {
  enabled: boolean;
  testMode: boolean;
  testEmail: string;
  batchSize: number;
  physicalAddress: string;
  lastRun: string;
  lastCount: number;
  totalSentToDate: number;
  dailyCap: number;
  dailySent: number;
  rampDay: number;
  startDate: string | null;
  log: Record<string, number>;
}

interface StatusData {
  imports: ImportRun[];
  staging: StagingSummary[];
  unclaimed: any[];
  outreach: OutreachSettings;
}

interface RecordsPage {
  records: StagingRecord[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

const STATE_NAMES: Record<string, string> = {
  FL: "Florida", GA: "Georgia", TX: "Texas", TN: "Tennessee",
  NY: "New York", PA: "Pennsylvania", OH: "Ohio", IL: "Illinois",
  AZ: "Arizona", NV: "Nevada", CA: "California", WA: "Washington",
};

const IMPLEMENTED_STATES = ["FL"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Format a UTC ISO string as Eastern time for admin display
function toEasternTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " ET";
}

function QualityBadge({ score }: { score: number }) {
  const color = score === 10 ? "text-green-400 bg-green-900/30 border-green-700"
    : score >= 8 ? "text-blue-400 bg-blue-900/30 border-blue-700"
    : score >= 6 ? "text-yellow-400 bg-yellow-900/30 border-yellow-700"
    : "text-red-400 bg-red-900/20 border-red-800";
  return (
    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${color}`}>
      {score}/10
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "text-blue-400 bg-blue-900/30 border-blue-800",
    promoted:  "text-green-400 bg-green-900/30 border-green-800",
    duplicate: "text-slate-400 bg-slate-800 border-slate-700",
    flagged:   "text-orange-400 bg-orange-900/30 border-orange-800",
    error:     "text-red-400 bg-red-900/20 border-red-800",
    skipped:   "text-slate-500 bg-slate-800 border-slate-700",
    running:   "text-blue-400 bg-blue-900/30 border-blue-800",
    complete:  "text-green-400 bg-green-900/30 border-green-800",
    failed:    "text-red-400 bg-red-900/20 border-red-800",
    blocked:   "text-orange-400 bg-orange-900/30 border-orange-800",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RegistryAdminPage() {
  const router = useRouter();
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordsData, setRecordsData] = useState<RecordsPage | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsFilter, setRecordsFilter] = useState({ state: "FL", status: "pending", search: "", page: 1 });
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvState, setCsvState] = useState("FL");
  const [promoteState, setPromoteState] = useState("FL");
  const [testBatchRunning, setTestBatchRunning] = useState(false);
  const [outreachConfirmOpen, setOutreachConfirmOpen] = useState(false);
  const [outreachSettingsOpen, setOutreachSettingsOpen] = useState(false);
  const [outreachSettingsForm, setOutreachSettingsForm] = useState({
    physicalAddress: "",
    testEmail: "",
    batchSize: "50",
    testMode: true,
  });
  const [outreachSettingsSaving, setOutreachSettingsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"records" | "imports" | "actions">("records");
  const [promoteProgress, setPromoteProgress] = useState<{
    running: boolean;
    total: number;
    processed: number;
    promoted: number;
    duplicate: number;
    flagged: number;
    errors: number;
  } | null>(null);

  function msg(type: "ok" | "err", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  }

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/admin/registry/status");
    if (res.ok) setStatusData(await res.json());
    setLoading(false);
  }, []);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    const params = new URLSearchParams({
      state: recordsFilter.state,
      status: recordsFilter.status,
      page: String(recordsFilter.page),
      limit: "50",
      ...(recordsFilter.search ? { search: recordsFilter.search } : {}),
    });
    const res = await fetch(`/api/admin/registry/records?${params}`);
    if (res.ok) setRecordsData(await res.json());
    setRecordsLoading(false);
  }, [recordsFilter]);

  useEffect(() => {
    getSupabase()?.auth.getUser().then(({ data: { user } }) => {
      if (user?.email !== "andrew@tradeprotech.ai") router.push("/");
    });
    fetchStatus();
  }, [fetchStatus, router]);

  useEffect(() => {
    if (activeTab === "records") fetchRecords();
  }, [fetchRecords, activeTab]);

  async function triggerScrape(state: string) {
    setActionState(p => ({ ...p, [`scrape_${state}`]: true }));
    try {
      const res = await fetch(`/api/admin/registry/import/${state}`, { method: "POST" });
      const d = await res.json();
      if (res.ok) msg("ok", `${state} scrape started (${d.importId?.slice(0, 8)}…)`);
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
      if (res.ok) { msg("ok", `${d.staged} records staged from CSV.`); fetchRecords(); }
      else msg("err", d.error ?? "Upload failed.");
    } catch { msg("err", "Upload error."); }
    finally { setActionState(p => ({ ...p, csv_upload: false })); setCsvFile(null); fetchStatus(); }
  }

  async function promoteRecords() {
    const BATCH = 500;
    const totals = { promoted: 0, duplicate: 0, flagged: 0, belowThreshold: 0, errors: 0 };

    setPromoteProgress({ running: true, total: 0, processed: 0, ...totals });
    setActionState(p => ({ ...p, [`promote_${promoteState}`]: true }));

    try {
      let offset = 0;
      let hasMore = true;
      let grandTotal = 0;

      while (hasMore) {
        const res = await fetch("/api/admin/registry/promote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: promoteState, batchSize: BATCH, offset }),
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          msg("err", d.error ?? `Promote failed (batch at offset ${offset}).`);
          break;
        }

        const d = await res.json();

        // Capture total from first batch
        if (offset === 0) grandTotal = d.total ?? 0;

        totals.promoted    += d.promoted    ?? 0;
        totals.duplicate   += d.duplicate   ?? 0;
        totals.flagged     += d.flagged     ?? 0;
        totals.belowThreshold += d.belowThreshold ?? 0;
        totals.errors      += d.errors      ?? 0;

        const processed = Math.min(offset + BATCH, grandTotal);
        setPromoteProgress({ running: true, total: grandTotal, processed, ...totals });

        hasMore = d.hasMore ?? false;
        // Always restart from offset 0 — promoted records are marked and skipped by the API
        // offset stays 0 because we process from the top of "pending" each time
      }

      msg("ok",
        `Done! Promoted: ${totals.promoted.toLocaleString()} | ` +
        `Dup: ${totals.duplicate.toLocaleString()} | ` +
        `Flagged: ${totals.flagged.toLocaleString()} | ` +
        `Low quality: ${totals.belowThreshold.toLocaleString()}` +
        (totals.errors ? ` | Errors: ${totals.errors}` : "")
      );
      fetchStatus();
      fetchRecords();
    } catch (e) {
      msg("err", "Network error during promote.");
    } finally {
      setPromoteProgress(p => p ? { ...p, running: false } : null);
      setActionState(p => ({ ...p, [`promote_${promoteState}`]: false }));
    }
  }

  async function applyOutreachSetting(enabled: boolean) {
    setOutreachConfirmOpen(false);
    await fetch("/api/admin/registry/outreach-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "outreach_enabled", value: String(enabled) }),
    });
    msg(enabled ? "err" : "ok", enabled ? "⚠️ Outreach ENABLED." : "Outreach disabled.");
    fetchStatus();
  }

  async function sendTestBatch() {
    setTestBatchRunning(true);
    try {
      const res = await fetch("/api/admin/registry/outreach-test-batch", { method: "POST" });
      const d = await res.json();
      if (res.ok && d.sent !== undefined) {
        msg("ok", `Test batch sent: ${d.sent} delivered, ${d.failed} failed — all routed to test email.`);
      } else {
        msg("err", d.error ?? d.skipped ?? "Test batch failed.");
      }
    } catch {
      msg("err", "Network error — test batch not sent.");
    } finally {
      setTestBatchRunning(false);
      fetchStatus();
    }
  }

  function openOutreachSettings() {
    if (statusData) {
      setOutreachSettingsForm({
        physicalAddress: statusData.outreach.physicalAddress ?? "",
        testEmail: statusData.outreach.testEmail ?? "",
        batchSize: String(statusData.outreach.batchSize ?? 50),
        testMode: statusData.outreach.testMode,
      });
    }
    setOutreachSettingsOpen(true);
  }

  async function saveOutreachSettings() {
    setOutreachSettingsSaving(true);
    try {
      const updates: [string, string][] = [
        ["outreach_physical_address", outreachSettingsForm.physicalAddress.trim()],
        ["outreach_test_email", outreachSettingsForm.testEmail.trim()],
        ["outreach_batch_size", String(Math.max(1, parseInt(outreachSettingsForm.batchSize) || 50))],
        ["outreach_test_mode", String(outreachSettingsForm.testMode)],
      ];
      for (const [key, value] of updates) {
        await fetch("/api/admin/registry/outreach-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
      }
      msg("ok", "Outreach settings saved.");
      setOutreachSettingsOpen(false);
      fetchStatus();
    } catch {
      msg("err", "Failed to save outreach settings.");
    } finally {
      setOutreachSettingsSaving(false);
    }
  }

  const flSummary = statusData?.staging?.find(s => s.source_state === "FL");

  const autoPromoteTotals = statusData?.staging?.reduce(
    (acc, s) => ({
      total: acc.total + (s.total ?? 0),
      pending: acc.pending + (s.pending ?? 0),
      promoted: acc.promoted + (s.promoted ?? 0),
    }),
    { total: 0, pending: 0, promoted: 0 }
  );

  // All-states aggregate for the top stats bar
  const allStatesSummary = statusData?.staging?.reduce(
    (acc, s) => ({
      total:       acc.total       + (s.total       ?? 0),
      pending:     acc.pending     + (s.pending      ?? 0),
      promoted:    acc.promoted    + (s.promoted     ?? 0),
      avg_quality: 0, // recalculated below
    }),
    { total: 0, pending: 0, promoted: 0, avg_quality: 0 }
  );
  if (allStatesSummary && statusData?.staging?.length) {
    const validStates = statusData.staging.filter(s => s.avg_quality > 0);
    allStatesSummary.avg_quality = validStates.length
      ? Math.round((validStates.reduce((a, s) => a + s.avg_quality, 0) / validStates.length) * 10) / 10
      : 0;
  }
  const activeStateCount = statusData?.staging?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-orange-400" />
              <h1 className="text-xl font-black text-white">Registry Import Admin</h1>
            </div>
            <p className="text-slate-400 text-sm">{activeStateCount} states — FL, TX, CA, NV, OH, WA, VA</p>
          </div>
          <button onClick={() => { fetchStatus(); fetchRecords(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Flash message */}
        {message && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${message.type === "ok" ? "bg-green-900/30 border border-green-700 text-green-300" : "bg-red-900/30 border border-red-700 text-red-300"}`}>
            {message.type === "ok" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Stats bar — all states aggregate */}
        {allStatesSummary && allStatesSummary.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Staged", value: allStatesSummary.total?.toLocaleString(), color: "text-white" },
              { label: "Pending Review", value: allStatesSummary.pending?.toLocaleString(), color: "text-blue-400" },
              { label: "Promoted", value: allStatesSummary.promoted?.toLocaleString(), color: "text-green-400" },
              { label: "Avg Quality", value: `${allStatesSummary.avg_quality}/10`, color: "text-orange-400" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value ?? "—"}</p>
                <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Outreach master switch */}
        {statusData && (
          <div className={`rounded-2xl p-4 border-2 mb-6 ${statusData.outreach.enabled ? "border-red-700/60 bg-red-950/20" : "border-slate-700 bg-slate-800/60"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${statusData.outreach.enabled ? "text-red-400" : "text-slate-500"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm">Outreach</p>
                    <StatusBadge status={statusData.outreach.enabled ? "active" : "disabled"} />
                    {statusData.outreach.testMode && <span className="text-[10px] text-yellow-400 font-semibold">TEST MODE</span>}
                  </div>
                  <p className="text-xs text-slate-400">{statusData.outreach.enabled ? "⚠️ Emails will send on next batch run." : "OFF — no emails will send."}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openOutreachSettings} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Settings
                </button>
                <button
                  onClick={sendTestBatch}
                  disabled={testBatchRunning}
                  className="px-3 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {testBatchRunning
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                    : <><Mail className="w-3.5 h-3.5" /> Send Test Batch</>
                  }
                </button>
                {statusData.outreach.enabled ? (
                  <button onClick={() => applyOutreachSetting(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5" /> Disable
                  </button>
                ) : (
                  <button onClick={() => setOutreachConfirmOpen(true)} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Enable Outreach
                  </button>
                )}
              </div>
            </div>

            {statusData.outreach.physicalAddress?.includes("ADDRESS NOT SET") && (
              <div className="mt-3 flex items-start gap-2 bg-orange-950/30 border border-orange-800/50 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-orange-300 leading-relaxed">
                  CAN-SPAM requires a physical mailing address in every outreach email. Set <code className="bg-slate-900 px-1 rounded">outreach_physical_address</code> in <code className="bg-slate-900 px-1 rounded">admin_settings</code> to a real address before enabling outreach.
                </p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs text-slate-400">
              <span>Total sent: <span className="text-green-400 font-semibold">{(statusData.outreach.totalSentToDate ?? 0).toLocaleString()}</span></span>
              <span>Today: <span className="text-green-400 font-semibold">{statusData.outreach.log.sent ?? 0}</span></span>
              <span>Failed: <span className="text-red-400 font-semibold">{statusData.outreach.log.failed ?? 0}</span></span>
              <span>Unsubscribed: <span className="text-slate-300 font-semibold">{statusData.outreach.log.unsubscribed ?? 0}</span></span>
              <span className="text-slate-500">
                Last run: {statusData.outreach.lastRun === "never" ? "never" : toEasternTime(statusData.outreach.lastRun)}
              </span>
            </div>

            {/* Daily ramp progress */}
            {statusData.outreach.dailyCap > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">
                    Day <span className="text-white font-bold">{statusData.outreach.rampDay}</span>
                    <span className="text-slate-600 mx-1">·</span>
                    <span className="text-blue-400 font-semibold">{statusData.outreach.dailyCap.toLocaleString()}/day cap</span>
                    {statusData.outreach.rampDay <= 7 && <span className="ml-1.5 text-slate-500">Phase 1</span>}
                    {statusData.outreach.rampDay > 7 && statusData.outreach.rampDay <= 21 && <span className="ml-1.5 text-slate-500">Phase 2</span>}
                    {statusData.outreach.rampDay > 21 && <span className="ml-1.5 text-slate-500">Full speed</span>}
                  </span>
                  <span className={`font-bold ${statusData.outreach.dailySent >= statusData.outreach.dailyCap ? "text-yellow-400" : "text-white"}`}>
                    {statusData.outreach.dailySent.toLocaleString()}
                    <span className="text-slate-500 font-normal"> / {statusData.outreach.dailyCap.toLocaleString()} today</span>
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${statusData.outreach.dailySent >= statusData.outreach.dailyCap ? "bg-yellow-500" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(100, (statusData.outreach.dailySent / statusData.outreach.dailyCap) * 100)}%` }}
                  />
                </div>
                {statusData.outreach.dailySent >= statusData.outreach.dailyCap && (
                  <p className="text-[11px] text-yellow-400 mt-1">Daily cap reached — resumes at 8:00 PM ET (midnight UTC).</p>
                )}
              </div>
            )}
          </div>
        )}

        {outreachConfirmOpen && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-red-700 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-6 h-6 text-red-400" /><h3 className="text-lg font-black text-white">Enable Outreach?</h3></div>
              <p className="text-slate-300 text-sm mb-2">This will begin queuing emails to unclaimed profile contacts.</p>
              {statusData?.outreach.testMode && <p className="text-yellow-400 text-sm mb-4">Test mode is ON — all emails go to {statusData.outreach.testEmail}</p>}
              <div className="flex gap-3">
                <button onClick={() => setOutreachConfirmOpen(false)} className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition-colors hover:border-slate-400">Cancel</button>
                <button onClick={() => applyOutreachSetting(true)} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors">Confirm Enable</button>
              </div>
            </div>
          </div>
        )}

        {outreachSettingsOpen && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-black text-white">Outreach Settings</h3>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Physical Mailing Address</label>
              <p className="text-[11px] text-slate-500 mb-2">Required by CAN-SPAM. Appears in every outreach email footer.</p>
              <textarea
                value={outreachSettingsForm.physicalAddress}
                onChange={e => setOutreachSettingsForm(f => ({ ...f, physicalAddress: e.target.value }))}
                rows={2}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 mb-4 resize-none"
              />

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Test Email</label>
              <p className="text-[11px] text-slate-500 mb-2">Where emails go when Test Mode is on.</p>
              <input
                type="email"
                value={outreachSettingsForm.testEmail}
                onChange={e => setOutreachSettingsForm(f => ({ ...f, testEmail: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 mb-4"
              />

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">Batch Size (emails / hour)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={outreachSettingsForm.batchSize}
                onChange={e => setOutreachSettingsForm(f => ({ ...f, batchSize: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 mb-4"
              />

              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={outreachSettingsForm.testMode}
                  onChange={e => setOutreachSettingsForm(f => ({ ...f, testMode: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-slate-300">Test Mode (send all emails to test address above)</span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setOutreachSettingsOpen(false)} disabled={outreachSettingsSaving} className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition-colors hover:border-slate-400 disabled:opacity-50">Cancel</button>
                <button onClick={saveOutreachSettings} disabled={outreachSettingsSaving} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {outreachSettingsSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-promote cron status */}
        {autoPromoteTotals && autoPromoteTotals.total > 0 && (
          <div className="rounded-2xl p-4 border border-slate-700 bg-slate-800/60 mb-6">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${autoPromoteTotals.pending > 0 ? "text-blue-400 animate-spin" : "text-green-400"}`} />
                <p className="font-bold text-white text-sm">Auto-Promote</p>
                <StatusBadge status={autoPromoteTotals.pending > 0 ? "running" : "complete"} />
              </div>
              <span className="text-xs text-slate-400">
                {autoPromoteTotals.pending > 0
                  ? `Running every 5 min · 1,000/batch · ${autoPromoteTotals.pending.toLocaleString()} pending`
                  : "All pending records processed — cron stopped"}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: autoPromoteTotals.pending === 0 ? "100%" : `${Math.min(100, (autoPromoteTotals.promoted / (autoPromoteTotals.promoted + autoPromoteTotals.pending)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {autoPromoteTotals.promoted.toLocaleString()} promoted
              {autoPromoteTotals.total > autoPromoteTotals.promoted + autoPromoteTotals.pending
                ? ` · ${(autoPromoteTotals.total - autoPromoteTotals.promoted - autoPromoteTotals.pending).toLocaleString()} flagged/duplicate/skipped`
                : ""}
              {autoPromoteTotals.pending > 0 ? ` · ${autoPromoteTotals.pending.toLocaleString()} pending` : ""}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-1">
          {[
            { key: "records", label: `Records (${allStatesSummary?.total?.toLocaleString() ?? "…"})` },
            { key: "imports", label: `Import Runs (${statusData?.imports?.length ?? 0})` },
            { key: "actions", label: "Actions" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === t.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── RECORDS TAB ────────────────────────────────────────────────────── */}
        {activeTab === "records" && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={recordsFilter.search}
                  onChange={e => setRecordsFilter(p => ({ ...p, search: e.target.value, page: 1 }))}
                  placeholder="Search name, license #, email…"
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <select value={recordsFilter.status} onChange={e => setRecordsFilter(p => ({ ...p, status: e.target.value, page: 1 }))}
                className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="promoted">Promoted</option>
                <option value="duplicate">Duplicate</option>
                <option value="flagged">Flagged</option>
                <option value="error">Error</option>
              </select>
              <select value={recordsFilter.state} onChange={e => setRecordsFilter(p => ({ ...p, state: e.target.value, page: 1 }))}
                className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
                {IMPLEMENTED_STATES.map(s => <option key={s} value={s}>{STATE_NAMES[s]} ({s})</option>)}
              </select>
            </div>

            {/* Records table */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto_auto] gap-0 px-4 py-2.5 border-b border-slate-700 bg-slate-900/60">
                {["Business Name", "License #", "Type", "Location", "Quality", "Source", "Status"].map(h => (
                  <div key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</div>
                ))}
              </div>

              {recordsLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading records…
                </div>
              ) : !recordsData?.records?.length ? (
                <div className="text-center py-16 text-slate-500">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No records match the current filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {recordsData.records.map(rec => (
                    <div key={rec.id}>
                      <button
                        onClick={() => setExpandedRecord(expandedRecord === rec.id ? null : rec.id)}
                        className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto_auto] gap-0 px-4 py-2.5 text-left hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold text-white truncate">{rec.business_name || "—"}</p>
                          {rec.email && <p className="text-[11px] text-slate-500 truncate">{rec.email}</p>}
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-mono text-orange-400 truncate">{rec.license_number || "—"}</p>
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="text-xs text-slate-300 truncate">{rec.license_type || "—"}</p>
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="text-xs text-slate-300 truncate">{[rec.city, rec.state].filter(Boolean).join(", ") || "—"}</p>
                          {rec.phone && <p className="text-[11px] text-slate-500">{rec.phone}</p>}
                        </div>
                        <div className="flex items-center pr-2">
                          <QualityBadge score={rec.quality_score} />
                        </div>
                        <div className="flex items-center pr-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(rec.raw_data as any)?.source_file === "gc" ? "GC" : "CBC"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={rec.status} />
                          <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${expandedRecord === rec.id ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* Expanded detail row */}
                      {expandedRecord === rec.id && (
                        <div className="px-4 pb-4 pt-2 bg-slate-900/40 border-t border-slate-700/50">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {[
                              { label: "License #", value: rec.license_number },
                              { label: "License Type", value: rec.license_type },
                              { label: "City", value: rec.city },
                              { label: "State", value: rec.state },
                              { label: "ZIP", value: (rec.raw_data as any)?.zip },
                              { label: "Phone", value: rec.phone },
                              { label: "Email", value: rec.email },
                              { label: "License Status", value: rec.license_status },
                              { label: "Quality Score", value: `${rec.quality_score}/10` },
                              { label: "Source File", value: (rec.raw_data as any)?.source_file === "gc" ? "General Contractor (CGC)" : "Building Contractor (CBC)" },
                              { label: "Import ID", value: rec.import_id?.slice(0, 8) + "…" },
                              { label: "Staged", value: new Date(rec.created_at).toLocaleDateString() },
                            ].map(f => (
                              <div key={f.label} className="bg-slate-800 rounded-lg px-3 py-2">
                                <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">{f.label}</p>
                                <p className="text-slate-200 font-medium truncate">{f.value || "—"}</p>
                              </div>
                            ))}
                          </div>
                          {rec.duplicate_type && (
                            <div className="mt-2 text-xs text-orange-400 bg-orange-950/30 border border-orange-800/40 rounded-lg px-3 py-2">
                              Duplicate type: {rec.duplicate_type}
                            </div>
                          )}
                          {rec.error_detail && (
                            <div className="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                              Error: {rec.error_detail}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {recordsData && recordsData.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-900/40">
                  <span className="text-xs text-slate-500">
                    Showing {((recordsData.page - 1) * recordsData.limit) + 1}–{Math.min(recordsData.page * recordsData.limit, recordsData.total)} of {recordsData.total.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button disabled={recordsData.page <= 1} onClick={() => setRecordsFilter(p => ({ ...p, page: p.page - 1 }))}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400 px-2">Page {recordsData.page} of {recordsData.pages}</span>
                    <button disabled={recordsData.page >= recordsData.pages} onClick={() => setRecordsFilter(p => ({ ...p, page: p.page + 1 }))}
                      className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── IMPORT RUNS TAB ───────────────────────────────────────────────── */}
        {activeTab === "imports" && (
          <div>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : !statusData?.imports?.length ? (
              <div className="text-center py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-slate-500">No import runs yet.</div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-700/50">
                {statusData.imports.map(run => (
                  <div key={run.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{STATE_NAMES[run.source_state] ?? run.source_state}</span>
                        <StatusBadge status={run.status} />
                        <span className="text-[10px] text-slate-500 uppercase">{run.import_type}</span>
                        {run.robots_blocked && <span className="text-[10px] text-orange-400 font-bold">ROBOTS BLOCKED</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                        <span>Fetched: <span className="text-slate-300">{run.records_fetched?.toLocaleString()}</span></span>
                        <span>Promoted: <span className="text-green-400">{run.records_promoted?.toLocaleString()}</span></span>
                        <span>Dup: <span className="text-slate-400">{run.records_duplicate?.toLocaleString()}</span></span>
                        {run.error_message && <span className="text-red-400 truncate max-w-xs">{run.error_message}</span>}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo(run.started_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIONS TAB ───────────────────────────────────────────────────── */}
        {activeTab === "actions" && (
          <div className="space-y-4">

            {/* Promote */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-green-400" /> Promote to Live Directory
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Runs duplicate detection and quality scoring (min 6/10) in batches of 500. Processes all pending records automatically.
                {flSummary && flSummary.pending > 0 && (
                  <span className="text-blue-400 ml-1">{flSummary.pending.toLocaleString()} records ready.</span>
                )}
              </p>
              <div className="flex items-center gap-3 mb-4">
                <select value={promoteState} onChange={e => setPromoteState(e.target.value)}
                  disabled={!!promoteProgress?.running}
                  className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 disabled:opacity-50">
                  {IMPLEMENTED_STATES.map(s => <option key={s} value={s}>{STATE_NAMES[s]} ({s})</option>)}
                </select>
                <button onClick={promoteRecords} disabled={!!promoteProgress?.running}
                  className="flex items-center gap-1.5 px-5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                  {promoteProgress?.running
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Promoting…</>
                    : <><ChevronRight className="w-4 h-4" /> Promote All Records</>
                  }
                </button>
              </div>

              {/* Progress bar */}
              {promoteProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {promoteProgress.running ? "Promoting…" : "Complete"}
                      {promoteProgress.total > 0 && (
                        <span className="ml-1 text-white font-semibold">
                          {Math.min(promoteProgress.processed, promoteProgress.total).toLocaleString()} / {promoteProgress.total.toLocaleString()}
                        </span>
                      )}
                    </span>
                    {promoteProgress.total > 0 && (
                      <span className="text-slate-500">
                        {Math.round((Math.min(promoteProgress.processed, promoteProgress.total) / promoteProgress.total) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${promoteProgress.running ? "bg-green-500" : "bg-green-400"}`}
                      style={{ width: promoteProgress.total > 0 ? `${Math.min(100, Math.round((promoteProgress.processed / promoteProgress.total) * 100))}%` : "0%" }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs pt-1">
                    <span className="text-green-400">✓ Promoted: <span className="font-bold">{promoteProgress.promoted.toLocaleString()}</span></span>
                    <span className="text-slate-400">Dup: <span className="font-bold">{promoteProgress.duplicate.toLocaleString()}</span></span>
                    <span className="text-yellow-400">Flagged: <span className="font-bold">{promoteProgress.flagged.toLocaleString()}</span></span>
                    {promoteProgress.errors > 0 && (
                      <span className="text-red-400">Errors: <span className="font-bold">{promoteProgress.errors.toLocaleString()}</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CSV Upload */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> CSV Upload
              </h2>
              <p className="text-xs text-slate-400 mb-4">Upload a DBPR export CSV directly.</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <select value={csvState} onChange={e => setCsvState(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    {IMPLEMENTED_STATES.map(s => <option key={s} value={s}>{STATE_NAMES[s]}</option>)}
                  </select>
                  <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                    className="flex-1 text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-200 file:text-xs file:font-semibold hover:file:bg-slate-600" />
                </div>
                <button onClick={uploadCSV} disabled={!csvFile || actionState.csv_upload}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                  {actionState.csv_upload ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Upload & Stage
                </button>
              </div>
            </div>

            {/* Scrape trigger */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-400" /> Run Scraper
              </h2>
              <p className="text-xs text-slate-400 mb-4">Attempt live scrape from DBPR. Checks robots.txt first.</p>
              <div className="space-y-2">
                {IMPLEMENTED_STATES.map(state => (
                  <div key={state} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{STATE_NAMES[state]} ({state})</span>
                    <button onClick={() => triggerScrape(state)} disabled={actionState[`scrape_${state}`]}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
                      {actionState[`scrape_${state}`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Run Scraper
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
