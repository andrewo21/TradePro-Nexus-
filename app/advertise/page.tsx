"use client";

import { useState } from "react";
import {
  Users, MapPin, CheckCircle, Loader2, Zap,
  Shield, HardHat, Megaphone, LayoutGrid, Rss,
  Search, CreditCard, Briefcase
} from "lucide-react";
import Navbar from "@/components/Navbar";

const TRADES = [
  "Electrical", "Plumbing", "HVAC", "Carpentry", "Roofing",
  "Structural Steel", "Mechanical", "Concrete", "Masonry",
  "Painting", "Fire Suppression", "Civil", "Drywall", "Flooring",
  "Glazing", "Millwork", "Tile", "Waterproofing",
];

const AUDIENCE_STATS = [
  {
    icon: Users,
    value: "796,365",
    label: "Licensed Contractors",
    sub: "Verified from state licensing boards",
    color: "text-orange-400",
    bg: "bg-orange-600/10",
    border: "border-orange-600/20",
  },
  {
    icon: MapPin,
    value: "15 States",
    label: "and Growing",
    sub: "FL, CA, TX, VA, WA, MN, OR, NV, OH, CO, CT, IL, NJ, NY and more",
    color: "text-blue-400",
    bg: "bg-blue-600/10",
    border: "border-blue-600/20",
  },
  {
    icon: Zap,
    value: "Daily Active",
    label: "Engaged Audience",
    sub: "Live Feed, job search, and profile views every day",
    color: "text-green-400",
    bg: "bg-green-600/10",
    border: "border-green-600/20",
  },
  {
    icon: Shield,
    value: "Union + Non",
    label: "Union Professionals",
    sub: "IBEW, UA, Carpenters, Ironworkers, Pipefitters and more",
    color: "text-purple-400",
    bg: "bg-purple-600/10",
    border: "border-purple-600/20",
  },
];

const WHO_BELONGS = [
  "Tool manufacturers and equipment rental companies",
  "Supply houses and material distributors",
  "Safety and PPE equipment brands",
  "Insurance and bonding providers",
  "Payroll and HR software for contractors",
  "Workforce and project management platforms",
  "Staffing and labor agencies",
  "Building products and hardware suppliers",
];

const PLACEMENT_ZONES = [
  {
    icon: Rss,
    name: "Live Feed",
    location: "In-feed sponsored card, every 5 posts",
    audience: "Most engaged users -- contractors posting daily updates from the field",
    format: "Full-width card, labeled Sponsored",
    color: "text-orange-400",
    bg: "bg-orange-600/10",
    border: "border-orange-600/20",
  },
  {
    icon: Search,
    name: "Search Results",
    location: "Banner above the contractor results grid",
    audience: "GCs actively looking to hire subs and specialty contractors",
    format: "Leaderboard banner, 100% viewable before scroll",
    color: "text-blue-400",
    bg: "bg-blue-600/10",
    border: "border-blue-600/20",
  },
  {
    icon: CreditCard,
    name: "Trade Card Profiles",
    location: "Banner above every contractor profile",
    audience: "GCs reviewing individual contractor credentials at the decision moment",
    format: "Full-width banner, shown before the profile content loads",
    color: "text-green-400",
    bg: "bg-green-600/10",
    border: "border-green-600/20",
  },
  {
    icon: Briefcase,
    name: "Find Crews",
    location: "Above the fold on the work opportunities page",
    audience: "GCs sourcing labor for active projects -- highest buyer intent on the platform",
    format: "Prominent card, first thing a GC sees when hiring",
    color: "text-purple-400",
    bg: "bg-purple-600/10",
    border: "border-purple-600/20",
  },
  {
    icon: LayoutGrid,
    name: "Homepage",
    location: "Fixed right sidebar on desktop",
    audience: "Every new visitor -- contractors and GCs entering the platform for the first time",
    format: "192px rail, persistent across the full page",
    color: "text-amber-400",
    bg: "bg-amber-600/10",
    border: "border-amber-600/20",
  },
  {
    icon: Megaphone,
    name: "Feed Sidebar",
    location: "Right sidebar on the Live Feed",
    audience: "Daily active contractors -- the most engaged segment on the platform",
    format: "272px card, sticky while users scroll the feed",
    color: "text-cyan-400",
    bg: "bg-cyan-600/10",
    border: "border-cyan-600/20",
  },
];

const AD_STANDARDS = [
  "Clearly labeled Sponsored -- never disguised as organic content",
  "Same card design language as the rest of the platform",
  "Verified Pro badge never appears on ad content",
  "Sponsor placements never appear inside contractor search results",
  "TradePro Nexus reserves the right to reject non-compliant creative",
];

