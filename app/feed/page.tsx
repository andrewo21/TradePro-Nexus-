"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck, MapPin, Clock,
  Rss, HardHat, Building2, ArrowRight,
  Send, Loader2, PenLine, X, Bookmark,
  Share2, MoreHorizontal, Edit3, Trash2, Pin, Search, MessageCircle,
  Newspaper, ExternalLink, Plus, Check, Smile, ImagePlus, UserPlus, Globe, Users
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { canBeVerified } from "@/lib/constants";
import FeedAdCard from "@/components/FeedAdCard";
import BadgeCelebration from "@/components/BadgeCelebration";
import FeedLeftSidebar from "@/components/FeedLeftSidebar";
import FeedRightSidebar from "@/components/FeedRightSidebar";
import type { Badge } from "@/lib/badge-definitions";
import { trackEvent } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MentionTag {
  type: "profile" | "company";
  id: string;
  name: string;
  slug: string;
}

interface FeedPost {
  id: string;
  author_id: string | null;
  author_type: "profile" | "company" | "news";
  content: string;
  project_name: string | null;
  trade_tags: string[];
  image_urls: string[];
  audience: "everyone" | "connections";
  mentions: MentionTag[];
  likes_count: number;
  created_at: string;
  author_name: string;
  author_slug: string;
  author_trade: string;
  author_location: string;
  author_verified: boolean;
  author_availability: string;
  author_legacy_member: boolean;
  is_industry_news: boolean;
  news_source_name: string | null;
  news_source_domain: string | null;
  news_article_url: string | null;
  featured_image_url: string | null;
}

const EMOJI_OPTIONS = [
  "👍", "🔥", "💪", "🏗️", "💡", "🤝", "👏", "✅",
  "🚧", "⚡", "🔨", "🪜", "🛠️", "📐", "🚛", "🏠",
  "😂", "😎", "🎉", "💯", "👀", "🙌", "❤️", "⭐",
];

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

type ReactionData = { counts: Record<string, number>; mine: string | null };

// ── Comment types ──────────────────────────────────────────────────────────────

interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_slug: string | null;
  author_trade: string | null;
}

// ── Comment Section ───────────────────────────────────────────────────────────

