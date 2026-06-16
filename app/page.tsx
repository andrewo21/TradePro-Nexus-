"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Search, Zap, HardHat, Building2, CheckCircle,
  Star, MapPin, Clock, ArrowRight, Wrench, Hammer,
  Bolt, Flame, Wind, ChevronRight, Rss
} from "lucide-react";
import Navbar from "@/components/Navbar";
import WaitlistForm from "@/components/WaitlistForm";
import { SOCIAL_LINKS } from "@/lib/social";
import { LinkedinIcon, FacebookIcon, InstagramIcon } from "@/components/SocialIcons";
import { getSupabase } from "@/lib/supabase";
import { canBeVerified } from "@/lib/constants";

// ── Live Feed Preview ─────────────────────────────────────────────────────────

interface LiveFeedItem {
  id: string;
  name: string;
  project: string;
  url: string | null;
  time: string;
  color: "orange" | "blue";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}


const TRADES = [
  { icon: Bolt, label: "Electrical" },
  { icon: Flame, label: "Plumbing" },
  { icon: Wind, label: "HVAC" },
  { icon: Hammer, label: "Carpentry" },
  { icon: Wrench, label: "Mechanical" },
  { icon: HardHat, label: "Civil / Site" },
];

const SECTORS = [
  "Senior Living",
  "Healthcare",
  "Federal / Gov't",
  "Multifamily",
  "Industrial",
  "K-12 Education",
  "Mixed-Use",
  "Data Centers",
];

// ── Component ──────────────────────────────────────────────────────────────────

interface AvailablePro {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  trade: string;
  location_city: string | null;
  location_state: string | null;
  verification_status: string;
  profile_type: string | null;
}

