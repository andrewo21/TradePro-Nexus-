"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Share2, Mail, MessageSquare } from "lucide-react";

const SITE_URL = "https://www.tradepronexus.com";

const TIERS = [
  { min: 1,  max: 2,  discount: 10,  label: "10% off verification" },
  { min: 3,  max: 9,  discount: 20,  label: "20% off verification" },
  { min: 10, max: Infinity, discount: 100, label: "Free verification ($99 value)" },
];

function getDiscount(count: number): number {
  if (count >= 10) return 100;
  if (count >= 3)  return 20;
  if (count >= 1)  return 10;
  return 0;
}

function getTierLabel(count: number): string {
  if (count >= 10) return "Free verification — $99 value";
  if (count >= 3)  return "20% off verification";
  if (count >= 1)  return "10% off verification";
  return "No reward yet — refer 1 person to unlock 10% off";
}

function getNextTier(count: number): { needed: number; reward: string } | null {
  if (count >= 10) return null;
  if (count >= 3)  return { needed: 10 - count, reward: "free verification ($99 value)" };
  if (count >= 1)  return { needed: 3 - count, reward: "20% off verification" };
  return { needed: 1 - count, reward: "10% off verification" };
}

function progressPct(count: number): number {
  if (count >= 10) return 100;
  if (count >= 3)  return 30 + ((count - 3) / 7) * 60;
  if (count >= 1)  return 10 + ((count - 1) / 2) * 20;
  return 0;
}

export default function ReferralDashboard({ userId, initialDiscount }: {
  userId: string;
  initialDiscount: number;
}) {
  const referralLink = `${SITE_URL}/signup?ref=${userId}`;
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/referral/stats");
      if (res.ok) {
        const d = await res.json();
        setCount(d.referralCount ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const referralCount = count ?? 0;
  const discount = count !== null ? getDiscount(referralCount) : initialDiscount;
  const nextTier = getNextTier(referralCount);

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const shareText = `I'm on TradePro Nexus — the directory for licensed contractors. Join free: ${referralLink}`;

  function shareViaText() {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank");
  }

  function shareViaEmail() {
    window.open(`mailto:?subject=${encodeURIComponent("Join me on TradePro Nexus — free contractor directory")}&body=${encodeURIComponent(shareText)}`, "_blank");
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({ title: "TradePro Nexus", text: shareText, url: referralLink }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Refer and Earn</h2>
        {discount > 0 && (
          <span className="text-xs font-bold text-orange-400 bg-orange-900/30 border border-orange-800/40 px-2 py-0.5 rounded-full">
            {discount}% earned
          </span>
        )}
      </div>

      {/* Current reward */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Current reward</p>
        <p className={`text-sm font-bold ${discount > 0 ? "text-orange-400" : "text-slate-400"}`}>
          {getTierLabel(referralCount)}
        </p>
        {discount === 0 && (
          <p className="text-xs text-slate-600 mt-1">
            Your discount will apply automatically when verification launches.
          </p>
        )}
        {discount > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            Applied automatically at verification checkout when it launches.
          </p>
        )}
      </div>

      {/* Referral count + progress bar */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-white font-black text-2xl">{count !== null ? referralCount : "—"}</span>
          <span className="text-xs text-slate-400">
            {referralCount === 1 ? "person referred" : "people referred"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-1.5">
          <div
            className="h-2 rounded-full bg-orange-500 transition-all duration-500"
            style={{ width: `${Math.min(progressPct(referralCount), 100)}%` }}
          />
        </div>

        {/* Tier markers */}
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>0</span>
          <span className={referralCount >= 1 ? "text-orange-400 font-semibold" : ""}>1 — 10%</span>
          <span className={referralCount >= 3 ? "text-orange-400 font-semibold" : ""}>3 — 20%</span>
          <span className={referralCount >= 10 ? "text-orange-400 font-semibold" : ""}>10 — Free</span>
        </div>
      </div>

      {/* Next tier callout */}
      {nextTier && count !== null && (
        <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl px-3 py-2.5 mb-4">
          <p className="text-xs text-orange-300 font-semibold">
            Refer {nextTier.needed} more {nextTier.needed === 1 ? "person" : "people"} to earn {nextTier.reward}
          </p>
        </div>
      )}

      {/* Tier breakdown */}
      <div className="space-y-1.5 mb-4">
        {TIERS.map(tier => {
          const active = referralCount >= tier.min;
          return (
            <div key={tier.min} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg ${active ? "bg-orange-900/20 border border-orange-800/30" : "bg-slate-900/40 border border-slate-700/30"}`}>
              <span className={active ? "text-orange-300 font-semibold" : "text-slate-500"}>
                {tier.min === 10 ? "10+" : `${tier.min}${tier.max < Infinity ? `–${tier.max}` : "+"}`} referrals
              </span>
              <span className={active ? "text-orange-400 font-bold" : "text-slate-600"}>{tier.label}</span>
            </div>
          );
        })}
      </div>

      {/* Referral link */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your referral link</p>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate">
          {referralLink}
        </div>
        <button
          onClick={copyLink}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex-shrink-0 ${
            copied
              ? "bg-green-700/30 border-green-700/50 text-green-400"
              : "bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          }`}
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <button onClick={shareViaText} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition-colors">
          <MessageSquare className="w-3.5 h-3.5" /> Text
        </button>
        <button onClick={shareViaEmail} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition-colors">
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
        <button onClick={shareNative} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>
    </div>
  );
}
