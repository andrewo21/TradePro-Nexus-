"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Gift, CheckCircle2, Circle, Share2 } from "lucide-react";

type Status = {
  referralCode: string | null;
  referralLink: string | null;
  referralCount: number;
  hasPost: boolean;
  qualified: boolean;
  enteredAt: string | null;
  remaining: string[];
};

export default function RaffleStatus() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/raffle/status");
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch("/api/raffle/config")
      .then(res => res.ok ? res.json() : null)
      .then(data => setActive(!!data?.active))
      .catch(() => {});
  }, []);

  useEffect(() => { if (active) fetchStatus(); }, [active, fetchStatus]);

  if (!active || !status || !status.referralLink) return null;

  function copyLink() {
    if (!status?.referralLink) return;
    navigator.clipboard.writeText(status.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function shareLink() {
    if (!status?.referralLink) return;
    const shareText = "Join me on TradePro Nexus and I get an entry in the Milwaukee M18 raffle. Sign up free:";
    if (navigator.share) {
      navigator.share({ title: "TradePro Nexus", text: shareText, url: status.referralLink }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-orange-400" /> Milwaukee M18 Raffle
        </h2>
        {status.qualified ? (
          <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full">
            Entered
          </span>
        ) : (
          <span className="text-xs font-bold text-slate-400 bg-slate-900/40 border border-slate-700/40 px-2 py-0.5 rounded-full">
            Not Yet Qualified
          </span>
        )}
      </div>

      {status.qualified && (
        <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-green-400 mb-1">You are entered to win.</p>
          <p className="text-xs text-slate-400">Drawing August 1st. We will email the winner directly.</p>
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-slate-300">Signed up</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status.hasPost ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />}
          <span className={status.hasPost ? "text-slate-300" : "text-slate-500"}>Posted once on the Live Feed</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status.referralCount >= 2 ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />}
          <span className={status.referralCount >= 2 ? "text-slate-300" : "text-slate-500"}>Referred 2 friends ({Math.min(status.referralCount, 2)}/2)</span>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your referral link</p>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mb-3">
        <div className="w-full sm:flex-1 sm:min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate">
          {status.referralLink}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={copyLink}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              copied
                ? "bg-green-700/30 border-green-700/50 text-green-400"
                : "bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            }`}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
          </button>
          <button
            onClick={shareLink}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Share your link with 2 friends. When they sign up you get credit toward the raffle.
      </p>
    </div>
  );
}
