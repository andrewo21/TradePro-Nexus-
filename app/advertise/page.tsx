"use client";

import { useState } from "react";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const PLACEMENTS = [
  { name: "Left Rail", desc: "Desktop only — fixed position beside the feed", size: "160×600px", rate: "Flat monthly rate" },
  { name: "Right Rail", desc: "Desktop only — mirrored right side of feed", size: "160×600px", rate: "Flat monthly rate" },
  { name: "In-Feed Sponsored Card", desc: "Appears every 5–6 posts in the live feed, mobile and desktop", size: "Full feed width", rate: "CPM or flat weekly rate" },
  { name: "Premium In-Feed Position", desc: "First sponsored card — highest visibility placement", size: "Full feed width", rate: "Premium rate" },
];

const NATURAL_ADVERTISERS = [
  "Supply houses & material distributors",
  "Tool manufacturers",
  "Safety equipment companies",
  "Insurance providers",
  "Bonding companies",
  "Equipment rental companies",
];

const AD_STANDARDS = [
  "Same card design language as feed posts",
  "Dark navy palette, clean typography — no bright colors",
  'No flashing animations, no aggressive CTAs, no "CLICK NOW"',
  'Clearly labeled "Sponsored" — never disguised as content',
  "Verified badge never appears on ad cards",
  "Sponsored cards never appear in contractor search results",
  "TradePro Nexus reserves the right to reject non-compliant creative",
  "Advertiser guidelines document required before placement purchase",
];

export default function AdvertisePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch("/api/advertise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, company, message }),
    });
    setSubmitted(true);
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20">

        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Advertising</p>
          <h1 className="text-3xl font-black text-white mb-3">Reach the Construction Industry</h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Verified Trade Pros and GC decision-makers — checking jobsite updates, finding crews, building their reputation.
            Your brand in the feed they actually use.
          </p>
        </div>

        {/* Placements */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {PLACEMENTS.map(p => (
            <div key={p.name} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="font-black text-white mb-1">{p.name}</h3>
              <p className="text-slate-400 text-sm mb-3">{p.desc}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">{p.size}</span>
                <span className="text-orange-400 font-semibold">{p.rate}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Natural advertisers */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Who Belongs Here</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {NATURAL_ADVERTISERS.map(a => (
              <div key={a} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {a}
              </div>
            ))}
          </div>
        </div>

        {/* Ad standards */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Ad Standards — Elegant Only</h2>
          <div className="space-y-2">
            {AD_STANDARDS.map(s => (
              <div key={s} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" /> {s}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/advertise/guidelines" className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors">
              View full advertiser guidelines <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-black text-white mb-1">Get Rates & Media Kit</h2>
          <p className="text-slate-400 text-sm mb-6">We'll send placement rates, audience stats, and ad specs within one business day.</p>

          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="font-bold text-white mb-1">Got it — we'll be in touch.</p>
              <p className="text-slate-400 text-sm">Expect a response within one business day.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Your Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="Marcus Thompson" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Company / Brand</label>
                <input value={company} onChange={e => setCompany(e.target.value)} required placeholder="Your company name" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Tell Us About Your Campaign</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Which placements interest you? Target audience, budget range, campaign goals…" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send Inquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