export default function LandingPage() {
  const [availablePros, setAvailablePros] = useState<AvailablePro[]>([]);
  const [liveFeedItems, setLiveFeedItems] = useState<LiveFeedItem[]>([]);
  const [liveFeedLoading, setLiveFeedLoading] = useState(true);

  useEffect(() => {
    const db = getSupabase() as any;
    db.from("feed_posts")
      .select("id, project_name, news_source_name, news_article_url, created_at")
      .eq("is_industry_news", true)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }: { data: any[] | null }) => {
        // Take the latest item from each distinct source, then randomly
        // sample 5 — so the preview rotates across all sources over time
        // instead of always showing the same handful.
        const seenSources = new Set<string>();
        const latestPerSource: any[] = [];
        for (const row of data ?? []) {
          const source = row.news_source_name ?? "Industry News";
          if (seenSources.has(source)) continue;
          seenSources.add(source);
          latestPerSource.push(row);
        }

        for (let i = latestPerSource.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [latestPerSource[i], latestPerSource[j]] = [latestPerSource[j], latestPerSource[i]];
        }
        const diverse = latestPerSource.slice(0, 5);

        const items: LiveFeedItem[] = diverse.map((row, i) => ({
          id: row.id,
          name: row.news_source_name ?? "Industry News",
          project: row.project_name ?? "",
          url: row.news_article_url ?? null,
          time: timeAgo(row.created_at),
          color: i % 2 === 0 ? "orange" : "blue",
        }));
        setLiveFeedItems(items);
      })
      .catch(() => {})
      .finally(() => setLiveFeedLoading(false));
  }, []);

  useEffect(() => {
    const db = getSupabase() as any;
    db.from("profiles")
      .select("id, slug, first_name, last_name, trade, location_city, location_state, verification_status, profile_type")
      .eq("availability_status", "available")
      .limit(6)
      .then(({ data }: { data: AvailablePro[] | null }) => {
        if (data?.length) setAvailablePros(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 overflow-hidden">

        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(234,88,12,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(234,88,12,0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-[#0f172a]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12 md:pt-28 md:pb-20">

          {/* Enterprise badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-950/60 border border-orange-800/50 text-orange-400 text-xs font-semibold rounded-full tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              TradePro Enterprises · Verified Marketplace
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-center max-w-4xl mx-auto mb-6"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-4">
              <span className="text-white">The Command Center for</span>
              <br />
              <span className="text-orange-500">Construction Hiring.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Verified bonding. Verified payroll. Verified talent. Connect the right crews
              to the right projects. In seconds, not weeks.
            </p>
          </motion.div>

          {/* Waitlist form — primary CTA */}
          <motion.div
            id="waitlist"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="max-w-md mx-auto mb-6"
          >
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
              <Suspense fallback={null}>
                <WaitlistForm />
              </Suspense>
            </div>
          </motion.div>

          {/* Secondary links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex items-center justify-center gap-4 text-xs text-slate-500 mb-10"
          >
            <Link href="/build" className="hover:text-orange-400 transition-colors flex items-center gap-1">
              <HardHat className="w-3.5 h-3.5" /> Build Trade Card
            </Link>
            <span>·</span>
            <Link href="/search" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Find Crews
            </Link>
            <span>·</span>
            <Link href="/feed" className="hover:text-slate-300 transition-colors">
              Live Feed
            </Link>
          </motion.div>

        </div>
      </section>

      {/* ── LIVE FEED ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-green-400">Live Feed</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">Work is Currency.</h2>
              <p className="text-slate-400 text-sm mt-1">Real progress from the field, updated continuously.</p>
            </div>
            <Link
              href="/feed"
              className="hidden sm:flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {liveFeedLoading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="flex items-start gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2 py-1">
                    <div className="h-3 bg-slate-700/50 rounded w-1/3" />
                    <div className="h-3 bg-slate-700/50 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : liveFeedItems.length > 0 ? (
              liveFeedItems.map((item, i) => {
                const Wrapper = item.url ? motion.a : motion.div;
                return (
                  <Wrapper
                    key={item.id}
                    {...(item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="card-hover flex items-start gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800 transition-all"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        item.color === "orange"
                          ? "bg-orange-600/20 text-orange-400 border border-orange-800/50"
                          : "bg-blue-600/20 text-blue-400 border border-blue-800/50"
                      }`}
                    >
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-white text-sm">{item.name}</span>
                        <span className="text-xs text-orange-400 font-medium">Industry News</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-snug">{item.project}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                      </div>
                    </div>
                  </Wrapper>
                );
              })
            ) : (
              <div className="text-center bg-slate-800/60 border border-slate-700/50 rounded-xl p-8">
                <Rss className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                <p className="text-white font-bold mb-1">Activity will appear here as the network grows</p>
                <p className="text-slate-400 text-sm mb-4">Be one of the first to share an update from the field.</p>
                <Link href="/build" className="inline-flex items-center gap-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors">
                  Build Your Trade Card <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/feed"
            className="mt-5 flex sm:hidden items-center justify-center gap-1 text-orange-400 text-sm font-semibold"
          >
            View All Feed Posts <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Two sides. One platform.</h2>
            <p className="text-slate-400">Built for the full construction supply chain.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">

            {/* Trade Pro Side */}
            <div className="bg-gradient-to-br from-orange-950/40 to-slate-900 border border-orange-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <HardHat className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-black text-white">For Trade Pros</h3>
              </div>
              <div className="space-y-3">
                {[
                  "Build a Digital Trade Card, your public capability statement",
                  "Upload OSHA certs, bonding proof, COI, and W9 for instant AI verification",
                  "Set your availability, crew size, and project capacity",
                  "Get a shareable URL: nexus.com/pro/your-name",
                  "Show up in GC searches for your trade and region",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/build"
                className="btn-glow mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-sm"
              >
                Build My Trade Card <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* GC Side */}
            <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-900/40 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-black text-white">For GCs &amp; Subs</h3>
              </div>
              <div className="space-y-3">
                {[
                  "Search by project sector, value, and zip code",
                  "See Green / Yellow / Blue match scores based on bonding and payroll",
                  "View the lead foreman's Trade Card to see the actual talent, not just the company",
                  "Filter by 'Available Now' to find crews ready to mobilize",
                  "Access verified COIs, bonding certs, and W9s before you make the call",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/search"
                className="btn-glow-blue mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm"
              >
                Search Verified Crews <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRADE CATEGORIES ────────────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-black text-white mb-6 text-center">All Major Trades. Every Sector.</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
            {TRADES.map(({ icon: Icon, label }) => (
              <div key={label} className="card-hover flex flex-col items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl py-4 px-2 hover:border-orange-800/50 hover:bg-orange-950/20 transition-colors cursor-pointer">
                <Icon className="w-6 h-6 text-orange-400" />
                <span className="text-xs font-semibold text-slate-300">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SECTORS.map((s) => (
              <span key={s} className="px-3 py-1.5 bg-blue-950/50 border border-blue-800/40 text-blue-300 text-xs font-semibold rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MATCH ENGINE PREVIEW ────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">The Match Engine</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Three tiers. Instant clarity. Know exactly which subs can execute your project
              before you pick up the phone.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-950/30 border border-green-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="font-bold text-green-400 uppercase text-xs tracking-widest">Prime</span>
              </div>
              <p className="text-white font-semibold mb-2">Full Capacity Match</p>
              <p className="text-slate-400 text-sm">Bonding ≥ project value. Direct payroll &gt; 70%. 5+ sector-specific project photos. Ready to execute.</p>
            </div>
            <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-yellow-400 rounded-full" />
                <span className="font-bold text-yellow-400 uppercase text-xs tracking-widest">Potential</span>
              </div>
              <p className="text-white font-semibold mb-2">Growing Capacity</p>
              <p className="text-slate-400 text-sm">High skill, bonding within ±10% of project value. Strong work record, may need bonding increase to close.</p>
            </div>
            <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-blue-400 rounded-full" />
                <span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Local Force</span>
              </div>
              <p className="text-white font-semibold mb-2">High Local Reputation</p>
              <p className="text-slate-400 text-sm">Strong local notoriety, proven work portfolio. Uses mixed or 1099 workforce. Best for local scopes.</p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link
              href="/search"
              className="btn-glow inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-900/30"
            >
              <Search className="w-4 h-4" /> Run a Match Search
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRUST STATEMENT ─────────────────────────────────────────────────── */}
      {/* Roadmap: explicit callout that we are NOT a pay-to-play rating platform */}
      <section className="py-14 px-4 sm:px-6 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1.5 bg-orange-950/60 border border-orange-800/50 text-orange-400 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
              Trust Statement
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
              We are not a pay-to-play platform.
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
              The construction industry has been burned by prequalification platforms that turned safety scores into a subscription business and charged contractors to maintain grades. We are not that.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Not ISNetworld", desc: "No prequalification scores, no EMR ratings, no OCIP determinations" },
              { label: "Not Avetta or Browz", desc: "No grading system. No ranking contractors above each other." },
              { label: "Not a Rating Platform", desc: "Badge = eligible. Not rated. Lack of a badge is not a quality judgment." },
            ].map(item => (
              <div key={item.label} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-red-400 font-bold text-sm mb-1 line-through opacity-60">{item.label}</p>
                <p className="text-slate-300 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-800/40 rounded-2xl p-6 text-center">
            <p className="text-white font-black text-lg mb-2">
              "Verified by Paper. Not by Algorithm."
            </p>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              We check documents. We check references. We run a basic public web scan. A clear result gets a badge. That's it. We will never issue a grade, score, rank, or rating for any contractor on this platform. Ever.
            </p>
            <Link href="/policy/no-grades" className="inline-block mt-4 text-orange-400 hover:text-orange-300 text-sm font-semibold underline transition-colors">
              Read Our No-Grade Policy →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: ShieldCheck, label: "AI-Verified Bonding", desc: "Bonding certs read and extracted automatically" },
              { icon: CheckCircle, label: "COI & Insurance", desc: "Current certificates, expiration tracked" },
              { icon: Zap, label: "W9 on File", desc: "Tax compliance verified before first call" },
              { icon: Star, label: "OSHA Certifications", desc: "Safety credentials confirmed and displayed" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <Icon className="w-7 h-7 text-orange-400 mx-auto mb-2" />
                <p className="text-white font-semibold text-sm mb-1">{label}</p>
                <p className="text-slate-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GET DISCOVERED ──────────────────────────────────────────────────── */}
      {availablePros.length > 0 && (
        <section className="py-16 px-4 sm:px-6 border-t border-slate-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-green-400">Available Now</span>
                </div>
                <h2 className="text-2xl font-black text-white">Get Discovered</h2>
                <p className="text-slate-400 text-sm mt-1">Trade pros ready to mobilize. Browse free.</p>
              </div>
              <Link href="/feed?available=1" className="hidden sm:flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                See All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availablePros.map(pro => (
                <Link
                  key={pro.id}
                  href={`/pro/${pro.slug}`}
                  className="card-hover bg-slate-800/60 border border-slate-700 hover:border-green-700/60 rounded-2xl p-4 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center font-black text-orange-400 text-sm flex-shrink-0">
                      {pro.first_name[0]}{pro.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate group-hover:text-orange-300 transition-colors">
                        {pro.first_name} {pro.last_name}
                      </p>
                      <p className="text-orange-400 text-xs truncate">{pro.trade}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      {pro.location_city && <><MapPin className="w-3 h-3" />{pro.location_city}{pro.location_state ? `, ${pro.location_state}` : ""}</>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-green-400">Available</span>
                      {canBeVerified(pro.profile_type) && pro.verification_status === "verified" && <ShieldCheck className="w-3 h-3 text-green-400" />}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center sm:hidden">
              <Link href="/feed?available=1" className="text-xs text-orange-400 font-semibold">
                See all available pros →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 border-t border-slate-800" id="waitlist-bottom">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Your work speaks for itself.<br />
            <span className="text-orange-500">Now let the right people hear it.</span>
          </h2>
          <p className="text-slate-400 mb-8">
            We&apos;re launching soon. Get your spot now. Free forever.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <Suspense fallback={null}>
              <WaitlistForm />
            </Suspense>
          </div>
          <p className="text-xs text-slate-600 mt-5">
            A TradePro Enterprises product. Also from us:{" "}
            <a href="https://tradeprotech.ai" className="text-slate-500 hover:text-slate-400 underline">TradePro Resume Builder</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-6 mb-8 text-xs">
            <div>
              <p className="text-slate-300 font-bold mb-2">Platform</p>
              <div className="space-y-1.5">
                <Link href="/feed" className="block text-slate-500 hover:text-slate-300 transition-colors">Live Feed</Link>
                <Link href="/search" className="block text-slate-500 hover:text-slate-300 transition-colors">Find Crews</Link>
                <Link href="/build" className="block text-slate-500 hover:text-slate-300 transition-colors">Build Trade Card</Link>
                <Link href="/pricing" className="block text-slate-500 hover:text-slate-300 transition-colors">GC Pricing</Link>
                <Link href="/verify" className="block text-slate-500 hover:text-slate-300 transition-colors">Get Verified</Link>
              </div>
            </div>
            <div>
              <p className="text-slate-300 font-bold mb-2">Policies</p>
              <div className="space-y-1.5">
                <Link href="/policy/verification" className="block text-slate-500 hover:text-slate-300 transition-colors">Verification Process</Link>
                <Link href="/policy/no-grades" className="block text-slate-500 hover:text-slate-300 transition-colors">No-Grade Policy</Link>
                <Link href="/policy/how-it-works" className="block text-slate-500 hover:text-slate-300 transition-colors">How It Works</Link>
                <Link href="/policy/disclaimer" className="block text-slate-500 hover:text-slate-300 transition-colors">Platform Disclaimer</Link>
                <Link href="/policy/documents" className="block text-slate-500 hover:text-slate-300 transition-colors">Document Policy</Link>
                <Link href="/privacy-policy" className="block text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link>
                <Link href="/terms-of-use" className="block text-slate-500 hover:text-slate-300 transition-colors">Terms of Use</Link>
                <Link href="/membership-agreement" className="block text-slate-500 hover:text-slate-300 transition-colors">Membership Agreement</Link>
              </div>
            </div>
            <div>
              <p className="text-slate-300 font-bold mb-2">More Policies</p>
              <div className="space-y-1.5">
                <Link href="/policy/web-scan" className="block text-slate-500 hover:text-slate-300 transition-colors">Web Scan Disclaimer</Link>
                <Link href="/policy/supply-house" className="block text-slate-500 hover:text-slate-300 transition-colors">Supply House Policy</Link>
                <Link href="/advertise/guidelines" className="block text-slate-500 hover:text-slate-300 transition-colors">Advertiser Guidelines</Link>
              </div>
            </div>
            <div>
              <p className="text-slate-300 font-bold mb-2">Advertise</p>
              <div className="space-y-1.5">
                <Link href="/advertise" className="block text-slate-500 hover:text-slate-300 transition-colors">Advertising Info</Link>
                <Link href="/advertise/guidelines" className="block text-slate-500 hover:text-slate-300 transition-colors">Ad Standards</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="TradePro Nexus on LinkedIn"
                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <LinkedinIcon className="w-3.5 h-3.5" />
              </a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="TradePro Nexus on Facebook"
                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <FacebookIcon className="w-3.5 h-3.5" />
              </a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="TradePro Nexus on Instagram"
                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-slate-600 text-xs">
              © {new Date().getFullYear()} TradePro Enterprises. All rights reserved.
              {" "}· A TradePro Enterprises product ·{" "}
              <a href="https://tradeprotech.ai" className="hover:text-slate-400 transition-colors">TradePro Resume Builder</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
