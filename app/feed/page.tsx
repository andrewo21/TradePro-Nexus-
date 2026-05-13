"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, MapPin, Clock, Camera, Heart, Filter,
  ChevronDown, Rss, HardHat, Building2, ArrowRight
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// ── Mock Feed Data ─────────────────────────────────────────────────────────────

const FEED_POSTS = [
  {
    id: "1",
    authorName: "Marcus Thompson",
    authorType: "profile",
    authorSlug: "marcus-thompson",
    trade: "Commercial Electrician",
    location: "Chicago, IL",
    content: "Phase 2 roughin complete on the 39-story tower. All panels and conduit runs done ahead of schedule. 14-man crew, clean work. Proud of this one.",
    projectName: "Lakeshore Mixed-Use Tower",
    tags: ["High-Rise", "Commercial Electrical", "Multifamily"],
    time: "2h ago",
    verified: true,
    likes: 47,
    hasPhotos: true,
    tier: null,
  },
  {
    id: "2",
    authorName: "Delta Mechanical Inc.",
    authorType: "company",
    authorSlug: "delta-mechanical",
    trade: "HVAC / Mechanical",
    location: "Houston, TX",
    content: "84,000 SF HVAC ductwork installation complete at the Senior Living facility. All AHUs commissioned and running. Ready for the next scope — we have capacity now.",
    projectName: "Sunrise Senior Living — Phase 1",
    tags: ["Senior Living", "HVAC", "Mechanical"],
    time: "4h ago",
    verified: true,
    likes: 31,
    hasPhotos: true,
    tier: "green",
  },
  {
    id: "3",
    authorName: "Ray Vega",
    authorType: "profile",
    authorSlug: "ray-vega",
    trade: "Ironworker / Structural Steel",
    location: "Newark, NJ",
    content: "Topped out the Federal Courthouse structural steel today. 18-week schedule, delivered in 16. OSHA 30, zero incidents. That's how we do it.",
    projectName: "Essex County Federal Courthouse",
    tags: ["Federal / Gov't", "Structural Steel"],
    time: "6h ago",
    verified: true,
    likes: 83,
    hasPhotos: true,
    tier: null,
  },
  {
    id: "4",
    authorName: "Pacific Fire Protection LLC",
    authorType: "company",
    authorSlug: "pacific-fire",
    trade: "Fire Suppression",
    location: "Los Angeles, CA",
    content: "245-unit apartment complex — full wet pipe sprinkler system installed and inspected. All units clear. Wrapping up here and have crew available in 3 weeks for the right project.",
    projectName: "Westside Residences",
    tags: ["Multifamily", "Fire Suppression", "Available Soon"],
    time: "8h ago",
    verified: true,
    likes: 22,
    hasPhotos: true,
    tier: "yellow",
  },
  {
    id: "5",
    authorName: "Jerome King",
    authorType: "profile",
    authorSlug: "jerome-king",
    trade: "Superintendent",
    location: "Atlanta, GA",
    content: "Hospital renovation TI complete — 12,000 SF of medical office buildout. Punch list in progress, substantial completion next week. Great team on this one.",
    projectName: "Emory Medical Office Renovation",
    tags: ["Healthcare", "TI", "Superintendent"],
    time: "12h ago",
    verified: true,
    likes: 19,
    hasPhotos: false,
    tier: null,
  },
  {
    id: "6",
    authorName: "Southside Ironworks",
    authorType: "company",
    authorSlug: "southside-ironworks",
    trade: "Structural Steel",
    location: "Chicago, IL",
    content: "New 30-man crew available. We've done 8 projects in Chicago's South Side this year — local knowledge, strong reputation. Looking for the next challenge.",
    projectName: null,
    tags: ["Structural Steel", "Available Now", "Chicago"],
    time: "1d ago",
    verified: true,
    likes: 14,
    hasPhotos: true,
    tier: "blue",
  },
];

const TRADE_FILTERS = ["All Trades", "Electrical", "HVAC", "Structural Steel", "Fire Suppression", "Concrete", "Superintendent"];
const SECTOR_FILTERS = ["All Sectors", "Senior Living", "Healthcare", "Federal", "Multifamily", "Industrial"];

// ── Photo placeholder grid ─────────────────────────────────────────────────────

