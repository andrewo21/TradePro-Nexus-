"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, MapPin, Clock, Heart, Filter,
  ChevronDown, Rss, HardHat, Building2, ArrowRight,
  Send, Loader2, PenLine, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { SECTORS, TRADE_GROUPS } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedPost {
  id: string;
  author_id: string;
  author_type: "profile" | "company";
  content: string;
  project_name: string | null;
  trade_tags: string[];
  likes_count: number;
  created_at: string;
  // Joined
  author_name: string;
  author_slug: string;
  author_trade: string;
  author_location: string;
  author_verified: boolean;
  author_availability: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ALL_FEED_TRADES = ["All Trades", ...TRADE_GROUPS[0].trades, ...TRADE_GROUPS[1].trades.slice(0, 4)];
const FEED_SECTORS = ["All Sectors", ...SECTORS];

// ── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, liked }: { post: FeedPost; onLike: () => void; liked: boolean }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition-colors">
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <Link
              href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
              className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-600/40 flex items-center justify-center font-black text-orange-400 text-sm flex-shrink-0 hover:border-orange-400 transition-colors"
            >
              {post.author_type === "company" ? <Building2 className="w-5 h-5" /> : post.author_name.slice(0, 2).toUpperCase()}
            </Link>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
                  className="font-bold text-white text-sm hover:text-orange-300 transition-colors"
                >
                  {post.author_name}
                </Link>
                {post.author_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
                {post.author_availability === "available" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded-full border border-green-800/30">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Available Now
                  </span>
                )}
              </div>
              <p className="text-xs text-orange-400 font-medium">{post.author_trade}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                {post.author_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.author_location}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            {post.author_type === "company"
              ? <Building2 className="w-4 h-4 text-blue-500/60" />
              : <HardHat className="w-4 h-4 text-orange-500/60" />}
          </div>
        </div>

        {post.project_name && (
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1.5">
            Project: {post.project_name}
          </p>
        )}

        <p className="text-slate-200 text-sm leading-relaxed">{post.content}</p>

        {post.trade_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.trade_tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-slate-900/60 border border-slate-700/50 text-slate-400 text-[10px] font-semibold rounded-full">
                #{tag.replace(/\s+/g, "")}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 mt-3 border-t border-slate-700/50">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${liked ? "text-red-400" : "text-slate-500 hover:text-red-400"}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-400" : ""}`} />
          {post.likes_count + (liked ? 1 : 0)}
        </button>
        <Link
          href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-400 transition-colors"
        >
          View {post.author_type === "company" ? "Company" : "Trade Card"} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [tradeFilter, setTradeFilter] = useState("All Trades");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [availableNow, setAvailableNow] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postProject, setPostProject] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const db = getSupabase() as any;

      const { data: raw } = await db
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!raw || raw.length === 0) { setPosts([]); setLoading(false); return; }

      const profileIds = raw.filter((p: any) => p.author_type === "profile").map((p: any) => p.author_id);
      const companyIds = raw.filter((p: any) => p.author_type === "company").map((p: any) => p.author_id);

      const [profileRes, companyRes] = await Promise.all([
        profileIds.length > 0
          ? db.from("profiles").select("id, first_name, last_name, slug, trade, location_city, location_state, verification_status, availability_status").in("id", profileIds)
          : Promise.resolve({ data: [] }),
        companyIds.length > 0
          ? db.from("companies").select("id, name, slug, trade_specialties, location_city, location_state, verification_status, availability_status").in("id", companyIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, any> = {};
      const companyMap: Record<string, any> = {};
      for (const p of profileRes.data ?? []) profileMap[p.id] = p;
      for (const c of companyRes.data ?? []) companyMap[c.id] = c;

      const mapped: FeedPost[] = raw.map((p: any) => {
        if (p.author_type === "profile") {
          const prof = profileMap[p.author_id];
          return {
            ...p,
            author_name: prof ? `${prof.first_name} ${prof.last_name}` : "Unknown",
            author_slug: prof?.slug ?? "",
            author_trade: prof?.trade ?? "",
            author_location: prof ? [prof.location_city, prof.location_state].filter(Boolean).join(", ") : "",
            author_verified: prof?.verification_status === "verified",
            author_availability: prof?.availability_status ?? "available",
          };
        } else {
          const co = companyMap[p.author_id];
          return {
            ...p,
            author_name: co?.name ?? "Unknown Company",
            author_slug: co?.slug ?? "",
            author_trade: (co?.trade_specialties ?? [])[0] ?? "",
            author_location: co ? [co.location_city, co.location_state].filter(Boolean).join(", ") : "",
            author_verified: co?.verification_status === "verified",
            author_availability: co?.availability_status ?? "available",
          };
        }
      });

      setPosts(mapped);
    } catch (err) {
      console.error("Feed fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    getSupabase()?.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, [fetchPosts]);

  async function handlePost() {
    if (!postContent.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent.trim(),
          project_name: postProject.trim() || undefined,
          trade_tags: [],
          author_type: "profile",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPostError(data.error ?? "Failed to post."); return; }
      setPostContent("");
      setPostProject("");
      setShowPostForm(false);
      fetchPosts();
    } catch {
      setPostError("Something went wrong.");
    } finally {
      setPosting(false);
    }
  }

  const filtered = posts.filter((p) => {
    if (availableNow && p.author_availability !== "available") return false;
    if (tradeFilter !== "All Trades" && !p.trade_tags.some(t => t.toLowerCase().includes(tradeFilter.toLowerCase())) && p.author_trade !== tradeFilter) return false;
    if (sectorFilter !== "All Sectors" && !p.trade_tags.some(t => t === sectorFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
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
            {/* Available Now */}
            <button
              onClick={() => setAvailableNow(!availableNow)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                availableNow ? "bg-green-900/40 border-green-700 text-green-400" : "bg-slate-900 border-slate-600 text-slate-400 hover:border-green-700/50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableNow ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
              Available Now Only
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Trade</p>
              <div className="flex flex-wrap gap-2">
                {ALL_FEED_TRADES.map((t) => (
                  <button key={t} onClick={() => setTradeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tradeFilter === t ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sector</p>
              <div className="flex flex-wrap gap-2">
                {FEED_SECTORS.map((s) => (
                  <button key={s} onClick={() => setSectorFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sectorFilter === s ? "bg-blue-700 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Post composer */}
        {currentUser && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-5">
            {!showPostForm ? (
              <button
                onClick={() => setShowPostForm(true)}
                className="w-full flex items-center gap-3 text-left text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-600/40 flex items-center justify-center">
                  <PenLine className="w-4 h-4 text-orange-400" />
                </div>
                What are you working on?
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">New Post</span>
                  <button onClick={() => setShowPostForm(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What are you working on? Project update, crew availability, milestone completed…"
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
                <input
                  value={postProject}
                  onChange={(e) => setPostProject(e.target.value)}
                  placeholder="Project name (optional)"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                {postError && <p className="text-red-400 text-xs">{postError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowPostForm(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handlePost}
                    disabled={posting || !postContent.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Update
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                <PostCard
                  post={post}
                  liked={likedPosts.has(post.id)}
                  onLike={() => setLikedPosts(prev => {
                    const next = new Set(prev);
                    next.has(post.id) ? next.delete(post.id) : next.add(post.id);
                    return next;
                  })}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Rss className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold mb-1">
              {availableNow || tradeFilter !== "All Trades" || sectorFilter !== "All Sectors"
                ? "No posts match your filters"
                : "The feed is empty right now"}
            </p>
            <p className="text-slate-600 text-sm mb-5">
              {currentUser
                ? "Be the first to post a project update."
                : "Sign in to post project updates and see the full feed."}
            </p>
            {!currentUser && (
              <Link href="/signup" className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors">
                <HardHat className="w-4 h-4" /> Join and Post Updates
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-slate-600 mt-8">
            Sign in to post to the feed.{" "}
            <Link href="/build" className="text-slate-500 hover:text-slate-400 underline">
              Build your Trade Card to get started.
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