function CommentSection({
  postId,
  currentUserId,
  initialCount,
  onCountChange,
}: {
  postId: string;
  currentUserId: string | null;
  initialCount: number;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded) return;
    setLoading(true);
    fetch(`/api/feed/${postId}/comments`)
      .then(r => r.json())
      .then(d => { setComments(d.comments ?? []); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [postId, loaded]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments(prev => [...prev, data.comment]);
        onCountChange(1);
        setText("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 pt-3 pb-3">
      {loading && (
        <p className="text-xs text-slate-400 py-1">Loading comments...</p>
      )}

      {loaded && comments.length === 0 && !currentUserId && (
        <p className="text-xs text-slate-400 py-1">No comments yet.</p>
      )}

      {comments.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-[10px] font-black text-orange-600 flex-shrink-0 mt-0.5">
                {c.author_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 bg-white rounded-xl px-3 py-2 border border-[#e2e8f0]">
                <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                  {c.author_slug ? (
                    <Link href={`/pro/${c.author_slug}`} className="text-xs font-bold text-[#0f172a] hover:text-orange-600 transition-colors">
                      {c.author_name}
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-[#0f172a]">{c.author_name}</span>
                  )}
                  {c.author_trade && (
                    <span className="text-[10px] text-orange-500 font-semibold">{c.author_trade}</span>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <div className="w-6 h-6 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-[10px] font-black text-orange-600 flex-shrink-0">
            <MessageCircle className="w-3 h-3" />
          </div>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            maxLength={1000}
            className="flex-1 bg-white border border-[#e2e8f0] rounded-full px-3 py-1.5 text-xs text-[#0f172a] placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold rounded-full transition-colors flex-shrink-0"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-400">
          <Link href="/login" className="text-orange-500 font-semibold hover:text-orange-400">Sign in</Link> to comment.
        </p>
      )}
    </div>
  );
}

const REACTIONS = [
  { type: "like",       emoji: "👍", label: "Like" },
  { type: "fire",       emoji: "🔥", label: "Fire" },
  { type: "strong",     emoji: "💪", label: "Strong" },
  { type: "on_the_job", emoji: "🏗️",  label: "On the Job" },
  { type: "helpful",    emoji: "💡", label: "Helpful" },
  { type: "connect",    emoji: "🤝", label: "Connect" },
];

function getNewsCategoryStyle(sourceName: string | null) {
  const n = (sourceName ?? "").toLowerCase();
  if (n.includes("osha") || n.includes("safety"))
    return { border: "border-l-4 border-l-amber-400", badge: "bg-amber-50 border-amber-200", text: "text-amber-800" };
  if (n.includes("ibew") || n.includes("carpenters") || n.includes("plumber") || n.includes("nccer") || n.includes("skills") || n.includes("labor") || n.includes("workforce") || n.includes("clrc") || n.includes("ua "))
    return { border: "border-l-4 border-l-blue-500",  badge: "bg-blue-50 border-blue-200",  text: "text-blue-800" };
  if (n.includes("enr") || n.includes("construction dive") || n.includes("for construction") || n.includes("constructor") || n.includes("agc") || n.includes("procore") || n.includes("building design") || n.includes("executive"))
    return { border: "border-l-4 border-l-orange-500", badge: "bg-orange-50 border-orange-200", text: "text-orange-800" };
  if (n.includes("electrical") || n.includes("plumbing") || n.includes("hvac") || n.includes("roofing") || n.includes("nrca") || n.includes("cfma") || n.includes("autodesk"))
    return { border: "border-l-4 border-l-green-500",  badge: "bg-green-50 border-green-200",  text: "text-green-800" };
  return { border: "border-l-4 border-l-slate-400", badge: "bg-slate-100 border-slate-200", text: "text-slate-700" };
}

// ── Feed Algorithm ────────────────────────────────────────────────────────────

type FeedCategory = "Safety" | "Labor Market" | "Project News" | "Trade Specific" | "General Construction";

const FEED_CATEGORY_ORDER: FeedCategory[] = [
  "Safety", "Labor Market", "Project News", "Trade Specific", "General Construction",
];

function getNewsCategory(sourceName: string | null): FeedCategory {
  const n = (sourceName ?? "").toLowerCase();
  if (n.includes("osha") || n.includes("safety")) return "Safety";
  if (n.includes("ibew") || n.includes("carpenters") || n.includes("plumber") || n.includes("nccer") || n.includes("skills") || n.includes("labor") || n.includes("workforce") || n.includes("clrc") || n.includes("ua ")) return "Labor Market";
  if (n.includes("enr") || n.includes("construction dive") || n.includes("for construction") || n.includes("constructor") || n.includes("agc") || n.includes("procore") || n.includes("building design") || n.includes("executive")) return "Project News";
  if (n.includes("electrical") || n.includes("plumbing") || n.includes("hvac") || n.includes("roofing") || n.includes("nrca") || n.includes("cfma") || n.includes("autodesk")) return "Trade Specific";
  return "General Construction";
}

function buildFeedAlgorithm(
  allPosts: FeedPost[],
  reactionsMap: Record<string, ReactionData>,
  followedSources: Set<string>,
): FeedPost[] {
  const now = Date.now();
  const maxAge = 60 * 24 * 60 * 60 * 1000;

  function calcScore(p: FeedPost): number {
    const ageMs = now - new Date(p.created_at).getTime();
    const recency = Math.max(0, 10 - (ageMs / maxAge) * 10);
    const rxCount = Object.values(reactionsMap[p.id]?.counts ?? {}).reduce((a, b) => a + b, 0);
    const followBonus = p.news_source_name && followedSources.has(p.news_source_name) ? 2 : 0;
    return recency + rxCount * 0.5 + followBonus;
  }

  const newsPosts = allPosts
    .filter(p => p.is_industry_news)
    .sort((a, b) => calcScore(b) - calcScore(a));

  const userPosts = allPosts
    .filter(p => !p.is_industry_news)
    .sort((a, b) => calcScore(b) - calcScore(a));

  const byCategory = new Map<FeedCategory, FeedPost[]>();
  for (const cat of FEED_CATEGORY_ORDER) byCategory.set(cat, []);
  for (const p of newsPosts) byCategory.get(getNewsCategory(p.news_source_name))!.push(p);

  const result: FeedPost[] = [];
  const usedIds = new Set<string>();
  const sourceLastPos = new Map<string, number>();
  let catIdx = 0;
  let lastCat: FeedCategory | null = null;
  let newsSlot = true;
  let userIdx = 0;

  function pickNews(pos: number): FeedPost | null {
    for (let offset = 0; offset < FEED_CATEGORY_ORDER.length; offset++) {
      const idx = (catIdx + offset) % FEED_CATEGORY_ORDER.length;
      const cat = FEED_CATEGORY_ORDER[idx];
      if (cat === lastCat) continue;
      const pool = byCategory.get(cat)!;
      const pick = pool.find(p => {
        if (usedIds.has(p.id)) return false;
        const last = sourceLastPos.get(p.news_source_name ?? "");
        return last === undefined || pos - last >= 6;
      });
      if (pick) {
        usedIds.add(pick.id);
        sourceLastPos.set(pick.news_source_name ?? "", pos);
        lastCat = cat;
        catIdx = (idx + 1) % FEED_CATEGORY_ORDER.length;
        return pick;
      }
    }
    return null;
  }

  for (let pos = 0; pos < allPosts.length; pos++) {
    if (newsSlot) {
      const news = pickNews(pos);
      if (news) {
        result.push(news);
        newsSlot = false;
      } else if (userIdx < userPosts.length) {
        const up = userPosts[userIdx++];
        usedIds.add(up.id);
        result.push(up);
        newsSlot = false;
      } else break;
    } else {
      if (userIdx < userPosts.length) {
        const up = userPosts[userIdx++];
        usedIds.add(up.id);
        result.push(up);
        newsSlot = true;
      } else {
        const news = pickNews(pos);
        if (news) { result.push(news); newsSlot = true; }
        else break;
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.group("[Feed Algorithm] First 30 posts:");
    result.slice(0, 30).forEach((p, i) =>
      console.log(`  [${String(i + 1).padStart(2)}] ${p.is_industry_news ? p.news_source_name ?? "news" : `@${p.author_name}`}`)
    );
    const srcPos: Record<string, number[]> = {};
    result.forEach((p, i) => {
      if (!p.is_industry_news) return;
      const src = p.news_source_name ?? "";
      (srcPos[src] ??= []).push(i + 1);
    });
    let violations = 0;
    for (const [src, positions] of Object.entries(srcPos)) {
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] - positions[i - 1] < 6) {
          console.warn(`  VIOLATION: "${src}" at positions ${positions[i-1]} and ${positions[i]} (gap: ${positions[i] - positions[i-1]})`);
          violations++;
        }
      }
    }
    if (violations === 0) console.log("  ✓ No source cooldown violations");
    console.groupEnd();
  }

  return result;
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

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post, reactionData, saved, followed, currentUserId, isGC, isAdmin, currentAuthorId,
  commentCount, onReact, onSave, onFollow, onShare, onDelete, onEdit, onPin, onDM, onCommentCountChange,
}: {
  post: FeedPost;
  reactionData: ReactionData;
  saved: boolean;
  followed: boolean;
  currentUserId: string | null;
  isGC: boolean;
  isAdmin: boolean;
  currentAuthorId: string | null;
  commentCount: number;
  onReact: (type: string | null) => void;
  onSave: () => void;
  onFollow: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDM: () => void;
  onCommentCountChange: (delta: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);

  function handleCommentCountChange(delta: number) {
    setLocalCommentCount(n => n + delta);
    onCommentCountChange(delta);
  }
  const isOwner = post.author_id !== null && post.author_id === currentAuthorId;
  const isNews = post.is_industry_news;
  const canDelete = isOwner || isAdmin;
  const cat = isNews ? getNewsCategoryStyle(post.news_source_name) : null;
  const totalReactions = Object.values(reactionData.counts).reduce((a, b) => a + b, 0);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors shadow-sm ${
      isNews
        ? `bg-[#f1f5f9] border-[#e2e8f0] ${cat?.border ?? "border-l-4 border-l-slate-400"}`
        : "bg-white border-[#e2e8f0] hover:border-[#cbd5e1]"
    }`}>

      {/* Industry News header bar */}
      {isNews && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${cat?.badge ?? "bg-slate-100 border-slate-200"}`}>
          {post.news_source_domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${post.news_source_domain}&sz=32`}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Newspaper className={`w-3.5 h-3.5 flex-shrink-0 ${cat?.text ?? "text-slate-500"}`} />
          )}
          <span className={`text-[10px] font-bold uppercase tracking-widest ${cat?.text ?? "text-slate-700"}`}>Industry News</span>
          <span className="text-slate-300 text-[10px]">·</span>
          <span className="text-[10px] text-slate-500 truncate flex-1">{post.news_source_name}</span>
          {currentUserId && (
            <button
              onClick={onFollow}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${
                followed
                  ? "text-green-700 border-green-400 bg-green-50"
                  : "text-slate-500 border-slate-300 hover:border-slate-400 hover:text-slate-700"
              }`}
            >
              {followed ? <><Check className="w-2.5 h-2.5" /> Following</> : <><Plus className="w-2.5 h-2.5" /> Follow</>}
            </button>
          )}
        </div>
      )}

      {/* Featured image for news articles */}
      {isNews && post.featured_image_url && (
        <a href={post.news_article_url ?? "#"} target="_blank" rel="noopener noreferrer">
          <div className="aspect-[3/1] overflow-hidden bg-slate-200">
            <img
              src={post.featured_image_url}
              alt=""
              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        </a>
      )}

      <div className="p-4 pb-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            {isNews ? (
              <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-4 h-4 text-slate-500" />
              </div>
            ) : (
              <Link
                href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
                className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-300 flex items-center justify-center font-black text-orange-600 text-sm flex-shrink-0 hover:border-orange-400 transition-colors"
              >
                {post.author_type === "company" ? <Building2 className="w-4 h-4" /> : post.author_name.slice(0, 2).toUpperCase()}
              </Link>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isNews ? (
                  <span className="font-semibold text-[#0f172a] text-sm">{post.news_source_name}</span>
                ) : (
                  <Link href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`} className="font-bold text-[#0f172a] text-sm hover:text-orange-600 transition-colors">
                    {post.author_name}
                  </Link>
                )}
                {!isNews && post.author_legacy_member && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-900 bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-300 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Legacy
                  </span>
                )}
                {!isNews && post.author_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
                {!isNews && post.author_availability === "available" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-300">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Available Now
                  </span>
                )}
              </div>
              {!isNews && <p className="text-xs text-orange-600 font-semibold mt-0.5">{post.author_trade}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                {post.author_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.author_location}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          {(!isNews || isAdmin) && (
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuOpen(!menuOpen)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 w-44 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-20 overflow-hidden" onMouseLeave={() => setMenuOpen(false)}>
                  {!isNews && (
                    <>
                      <button onClick={() => { onShare(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                      <button onClick={() => { onSave(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-orange-500 text-orange-500" : ""}`} /> {saved ? "Saved" : "Save Post"}
                      </button>
                    </>
                  )}
                  {isOwner && !isNews && <>
                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => { onPin(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                      <Pin className="w-3.5 h-3.5" /> Pin to Profile
                    </button>
                  </>}
                  {isGC && !isOwner && !isAdmin && !isNews && (
                    <button onClick={() => { onDM(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-blue-600 hover:bg-slate-50 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> Send Message
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-slate-50 transition-colors border-t border-[#e2e8f0]">
                      <Trash2 className="w-3.5 h-3.5" /> {isAdmin && !isOwner ? "Remove Post" : "Delete"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Headline (news) or project label (user) */}
        {isNews && post.project_name && (
          <a href={post.news_article_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="block text-[#0f172a] font-bold text-sm leading-snug mb-2 hover:text-slate-600 transition-colors">
            {post.project_name}
          </a>
        )}
        {!isNews && post.project_name && (
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Project: {post.project_name}</p>
        )}
        <p className="text-[#475569] text-sm leading-relaxed">{post.content}</p>

        {/* Tagged people/companies */}
        {!isNews && post.mentions?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.mentions.map((m, i) => (
              <Link
                key={i}
                href={m.type === "company" ? `/company/${m.slug}` : `/pro/${m.slug}`}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                @{m.name}
              </Link>
            ))}
          </div>
        )}

        {/* User post gallery */}
        {!isNews && post.image_urls?.length > 0 && (
          <div className={`grid gap-1.5 mt-3 ${post.image_urls.length >= 3 ? "grid-cols-3" : post.image_urls.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {post.image_urls.slice(0, 3).map((url, i) => (
              <div key={i} className="aspect-video rounded-lg overflow-hidden bg-slate-200">
                {isVideoUrl(url)
                  ? <video src={url} controls className="w-full h-full object-cover" />
                  : <img src={url} alt="Work photo" className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>
        )}
        {!isNews && post.trade_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.trade_tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-semibold rounded-full">#{tag.replace(/\s+/g, "")}</span>
            ))}
          </div>
        )}
      </div>

      {/* Reaction bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1 flex-wrap">
          {REACTIONS.map(r => {
            const count = reactionData.counts[r.type] ?? 0;
            const active = reactionData.mine === r.type;
            return (
              <button
                key={r.type}
                onClick={() => currentUserId && onReact(r.type)}
                title={r.label}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  active
                    ? "bg-orange-100 border border-orange-300 text-orange-700"
                    : "bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                } ${!currentUserId ? "opacity-50 cursor-default" : "cursor-pointer"}`}
              >
                <span>{r.emoji}</span>
                {count > 0 && <span className="font-semibold">{count}</span>}
              </button>
            );
          })}
          {totalReactions > 0 && (
            <span className="text-[10px] text-slate-400 ml-1">{totalReactions} reaction{totalReactions !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e2e8f0] mt-2">
        <div className="flex items-center gap-3">
          {!isNews && (
            <button onClick={onSave} className={`flex items-center gap-1 text-xs font-semibold transition-colors ${saved ? "text-orange-600" : "text-slate-400 hover:text-orange-600"}`}>
              <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-orange-500" : ""}`} />
              <span>{saved ? "Saved" : "Save"}</span>
            </button>
          )}
          {!isNews && (
            <button
              onClick={() => setCommentsOpen(v => !v)}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors ${commentsOpen ? "text-orange-600" : "text-slate-400 hover:text-orange-600"}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{localCommentCount > 0 ? localCommentCount : "Comment"}</span>
            </button>
          )}
        </div>
        {isNews ? (
          <a href={post.news_article_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Read Article
          </a>
        ) : (
          <Link href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-orange-600 transition-colors">
            View {post.author_type === "company" ? "Company" : "Trade Card"} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Comments section — lazy loaded on first open */}
      {!isNews && commentsOpen && (
        <CommentSection
          postId={post.id}
          currentUserId={currentUserId}
          initialCount={localCommentCount}
          onCountChange={handleCommentCountChange}
        />
      )}
    </div>
  );
}

// ── Onboarding Card ───────────────────────────────────────────────────────────

const ONBOARDING_PROMPTS = [
  "Tell the community what trade you're in and where you work",
  "Share a recent project you're proud of",
  "Are you available for work? Let GCs know",
  "What's your specialty?",
];

function OnboardingCard({ onDismiss, onPrompt }: { onDismiss: () => void; onPrompt: (p: string) => void }) {
  return (
    <div className="bg-gradient-to-br from-orange-950/40 to-slate-900 border border-orange-800/50 rounded-2xl p-4 relative">
      <button onClick={onDismiss} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors p-1">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-orange-600/20 border border-orange-600/40 rounded-lg flex items-center justify-center">
          <PenLine className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Introduce yourself to the community</p>
          <p className="text-slate-400 text-xs">Post an update to get started</p>
        </div>
      </div>
      <div className="space-y-2">
        {ONBOARDING_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="w-full text-left px-3 py-2.5 bg-slate-800/60 border border-slate-700 hover:border-orange-600/50 hover:bg-slate-800 rounded-xl text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between gap-2 group"
          >
            <span>"{prompt}"</span>
            <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Post Composer ─────────────────────────────────────────────────────────────

function PostComposer({ onPost, promptContent }: { onPost: (newBadges?: Badge[]) => void; promptContent?: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(() => {
    // Restore draft from localStorage (design choice: auto-load draft on open)
    if (typeof window !== "undefined") return localStorage.getItem("feed_draft_content") ?? "";
    return "";
  });

  // Open and pre-fill when a prompt is passed in
  useEffect(() => {
    if (promptContent) {
      setContent(promptContent);
      setOpen(true);
    }
  }, [promptContent]);
  const [images, setImages] = useState<File[]>([]);
  const [audience, setAudience] = useState<"everyone" | "connections">("everyone");
  const [mentions, setMentions] = useState<MentionTag[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tagMode, setTagMode] = useState<"profile" | "company" | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState<MentionTag[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save draft
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("feed_draft_content", content);
  }, [content]);

  function handleDiscard() {
    setContent("");
    setImages([]);
    setAudience("everyone");
    setMentions([]);
    setShowEmojiPicker(false);
    setTagMode(null);
    setTagQuery("");
    setTagResults([]);
    setError(null);
    if (typeof window !== "undefined") localStorage.removeItem("feed_draft_content");
    setOpen(false);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages(prev => [...prev, ...files].slice(0, 5));
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function searchMentions(type: "profile" | "company", query: string) {
    setTagQuery(query);
    if (query.trim().length < 2) { setTagResults([]); return; }
    try {
      const res = await fetch(`/api/feed/search-mentions?type=${type === "company" ? "company" : "person"}&q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setTagResults(data.results ?? []);
    } catch {
      setTagResults([]);
    }
  }

  function addMention(result: MentionTag) {
    setMentions(prev => prev.some(m => m.type === result.type && m.id === result.id) ? prev : [...prev, result]);
    setTagMode(null);
    setTagQuery("");
    setTagResults([]);
  }

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    setError(null);

    try {
      const supabase = getSupabase() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Sign in to post."); return; }

      // Upload images/videos first
      const imageUrls: string[] = [];
      for (const file of images) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/feed/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { upsert: false });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }

      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), image_urls: imageUrls, trade_tags: [], author_type: "profile", audience, mentions }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post."); return; }

      if (typeof window !== "undefined") localStorage.removeItem("feed_draft_content");
      trackEvent("feed_post");
      setContent("");
      setImages([]);
      setAudience("everyone");
      setMentions([]);
      setOpen(false);
      onPost(data.newBadges ?? []);
    } catch {
      setError("Something went wrong.");
    } finally {
      setPosting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 text-left text-sm text-slate-400 hover:text-slate-200 transition-colors bg-slate-800 border border-slate-600 rounded-2xl p-4">
        <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-600/40 flex items-center justify-center">
          <PenLine className="w-4 h-4 text-orange-400" />
        </div>
        {content ? <span className="text-orange-400 text-xs font-semibold">Draft saved — tap to continue</span> : "Share a project update, milestone, or photo…"}
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-end">
        <button onClick={handleDiscard} className="text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What are you working on? Project update, milestone, crew availability…"
          rows={4}
          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none"
          autoFocus
        />
        <button
          type="button"
          onClick={() => setShowEmojiPicker(v => !v)}
          className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-orange-400 transition-colors"
          title="Insert emoji"
        >
          <Smile className="w-4 h-4" />
        </button>
        {showEmojiPicker && (
          <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-600 rounded-xl p-2 grid grid-cols-8 gap-0.5 shadow-xl z-20 w-64">
            {EMOJI_OPTIONS.map(emoji => (
              <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="text-base hover:bg-slate-700 rounded-lg p-1.5 transition-colors">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tagged people/companies */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((m, i) => (
            <span key={`${m.type}-${m.id}`} className="flex items-center gap-1 px-2 py-1 bg-orange-600/10 border border-orange-600/30 text-orange-400 text-xs font-semibold rounded-full">
              @{m.name}
              <button type="button" onClick={() => setMentions(prev => prev.filter((_, j) => j !== i))} className="hover:text-orange-200">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Image/video previews */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
              {f.type.startsWith("video/")
                ? <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                : <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />}
              <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Media + tagging toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple capture="environment" className="hidden" onChange={handleImagePick} />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 rounded-xl transition-colors">
          <ImagePlus className="w-3.5 h-3.5" /> Photo or Video
        </button>
        <button onClick={() => setTagMode(tagMode === "profile" ? null : "profile")} className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors ${tagMode === "profile" ? "bg-orange-600/10 border-orange-600/40 text-orange-400" : "text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-700"}`}>
          <UserPlus className="w-3.5 h-3.5" /> Tag a Person
        </button>
        <button onClick={() => setTagMode(tagMode === "company" ? null : "company")} className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors ${tagMode === "company" ? "bg-orange-600/10 border-orange-600/40 text-orange-400" : "text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-700"}`}>
          <Building2 className="w-3.5 h-3.5" /> Tag a Company
        </button>
      </div>

      {/* Inline tag search */}
      {tagMode && (
        <div className="relative">
          <input
            value={tagQuery}
            onChange={e => searchMentions(tagMode, e.target.value)}
            placeholder={tagMode === "profile" ? "Search members by name…" : "Search companies by name…"}
            autoFocus
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
          {tagResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded-xl overflow-hidden shadow-xl z-20">
              {tagResults.map(r => (
                <button key={`${r.type}-${r.id}`} type="button" onClick={() => addMention(r)} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors">
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audience selector */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
        <span className="text-xs text-slate-400 mr-1">Visible to:</span>
        <button
          onClick={() => setAudience("everyone")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${audience === "everyone" ? "bg-orange-600 border-orange-600 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"}`}
        >
          <Globe className="w-3.5 h-3.5" /> Everyone
        </button>
        <button
          onClick={() => setAudience("connections")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${audience === "connections" ? "bg-orange-600 border-orange-600 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"}`}
        >
          <Users className="w-3.5 h-3.5" /> Connections only
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        {audience === "everyone" ? "Visible to the entire network and directory." : "Visible only to people you follow or who follow you."}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <button onClick={handleDiscard} className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors">Discard</button>
        <button
          onClick={handlePost}
          disabled={posting || !content.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Post Update
        </button>
      </div>
    </div>
  );
}

// ── Edit composer ─────────────────────────────────────────────────────────────

function EditComposer({ post, onDone, onCancel }: { post: FeedPost; onDone: () => void; onCancel: () => void }) {
  const [content, setContent] = useState(post.content);
  const [project, setProject] = useState(post.project_name ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/feed/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, project_name: project }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="bg-slate-800/60 border border-orange-700/40 rounded-2xl p-4 space-y-3">
      <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Editing Post</span>
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 resize-none" />
      <input value={project} onChange={e => setProject(e.target.value)} placeholder="Project name" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={save} disabled={saving || !content.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function FeedPageInner() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [followedSources, setFollowedSources] = useState<Set<string>>(new Set());
  const [availableNow] = useState(() => searchParams.get("available") === "1");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentAuthorId, setCurrentAuthorId] = useState<string | null>(null);
  const [currentAuthorType, setCurrentAuthorType] = useState<"profile" | "company" | null>(null);
  const [connectionAuthorKeys, setConnectionAuthorKeys] = useState<Set<string>>(new Set());
  const [isGC, setIsGC] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);
  const [celebrationBadges, setCelebrationBadges] = useState<Badge[]>([]);
  const [userState, setUserState] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const db = getSupabase() as any;
      const { data: raw } = await db.from("feed_posts").select("*").order("created_at", { ascending: false }).limit(150);
      if (!raw?.length) { setPosts([]); setLoading(false); return; }

      const profileIds = raw.filter((p: any) => p.author_type === "profile").map((p: any) => p.author_id);
      const companyIds = raw.filter((p: any) => p.author_type === "company").map((p: any) => p.author_id);
      const [profRes, compRes] = await Promise.all([
        profileIds.length > 0 ? db.from("profiles").select("id, first_name, last_name, slug, trade, location_city, location_state, verification_status, profile_type, availability_status, legacy_member").in("id", profileIds) : { data: [] },
        companyIds.length > 0 ? db.from("companies").select("id, name, slug, trade_specialties, location_city, location_state, verification_status, availability_status").in("id", companyIds) : { data: [] },
      ]);

      const pm: Record<string, any> = {};
      const cm: Record<string, any> = {};
      for (const p of profRes.data ?? []) pm[p.id] = p;
      for (const c of compRes.data ?? []) cm[c.id] = c;

      const mapped: FeedPost[] = raw.map((p: any) => {
        if (p.author_type === "news" || p.is_industry_news) {
          return { ...p, author_name: p.news_source_name ?? "Industry News", author_slug: "", author_trade: "Industry News", author_location: "", author_verified: false, author_availability: "available", author_legacy_member: false };
        }
        if (p.author_type === "profile") {
          const prof = pm[p.author_id];
          return { ...p, author_name: prof ? `${prof.first_name} ${prof.last_name}` : "Unknown", author_slug: prof?.slug ?? "", author_trade: prof?.trade ?? "", author_location: prof ? [prof.location_city, prof.location_state].filter(Boolean).join(", ") : "", author_verified: canBeVerified(prof?.profile_type) && prof?.verification_status === "verified", author_availability: prof?.availability_status ?? "available", author_legacy_member: !!prof?.legacy_member };
        }
        const co = cm[p.author_id];
        return { ...p, author_name: co?.name ?? "Unknown", author_slug: co?.slug ?? "", author_trade: (co?.trade_specialties ?? [])[0] ?? "", author_location: co ? [co.location_city, co.location_state].filter(Boolean).join(", ") : "", author_verified: co?.verification_status === "verified", author_availability: co?.availability_status ?? "available", author_legacy_member: false };
      });

      // Drop industry news older than 60 days
      const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const mapped60 = mapped.filter(p =>
        !p.is_industry_news || new Date(p.created_at).getTime() > sixtyDaysAgo
      );

      // Fetch reaction counts for all posts
      const postIds = mapped60.map((p: any) => p.id);
      const { data: rxRows } = await db.from("post_reactions")
        .select("post_id, reaction_type, user_id")
        .in("post_id", postIds);

      const currentUid = (await db.auth.getUser())?.data?.user?.id ?? null;
      const rxMap: Record<string, ReactionData> = {};
      for (const r of rxRows ?? []) {
        if (!rxMap[r.post_id]) rxMap[r.post_id] = { counts: {}, mine: null };
        rxMap[r.post_id].counts[r.reaction_type] = (rxMap[r.post_id].counts[r.reaction_type] ?? 0) + 1;
        if (r.user_id === currentUid) rxMap[r.post_id].mine = r.reaction_type;
      }
      setReactions(rxMap);

      // Fetch comment counts for all posts in one round-trip via RPC
      const { data: cmtRows } = await db.rpc("get_post_comment_counts", { post_ids: postIds });
      const cmtMap: Record<string, number> = {};
      for (const r of cmtRows ?? []) cmtMap[r.post_id] = Number(r.cnt);
      setCommentCounts(cmtMap);

      setPosts(mapped60);
    } catch (err) {
      console.error("Feed fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Build the set of "<type>:<id>" author keys the viewer is connected to —
  // either the viewer follows them, or they follow the viewer back.
  const fetchConnections = useCallback(async (uid: string, authorId: string | null, authorType: "profile" | "company" | null) => {
    const db = getSupabase() as any;
    const keys = new Set<string>();

    const { data: followingRows } = await db.from("follows").select("following_id, following_type").eq("follower_user_id", uid);
    for (const r of followingRows ?? []) keys.add(`${r.following_type}:${r.following_id}`);

    if (authorId && authorType) {
      const { data: followerRows } = await db.from("follows").select("follower_user_id").eq("following_id", authorId).eq("following_type", authorType);
      const followerUserIds = (followerRows ?? []).map((r: any) => r.follower_user_id);
      if (followerUserIds.length > 0) {
        const [{ data: profs }, { data: comps }] = await Promise.all([
          db.from("profiles").select("id, user_id").in("user_id", followerUserIds),
          db.from("companies").select("id, user_id").in("user_id", followerUserIds),
        ]);
        for (const p of profs ?? []) keys.add(`profile:${p.id}`);
        for (const c of comps ?? []) keys.add(`company:${c.id}`);
      }
    }

    setConnectionAuthorKeys(keys);
  }, []);

  useEffect(() => {
    fetchPosts();
    const supabase = getSupabase();
    supabase?.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUser(user);
      setIsGC(user.user_metadata?.role === "gc");
      setIsAdmin(user.email === "andrew@tradeprotech.ai");

      // Onboarding: show for any logged-in user who hasn't dismissed or posted yet
      if (typeof window !== "undefined" && localStorage.getItem("feed_onboarding_dismissed") !== "1") {
        setShowOnboarding(true);
      }

      // Get author ID (profile or company)
      const db = supabase as any;
      const { data: prof } = await db.from("profiles").select("id, location_state").eq("user_id", user.id).single();
      const authorId = prof?.id ?? null;
      if (prof?.location_state) setUserState(prof.location_state);
      if (!authorId) {
        const { data: comp } = await db.from("companies").select("id").eq("user_id", user.id).single();
        if (comp) {
          setCurrentAuthorId(comp.id);
          setCurrentAuthorType("company");
          fetchConnections(user.id, comp.id, "company");
        } else {
          fetchConnections(user.id, null, null);
        }
        return;
      }
      setCurrentAuthorId(authorId);
      setCurrentAuthorType("profile");
      fetchConnections(user.id, authorId, "profile");

      // If they already have posts, suppress onboarding silently
      const { count } = await db.from("feed_posts").select("id", { count: "exact", head: true }).eq("author_id", authorId);
      if ((count ?? 0) > 0) {
        setShowOnboarding(false);
        if (typeof window !== "undefined") localStorage.setItem("feed_onboarding_dismissed", "1");
      }
    });

    // Load saved posts and followed sources
    fetch("/api/bookmarks").then(r => r.json()).then(d => {
      if (d.bookmarks) setSavedPosts(new Set(d.bookmarks));
    }).catch(() => {});
    fetch("/api/news/follow").then(r => r.json()).then(d => {
      if (d.sources) setFollowedSources(new Set(d.sources));
    }).catch(() => {});
  }, [fetchPosts, fetchConnections]);

  function dismissOnboarding() {
    setShowOnboarding(false);
    if (typeof window !== "undefined") localStorage.setItem("feed_onboarding_dismissed", "1");
  }

  function handleOnboardingPrompt(prompt: string) {
    setActivePrompt(prompt);
    setTimeout(() => setActivePrompt(undefined), 100); // reset so it can fire again
  }

  async function toggleSave(postId: string) {
    setSavedPosts(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId }) });
  }

  async function handleReact(postId: string, type: string | null) {
    // Optimistic update
    setReactions(prev => {
      const current = prev[postId] ?? { counts: {}, mine: null };
      const next = { counts: { ...current.counts }, mine: current.mine };
      if (current.mine) {
        next.counts[current.mine] = Math.max(0, (next.counts[current.mine] ?? 1) - 1);
        if (next.counts[current.mine] === 0) delete next.counts[current.mine];
      }
      if (type && type !== current.mine) {
        next.counts[type] = (next.counts[type] ?? 0) + 1;
        next.mine = type;
      } else {
        next.mine = null;
      }
      return { ...prev, [postId]: next };
    });
    const res = await fetch(`/api/feed/${postId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (data.counts !== undefined) {
      setReactions(prev => ({ ...prev, [postId]: { counts: data.counts, mine: data.reaction } }));
    }
  }

  async function toggleFollowSource(sourceName: string) {
    const next = !followedSources.has(sourceName);
    setFollowedSources(prev => {
      const s = new Set(prev);
      next ? s.add(sourceName) : s.delete(sourceName);
      return s;
    });
    await fetch("/api/news/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_name: sourceName }),
    });
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/feed/${postId}`, { method: "DELETE" });
    fetchPosts();
  }

  async function pinPost(postId: string) {
    await fetch(`/api/feed/${postId}/pin`, { method: "POST" });
    alert("Post pinned to your profile!");
  }

  function sharePost(post: FeedPost) {
    const url = `${window.location.origin}/${post.author_type === "company" ? "company" : "pro"}/${post.author_slug}`;
    const text = `${post.author_name} — ${post.content.slice(0, 100)}`;
    if (navigator.share) {
      navigator.share({ title: "TradePro Nexus", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => alert("Link copied!")).catch(() => {});
    }
  }

  function dmPost(post: FeedPost) {
    // GC DM — navigate to messages with pre-filled recipient
    window.location.href = `/messages?to=${post.author_id}&type=${post.author_type}&name=${encodeURIComponent(post.author_name)}`;
  }

  const sortedPosts = useMemo(
    () => buildFeedAlgorithm(posts, reactions, followedSources),
    [posts, reactions, followedSources],
  );

  const filtered = sortedPosts.filter(p => {
    if (availableNow && p.author_availability !== "available") return false;
    if (search && !p.content.toLowerCase().includes(search.toLowerCase()) && !p.author_name.toLowerCase().includes(search.toLowerCase()) && !(p.project_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (p.audience === "connections") {
      const isOwn = currentAuthorId !== null && p.author_id === currentAuthorId && p.author_type === currentAuthorType;
      const isConnected = connectionAuthorKeys.has(`${p.author_type}:${p.author_id}`);
      if (!isOwn && !isConnected) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <Navbar />
      {celebrationBadges.length > 0 && (
        <BadgeCelebration badges={celebrationBadges} onClose={() => setCelebrationBadges([])} />
      )}
      {/* Three-column layout: white sidebars, dark navy center */}
      <div className="flex max-w-[1360px] mx-auto">

        {/* LEFT SIDEBAR — white */}
        <aside className="hidden xl:block w-[272px] flex-shrink-0 bg-white border-r border-[#e2e8f0] min-h-screen sticky top-0 pt-20 px-4 pb-12 overflow-y-auto max-h-screen">
          <FeedLeftSidebar userId={currentUser?.id ?? null} authorId={currentAuthorId} />
        </aside>

        {/* CENTER FEED — dark navy, all existing content unchanged */}
        <main className="flex-1 min-w-0 bg-[#0f172a] text-slate-100 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-green-400">Live Feed</span>
              <Rss className="w-3.5 h-3.5 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Work is <span className="text-orange-400">Currency.</span></h1>
          </div>
          {isGC && (
            <Link href="/messages" className="flex items-center gap-1.5 px-3 py-2 bg-blue-900/40 border border-blue-800/50 rounded-xl text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Messages
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts, names, projects…" className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>

        {/* Composer */}
        {currentUser && (
          <div className="mb-5 space-y-3">
            {showOnboarding && (
              <OnboardingCard
                onDismiss={dismissOnboarding}
                onPrompt={handleOnboardingPrompt}
              />
            )}
            <div className="flex items-center gap-2 px-1">
              <Plus className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-white">Create a Post</span>
            </div>
            <PostComposer
              onPost={(newBadges) => { dismissOnboarding(); fetchPosts(); if (newBadges?.length) setCelebrationBadges(newBadges); }}
              promptContent={activePrompt}
            />
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="bg-white border border-[#e2e8f0] rounded-2xl p-4 animate-pulse h-32 shadow-sm" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((post, i) => (
              // Inject sponsored card every 5 posts (after index 4, 9, 14…)
              // Roadmap: "every 5-6 posts — sponsored/ad card, clearly labeled"
              <div key={post.id}>
                {i > 0 && i % 5 === 0 && <div className="mb-4"><FeedAdCard /></div>}
              {editingPost?.id === post.id ? (
                <EditComposer key={post.id} post={post} onDone={() => { setEditingPost(null); fetchPosts(); }} onCancel={() => setEditingPost(null)} />
              ) : (
                <motion.div key={post.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                  <PostCard
                    post={post}
                    reactionData={reactions[post.id] ?? { counts: {}, mine: null }}
                    saved={savedPosts.has(post.id)}
                    followed={followedSources.has(post.news_source_name ?? "")}
                    currentUserId={currentUser?.id ?? null}
                    isGC={isGC}
                    isAdmin={isAdmin}
                    currentAuthorId={currentAuthorId}
                    commentCount={commentCounts[post.id] ?? 0}
                    onReact={(type) => handleReact(post.id, type)}
                    onSave={() => toggleSave(post.id)}
                    onFollow={() => post.news_source_name && toggleFollowSource(post.news_source_name)}
                    onShare={() => sharePost(post)}
                    onDelete={() => deletePost(post.id)}
                    onEdit={() => setEditingPost(post)}
                    onPin={() => pinPost(post.id)}
                    onDM={() => dmPost(post)}
                    onCommentCountChange={(delta) => setCommentCounts(prev => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + delta }))}
                  />
                </motion.div>
              )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Rss className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold mb-1">{search || availableNow ? "No posts match your filters" : "The feed is empty right now"}</p>
            <p className="text-slate-600 text-sm">{search || availableNow ? "Try a different search or clear your filters." : "Be one of the first to share an update from the field."}</p>
            {availableNow ? (
              <Link href="/feed" className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors">
                Clear Filters
              </Link>
            ) : search ? (
              <button
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            ) : !currentUser ? (
              <Link href="/signup" className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-600/20"><HardHat className="w-4 h-4" /> Join and Post Updates</Link>
            ) : null}
          </div>
        )}
      </div>
        </main>
        {/* END CENTER FEED */}

        {/* RIGHT SIDEBAR — white */}
        <aside className="hidden xl:block w-[272px] flex-shrink-0 bg-white border-l border-[#e2e8f0] min-h-screen sticky top-0 pt-20 px-4 pb-12 overflow-y-auto max-h-screen">
          <FeedRightSidebar
            userId={currentUser?.id ?? null}
            userState={userState}
            followedIds={connectionAuthorKeys}
          />
        </aside>

      </div>
      {/* END three-column layout */}
    </div>
  );
}

export default function FeedPage() {
  return <Suspense fallback={null}><FeedPageInner /></Suspense>;
}