function PhotoGrid({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-1.5 mt-3 ${count >= 3 ? "grid-cols-3" : count === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <div key={i} className="aspect-video bg-slate-900 border border-slate-700/50 rounded-lg flex items-center justify-center">
          <Camera className="w-5 h-5 text-slate-600" />
        </div>
      ))}
    </div>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const map: Record<string, string> = {
    green: "text-green-400 bg-green-900/30 border-green-800/50",
    yellow: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
    blue: "text-blue-400 bg-blue-900/30 border-blue-800/50",
  };
  const labels: Record<string, string> = { green: "Prime", yellow: "Potential", blue: "Local Force" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[tier]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tier === "green" ? "bg-green-400" : tier === "yellow" ? "bg-yellow-400" : "bg-blue-400"}`} />
      {labels[tier]}
    </span>
  );
}

export default function FeedPage() {
  const [activeTradeFilter, setActiveTradeFilter] = useState("All Trades");
  const [activeSectorFilter, setActiveSectorFilter] = useState("All Sectors");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  function toggleLike(id: string) {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-green-400">Live Feed</span>
              <Rss className="w-3.5 h-3.5 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Work is Currency.</h1>
            <p className="text-slate-400 text-sm">Real progress from Verified Pros — updated continuously.</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" /> Filter
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-5 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Trade</p>
              <div className="flex flex-wrap gap-2">
                {TRADE_FILTERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTradeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeTradeFilter === t ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sector</p>
              <div className="flex flex-wrap gap-2">
                {SECTOR_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSectorFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeSectorFilter === s ? "bg-blue-700 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feed posts */}
        <div className="space-y-4">
          {FEED_POSTS.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition-colors"
            >
              {/* Post header */}
              <div className="p-4 pb-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Link
                      href={post.authorType === "company" ? `/company/${post.authorSlug}` : `/pro/${post.authorSlug}`}
                      className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-600/40 flex items-center justify-center font-black text-orange-400 text-sm flex-shrink-0 hover:border-orange-400 transition-colors"
                    >
                      {post.authorType === "company" ? <Building2 className="w-5 h-5" /> : post.authorName.slice(0, 2).toUpperCase()}
                    </Link>

                    {/* Author info */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={post.authorType === "company" ? `/company/${post.authorSlug}` : `/pro/${post.authorSlug}`}
                          className="font-bold text-white text-sm hover:text-orange-300 transition-colors"
                        >
                          {post.authorName}
                        </Link>
                        {post.verified && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                        <TierBadge tier={post.tier} />
                      </div>
                      <p className="text-xs text-orange-400 font-medium">{post.trade}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.location}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Type icon */}
                  <div className="flex-shrink-0">
                    {post.authorType === "company"
                      ? <Building2 className="w-4 h-4 text-blue-500/60" />
                      : <HardHat className="w-4 h-4 text-orange-500/60" />}
                  </div>
                </div>

                {/* Project name */}
                {post.projectName && (
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1.5">
                    Project: {post.projectName}
                  </p>
                )}

                {/* Content */}
                <p className="text-slate-200 text-sm leading-relaxed">{post.content}</p>

                {/* Photo grid */}
                {post.hasPhotos && <PhotoGrid count={3} />}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-900/60 border border-slate-700/50 text-slate-400 text-[10px] font-semibold rounded-full">
                      #{tag.replace(/\s+/g, "")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Post footer */}
              <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-slate-700/50">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    likedPosts.has(post.id) ? "text-red-400" : "text-slate-500 hover:text-red-400"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? "fill-red-400" : ""}`} />
                  {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                </button>

                <Link
                  href={post.authorType === "company" ? `/company/${post.authorSlug}` : `/pro/${post.authorSlug}`}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-400 transition-colors"
                >
                  View {post.authorType === "company" ? "Company" : "Trade Card"} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-8">
          <button className="px-6 py-3 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 rounded-xl text-sm font-semibold transition-colors">
            Load More Posts
          </button>
          <p className="text-xs text-slate-600 mt-3">
            Only verified pros can post to the live feed.{" "}
            <Link href="/build" className="text-slate-500 hover:text-slate-400 underline">
              Build your Trade Card to join.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
