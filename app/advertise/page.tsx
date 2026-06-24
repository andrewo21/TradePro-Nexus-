"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, Loader2, Users, Map, Zap, Shield, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const TRADES = [
  "Electrical", "Plumbing", "HVAC", "Carpentry",
  "Roofing", "Structural Steel", "Mechanical", "Concrete",
  "Masonry", "Painting", "Fire Suppression", "Civil",
];

const TIERS = [
  {
    name: "Local Spotlight",
    price: "$500",
    period: "/month",
    description: "Featured placement in directory for one state. Best for regional suppliers and distributors.",
    features: [
      "Featured placement in directory for one state",
      "Logo on category pages",
      "Direct link to your website",
    ],
    bestFor: "Regional suppliers and distributors",
    cta: "Contact Us to Advertise",
    highlight: false,
  },
  {
    name: "Regional Partner",
    price: "$1,000",
    period: "/month",
    description: "Multi-state reach with feed exposure. Best for regional tool and material suppliers.",
    features: [
      "Featured placement across 3 states",
      "Logo on homepage sidebar",
      "Sponsored post in Live Feed once per week",
    ],
    bestFor: "Regional tool and material suppliers",
    cta: "Contact Us to Advertise",
    highlight: false,
  },
  {
    name: "National Brand",
    price: "$2,500",
    period: "/month",
    description: "Full network reach with premium feed visibility and reporting.",
    features: [
      "Featured placement across all 12 states",
      "Logo on homepage and search pages",
      "Sponsored posts in Live Feed twice per week",
      "Monthly performance report",
    ],
    bestFor: "National brands — Ferguson, Milwaukee, Procore, Fastenal",
    cta: "Contact Us to Advertise",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: " pricing",
    description: "Everything in National Brand plus co-branded content and direct integration support.",
    features: [
      "Everything in National Brand",
      "Custom integrations and co-branded content",
      "Priority placement across all pages",
      "Direct sales contact",
    ],
    bestFor: "ConstructConnect, Procore, Buildertrend",
    cta: "Contact Us to Advertise",
    highlight: false,
  },
];

const AD_STANDARDS = [
  "Same card design language as feed posts — no jarring banner ads",
  'Clearly labeled "Sponsored" — never disguised as organic content',
  "Verified Pro badge never appears on ad cards",
  "Sponsored cards never appear in contractor search results",
  "TradePro Nexus reserves the right to reject non-compliant creative",
  "Advertiser guidelines required before placement",
];

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  return n.toLocaleString();
}

export default function AdvertisePage() {
  const [directoryCount, setDirectoryCount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => setDirectoryCount(d.directoryListings ?? null))
      .catch(() => {});
  }, []);

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

  const displayCount = directoryCount !== null
    ? formatNumber(directoryCount)
    : "422K+";

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-20">

        {/* Hero */}
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-3">Advertising</p>
          <h1 className="text-4xl font-black text-white mb-4 leading-tight">
            Reach Verified Construction Professionals
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            TradePro Nexus connects your brand with {displayCount} licensed contractors, GCs,
            and trade professionals across 12 states.
          </p>
        </div>

        {/* Audience stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
          {[
            {
              icon: Users,
              value: displayCount,
              label: "Licensed Contractors",
              sub: "In the directory",
              color: "text-orange-400",
            },
            {
              icon: Map,
              value: "12",
              label: "States Covered",
              sub: "FL, TX, CA, NV, OH, WA + more",
              color: "text-blue-400",
            },
            {
              icon: Zap,
              value: "Available",
              label: "For Work Members",
              sub: "Actively seeking opportunities",
              color: "text-green-400",
            },
            {
              icon: Shield,
              value: "Union + Non-Union",
              label: "Professionals",
              sub: "IBEW, UA, Carpenters and more",
              color: "text-slate-300",
            },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className={`text-xl font-black ${stat.color} leading-tight mb-0.5`}>{stat.value}</p>
                <p className="text-white text-xs font-bold">{stat.label}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{stat.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Trades covered */}
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Trades in the Directory</p>
          <div className="flex flex-wrap gap-2">
            {TRADES.map(t => (
              <span key={t} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Advertising Tiers</p>
          <h2 className="text-2xl font-black text-white mb-6">Choose Your Reach</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-6 border ${
                  tier.highlight
                    ? "bg-orange-950/30 border-orange-700/60"
                    : "bg-slate-800/60 border-slate-700/50"
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-4 text-[10px] font-black text-white bg-orange-600 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Most Popular
                  </span>
                )}
                <div className="mb-4">
                  <p className="font-black text-white text-lg">{tier.name}</p>
                  <div className="flex items-baseline gap-0.5 mt-1">
                    <span className={`text-2xl font-black ${tier.highlight ? "text-orange-400" : "text-white"}`}>
                      {tier.price}
                    </span>
                    <span className="text-slate-400 text-sm">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <p className="text-[11px] text-slate-500 mb-4">Best for: {tier.bestFor}</p>

                <a
                  href={`mailto:andrew@tradepronexus.com?subject=${encodeURIComponent(`Advertising Inquiry — ${tier.name}`)}`}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    tier.highlight
                      ? "bg-orange-600 hover:bg-orange-500 text-white"
                      : "bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white"
                  }`}
                >
                  {tier.cta} <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Who belongs here */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Who Belongs Here</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              "Supply houses and material distributors",
              "Tool manufacturers and rental companies",
              "Safety equipment companies",
              "Insurance and bonding providers",
              "Payroll and HR software for contractors",
              "Workforce management platforms",
            ].map(a => (
              <div key={a} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> {a}
              </div>
            ))}
          </div>
        </div>

        {/* Ad standards */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Ad Standards</h2>
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
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6" id="contact">
          <h2 className="text-xl font-black text-white mb-1">Get Rates and Media Kit</h2>
          <p className="text-slate-400 text-sm mb-6">
            We'll send placement rates, audience stats, and ad specs within one business day.
          </p>

          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="font-bold text-white mb-1">Got it. We will be in touch.</p>
              <p className="text-slate-400 text-sm">Expect a response within one business day.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Your Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="Marcus Thompson"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Company or Brand</label>
                <input value={company} onChange={e => setCompany(e.target.value)} required placeholder="Your company name"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Tell Us About Your Campaign</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                  placeholder="Which tier interests you? Target audience, budget range, campaign goals."
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
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
