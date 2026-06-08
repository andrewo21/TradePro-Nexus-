"use client";

import { useState } from "react";
import { Loader2, Rss, Play, CheckCircle } from "lucide-react";

interface Props {
  initialEnabled: boolean;
  lastRun: string;
  lastCount: string;
}

export default function NewsFeedAdmin({ initialEnabled, lastRun, lastCount }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  async function toggleEnabled() {
    setSaving(true);
    const next = !enabled;
    try {
      await fetch("/api/admin/news/trigger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      setEnabled(next);
    } catch {}
    setSaving(false);
  }

  async function triggerNow() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/admin/news/trigger", { method: "POST" });
      const data = await res.json();
      if (data.skipped) {
        setTriggerResult(`Skipped: ${data.skipped}`);
      } else {
        setTriggerResult(`Done — ${data.posted ?? 0} new article${data.posted !== 1 ? "s" : ""} posted`);
      }
    } catch {
      setTriggerResult("Error triggering fetch.");
    }
    setTriggering(false);
  }

  function formatLastRun(val: string) {
    if (!val || val === "never") return "Never run";
    try {
      return new Date(val).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
    } catch { return val; }
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Rss className="w-4 h-4 text-orange-400" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Industry News Feed</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-white">{lastCount === "0" ? "—" : lastCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Last Run Posts</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center col-span-2">
          <p className="text-sm font-bold text-white">{formatLastRun(lastRun)}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Last Run</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Enable/disable toggle */}
        <div className="flex items-center justify-between flex-1 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
          <div>
            <p className="text-white font-bold text-sm">Auto-fetch every 6 hours</p>
            <p className="text-slate-500 text-xs">12 RSS sources · 3 articles max per source</p>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={saving}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full border-2 transition-all duration-200 ${enabled ? "bg-green-500 border-green-400" : "bg-slate-700 border-slate-600"} disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white absolute top-0.5 right-0.5" />
            ) : (
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${enabled ? "left-6" : "left-0.5"}`} />
            )}
          </button>
        </div>

        {/* Trigger now */}
        <button
          onClick={triggerNow}
          disabled={triggering}
          className="flex items-center gap-1.5 px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0"
        >
          {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {triggering ? "Fetching…" : "Run Now"}
        </button>
      </div>

      {triggerResult && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-400 bg-green-950/30 border border-green-900/50 rounded-xl px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {triggerResult}
        </div>
      )}
    </div>
  );
}