export default function AdvertisePage() {
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", what_you_sell: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/advertise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Email us at andrew@tradepronexus.com.");
      }
    } catch {
      setError("Something went wrong. Email us at andrew@tradepronexus.com.");
    } finally {
      setSending(false);
    }
  }

  const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors";
  const labelCls = "block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5";

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-4">
            Founding Sponsor Opportunities
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
            Put Your Brand in Front of<br className="hidden sm:block" />
            <span className="text-orange-400"> 796,365 Licensed Contractors.</span>
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed max-w-2xl">
            TradePro Nexus is the only verified marketplace built exclusively
            for construction trade professionals.
          </p>
          <div className="mt-8">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors text-base"
            >
              Request Sponsorship Info
            </a>
          </div>
        </div>
      </section>

      {/* ── AUDIENCE STATS ───────────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-8">
            The Audience
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCE_STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-5`}>
                  <Icon className={`w-5 h-5 ${stat.color} mb-3`} />
                  <p className={`text-2xl font-black ${stat.color} leading-tight mb-0.5`}>
                    {stat.value}
                  </p>
                  <p className="text-white text-sm font-bold mb-1">{stat.label}</p>
                  <p className="text-slate-500 text-xs leading-snug">{stat.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRADES ───────────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">
            Trades in the Directory
          </p>
          <div className="flex flex-wrap gap-2">
            {TRADES.map(t => (
              <span
                key={t}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-full"
              >
                <HardHat className="w-3 h-3 text-orange-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLACEMENT ZONES ──────────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Placement Zones
          </p>
          <h2 className="text-2xl font-black text-white mb-2">
            Six placements. Six moments that matter.
          </h2>
          <p className="text-slate-400 text-sm mb-8 max-w-xl">
            Every placement is live on the platform today. Founding sponsors
            get category exclusivity while slots are available.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {PLACEMENT_ZONES.map(zone => {
              const Icon = zone.icon;
              return (
                <div
                  key={zone.name}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-colors"
                >
                  {/* Visual zone mockup */}
                  <div className={`${zone.bg} border ${zone.border} rounded-xl px-4 py-3 mb-4 flex items-center gap-3`}>
                    <Icon className={`w-4 h-4 ${zone.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="h-2 bg-slate-600/60 rounded-full w-3/4 mb-1.5" />
                      <div className="h-1.5 bg-slate-700/60 rounded-full w-1/2" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                      Sponsored
                    </span>
                  </div>

                  <p className={`text-xs font-bold uppercase tracking-widest ${zone.color} mb-1`}>
                    {zone.name}
                  </p>
                  <p className="text-white font-black text-sm mb-3">{zone.location}</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-300 font-semibold">Audience: </span>
                      {zone.audience}
                    </p>
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-300 font-semibold">Format: </span>
                      {zone.format}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHO BELONGS HERE ─────────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Who Belongs Here
          </p>
          <h2 className="text-2xl font-black text-white mb-6">
            Built for brands that sell to the trades.
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {WHO_BELONGS.map(item => (
              <div
                key={item}
                className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3"
              >
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-slate-300 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AD STANDARDS ─────────────────────────────────────────────────────── */}
      <section className="py-12 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Ad Standards
            </p>
            <div className="space-y-2.5">
              {AD_STANDARDS.map(s => (
                <div key={s} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 border-t border-slate-800" id="contact">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">
            Get in Touch
          </p>
          <h2 className="text-3xl font-black text-white mb-2">
            Request Sponsorship Info
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            We will send placement details, audience data, and availability
            within one business day.
          </p>

          {submitted ? (
            <div className="bg-green-950/40 border border-green-800/50 rounded-2xl p-10 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="font-black text-white text-xl mb-2">Got it. We will be in touch.</p>
              <p className="text-slate-400 text-sm">
                Expect a response within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    required
                    placeholder="Your name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Company</label>
                  <input
                    value={form.company}
                    onChange={e => set("company", e.target.value)}
                    required
                    placeholder="Your company"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    required
                    placeholder="you@company.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set("phone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>What do you sell?</label>
                <textarea
                  value={form.what_you_sell}
                  onChange={e => set("what_you_sell", e.target.value)}
                  rows={3}
                  placeholder="Tools, materials, software, safety gear, insurance, staffing..."
                  className={`${inputCls} resize-none`}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Request Sponsorship Info
              </button>

              <p className="text-center text-slate-500 text-xs">
                Or email us directly:{" "}
                <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300">
                  andrew@tradepronexus.com
                </a>
              </p>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}
