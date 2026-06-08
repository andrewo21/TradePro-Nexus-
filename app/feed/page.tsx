"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck, MapPin, Clock, Filter,
  ChevronDown, Rss, HardHat, Building2, ArrowRight,
  Send, Loader2, PenLine, X, Camera, Bookmark,
  Share2, MoreHorizontal, Edit3, Trash2, Pin, Search, MessageCircle,
  Newspaper, ExternalLink, Plus, Check
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { SECTORS, TRADE_GROUPS } from "@/lib/constants";
import FeedAdCard from "@/components/FeedAdCard";
import DesktopAdRail from "@/components/DesktopAdRail";
import BadgeCelebration from "@/components/BadgeCelebration";
import type { Badge } from "@/lib/badge-definitions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedPost {
  id: string;
  author_id: string | null;
  author_type: "profile" | "company" | "news";
  content: string;
  project_name: string | null;
  trade_tags: string[];
  image_urls: string[];
  likes_count: number;
  created_at: string;
  author_name: string;
  author_slug: string;
  author_trade: string;
  author_location: string;
  author_verified: boolean;
  author_availability: string;
  is_industry_news: boolean;
  news_source_name: string | null;
  news_source_domain: string | null;
  news_article_url: string | null;
  featured_image_url: string | null;
}

type ReactionData = { counts: Record<string, number>; mine: string | null };

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
    return { border: "border-l-[3px] border-yellow-500/60", badge: "bg-yellow-950/40 border-yellow-900/50", dot: "bg-yellow-400" };
  if (n.includes("ibew") || n.includes("carpenters") || n.includes("plumber") || n.includes("nccer") || n.includes("skills") || n.includes("labor") || n.includes("workforce") || n.includes("clrc") || n.includes("ua "))
    return { border: "border-l-[3px] border-blue-500/60",   badge: "bg-blue-950/40 border-blue-900/50",   dot: "bg-blue-400" };
  if (n.includes("enr") || n.includes("construction dive") || n.includes("for construction") || n.includes("constructor") || n.includes("agc") || n.includes("procore") || n.includes("building design") || n.includes("executive"))
    return { border: "border-l-[3px] border-orange-500/60", badge: "bg-orange-950/40 border-orange-900/50", dot: "bg-orange-400" };
  if (n.includes("electrical") || n.includes("plumbing") || n.includes("hvac") || n.includes("roofing") || n.includes("nrca") || n.includes("cfma") || n.includes("autodesk"))
    return { border: "border-l-[3px] border-green-500/60",  badge: "bg-green-950/40 border-green-900/50",  dot: "bg-green-400" };
  return { border: "border-l-[3px] border-slate-600/40", badge: "bg-slate-800/60 border-slate-700/50", dot: "bg-slate-400" };
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

const ALL_FEED_TRADES = ["All Trades", ...TRADE_GROUPS[0].trades, ...TRADE_GROUPS[1].trades.slice(0, 5)];
const FEED_SECTORS = ["All Sectors", ...SECTORS];

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post, reactionData, saved, followed, currentUserId, isGC, currentAuthorId,
  onReact, onSave, onFollow, onShare, onDelete, onEdit, onPin, onDM,
}: {
  post: FeedPost;
  reactionData: ReactionData;
  saved: boolean;
  followed: boolean;
  currentUserId: string | null;
  isGC: boolean;
  currentAuthorId: string | null;
  onReact: (type: string | null) => void;
  onSave: () => void;
  onFollow: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDM: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = post.author_id !== null && post.author_id === currentAuthorId;
  const isNews = post.is_industry_news;
  const cat = isNews ? getNewsCategoryStyle(post.news_source_name) : null;
  const totalReactions = Object.values(reactionData.counts).reduce((a, b) => a + b, 0);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${
      isNews
        ? `bg-slate-800/50 border-slate-600/60 hover:border-slate-500/80 ${cat?.border ?? ""}`
        : "bg-slate-800/70 border-slate-600/50 hover:border-slate-500 shadow-sm"
    }`}>

      {/* Industry News header bar */}
      {isNews && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${cat?.badge ?? "bg-slate-800/60 border-slate-700/50"}`}>
          {post.news_source_domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${post.news_source_domain}&sz=32`}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Newspaper className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Industry News</span>
          <span className="text-slate-600 text-[10px]">·</span>
          <span className="text-[10px] text-slate-400 truncate flex-1">{post.news_source_name}</span>
          {/* Follow source button */}
          {currentUserId && (
            <button
              onClick={onFollow}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${
                followed
                  ? "text-green-400 border-green-700/60 bg-green-900/20"
                  : "text-slate-400 border-slate-600 hover:border-slate-500 hover:text-slate-200"
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
          <div className="aspect-[3/1] overflow-hidden bg-slate-900">
            <img
              src={post.featured_image_url}
              alt=""
              className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
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
              <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600/50 flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-4 h-4 text-slate-400" />
              </div>
            ) : (
              <Link
                href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
                className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-600/40 flex items-center justify-center font-black text-orange-400 text-sm flex-shrink-0 hover:border-orange-400 transition-colors"
              >
                {post.author_type === "company" ? <Building2 className="w-4 h-4" /> : post.author_name.slice(0, 2).toUpperCase()}
              </Link>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isNews ? (
                  <span className="font-semibold text-slate-200 text-sm">{post.news_source_name}</span>
                ) : (
                  <Link href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`} className="font-bold text-white text-sm hover:text-orange-300 transition-colors">
                    {post.author_name}
                  </Link>
                )}
                {!isNews && post.author_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/60 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
                {!isNews && post.author_availability === "available" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-300 bg-green-900/30 px-1.5 py-0.5 rounded-full border border-green-800/60">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Available Now
                  </span>
                )}
              </div>
              {!isNews && <p className="text-xs text-orange-400 font-semibold mt-0.5">{post.author_trade}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                {post.author_location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{post.author_location}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Actions menu — user posts only */}
          {!isNews && (
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuOpen(!menuOpen)} className="text-slate-500 hover:text-slate-300 p-1 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden" onMouseLeave={() => setMenuOpen(false)}>
                  <button onClick={() => { onShare(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <button onClick={() => { onSave(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
                    <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-orange-400 text-orange-400" : ""}`} /> {saved ? "Saved" : "Save Post"}
                  </button>
                  {isOwner && <>
                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => { onPin(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
                      <Pin className="w-3.5 h-3.5" /> Pin to Profile
                    </button>
                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-slate-700 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>}
                  {isGC && !isOwner && (
                    <button onClick={() => { onDM(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-blue-400 hover:bg-slate-700 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> Send Message
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
            className="block text-white font-bold text-sm leading-snug mb-2 hover:text-slate-200 transition-colors">
            {post.project_name}
          </a>
        )}
        {!isNews && post.project_name && (
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Project: {post.project_name}</p>
        )}
        <p className="text-slate-300 text-sm leading-relaxed">{post.content}</p>

        {/* User post gallery */}
        {!isNews && post.image_urls?.length > 0 && (
          <div className={`grid gap-1.5 mt-3 ${post.image_urls.length >= 3 ? "grid-cols-3" : post.image_urls.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {post.image_urls.slice(0, 3).map((url, i) => (
              <div key={i} className="aspect-video rounded-lg overflow-hidden bg-slate-900">
                <img src={url} alt="Work photo" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {!isNews && post.trade_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.trade_tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-slate-700/60 border border-slate-600/60 text-slate-400 text-[10px] font-semibold rounded-full">#{tag.replace(/\s+/g, "")}</span>
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
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                  active
                    ? "bg-orange-600/25 border border-orange-600/50 text-white"
                    : "bg-slate-700/40 border border-slate-700/60 text-slate-400 hover:bg-slate-700/70 hover:text-slate-200"
                } ${!currentUserId ? "opacity-50 cursor-default" : "cursor-pointer"}`}
              >
                <span>{r.emoji}</span>
                {count > 0 && <span className="font-semibold">{count}</span>}
              </button>
            );
          })}
          {totalReactions > 0 && (
            <span className="text-[10px] text-slate-600 ml-1">{totalReactions} reaction{totalReactions !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/50 mt-2">
        <div className="flex items-center gap-2">
          {!isNews && (
            <button onClick={onSave} className={`flex items-center gap-1 text-xs font-semibold transition-colors ${saved ? "text-orange-400" : "text-slate-500 hover:text-orange-400"}`}>
              <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-orange-400" : ""}`} />
              <span>{saved ? "Saved" : "Save"}</span>
            </button>
          )}
        </div>
        {isNews ? (
          <a href={post.news_article_url ?? "#"} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Read Article
          </a>
        ) : (
          <Link href={post.author_type === "company" ? `/company/${post.author_slug}` : `/pro/${post.author_slug}`}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-400 transition-colors">
            View {post.author_type === "company" ? "Company" : "Trade Card"} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
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
  const [project, setProject] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-save draft
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("feed_draft_content", content);
  }, [content]);

  function handleDiscard() {
    setContent("");
    setProject("");
    setImages([]);
    setError(null);
    if (typeof window !== "undefined") localStorage.removeItem("feed_draft_content");
    setOpen(false);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImages(prev => [...prev, ...files].slice(0, 5));
  }

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    setError(null);

    try {
      const supabase = getSupabase() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Sign in to post."); return; }

      // Upload images first
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
        body: JSON.stringify({ content: content.trim(), project_name: project.trim() || undefined, image_urls: imageUrls, trade_tags: [], author_type: "profile" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post."); return; }

      if (typeof window !== "undefined") localStorage.removeItem("feed_draft_content");
      setContent("");
      setProject("");
      setImages([]);
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
        {content ? <span className="text-orange-400 text-xs font-semibold">Draft saved — tap to continue</span> : "What are you working on?"}
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">New Post</span>
        <button onClick={handleDiscard} className="text-slate-400 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What are you working on? Project update, milestone, crew availability…"
        rows={4}
        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none"
        autoFocus
      />
      <input
        value={project}
        onChange={e => setProject(e.target.value)}
        placeholder="Project name (optional)"
        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex items-center gap-2">
        {/* Photo upload — capture="environment" opens camera on mobile PWA */}
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleImagePick} />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 rounded-xl transition-colors">
          <Camera className="w-3.5 h-3.5" /> Photo
        </button>
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
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [followedSources, setFollowedSources] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [tradeFilter, setTradeFilter] = useState("All Trades");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [availableNow, setAvailableNow] = useState(() => searchParams.get("available") === "1");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentAuthorId, setCurrentAuthorId] = useState<string | null>(null);
  const [isGC, setIsGC] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);
  const [celebrationBadges, setCelebrationBadges] = useState<Badge[]>([]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const db = getSupabase() as any;
      const { data: raw } = await db.from("feed_posts").select("*").order("created_at", { ascending: false }).limit(50);
      if (!raw?.length) { setPosts([]); setLoading(false); return; }

      const profileIds = raw.filter((p: any) => p.author_type === "profile").map((p: any) => p.author_id);
      const companyIds = raw.filter((p: any) => p.author_type === "company").map((p: any) => p.author_id);
      const [profRes, compRes] = await Promise.all([
        profileIds.length > 0 ? db.from("profiles").select("id, first_name, last_name, slug, trade, location_city, location_state, verification_status, availability_status").in("id", profileIds) : { data: [] },
        companyIds.length > 0 ? db.from("companies").select("id, name, slug, trade_specialties, location_city, location_state, verification_status, availability_status").in("id", companyIds) : { data: [] },
      ]);

      const pm: Record<string, any> = {};
      const cm: Record<string, any> = {};
      for (const p of profRes.data ?? []) pm[p.id] = p;
      for (const c of compRes.data ?? []) cm[c.id] = c;

      const mapped: FeedPost[] = raw.map((p: any) => {
        if (p.author_type === "news" || p.is_industry_news) {
          return { ...p, author_name: p.news_source_name ?? "Industry News", author_slug: "", author_trade: "Industry News", author_location: "", author_verified: false, author_availability: "available" };
        }
        if (p.author_type === "profile") {
          const prof = pm[p.author_id];
          return { ...p, author_name: prof ? `${prof.first_name} ${prof.last_name}` : "Unknown", author_slug: prof?.slug ?? "", author_trade: prof?.trade ?? "", author_location: prof ? [prof.location_city, prof.location_state].filter(Boolean).join(", ") : "", author_verified: prof?.verification_status === "verified", author_availability: prof?.availability_status ?? "available" };
        }
        const co = cm[p.author_id];
        return { ...p, author_name: co?.name ?? "Unknown", author_slug: co?.slug ?? "", author_trade: (co?.trade_specialties ?? [])[0] ?? "", author_location: co ? [co.location_city, co.location_state].filter(Boolean).join(", ") : "", author_verified: co?.verification_status === "verified", author_availability: co?.availability_status ?? "available" };
      });

      // Fetch reaction counts for all posts
      const postIds = raw.map((p: any) => p.id);
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

      setPosts(mapped);
    } catch (err) {
      console.error("Feed fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    const supabase = getSupabase();
    supabase?.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUser(user);
      setIsGC(user.user_metadata?.role === "gc");

      // Onboarding: show for any logged-in user who hasn't dismissed or posted yet
      if (typeof window !== "undefined" && localStorage.getItem("feed_onboarding_dismissed") !== "1") {
        setShowOnboarding(true);
      }

      // Get author ID (profile or company)
      const db = supabase as any;
      const { data: prof } = await db.from("profiles").select("id").eq("user_id", user.id).single();
      const authorId = prof?.id ?? null;
      if (!authorId) {
        const { data: comp } = await db.from("companies").select("id").eq("user_id", user.id).single();
        if (comp) setCurrentAuthorId(comp.id);
        return;
      }
      setCurrentAuthorId(authorId);

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
  }, [fetchPosts]);

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

  const filtered = posts.filter(p => {
    if (availableNow && p.author_availability !== "available") return false;
    if (tradeFilter !== "All Trades" && p.author_trade !== tradeFilter && !p.trade_tags.some(t => t === tradeFilter)) return false;
    if (sectorFilter !== "All Sectors" && !p.trade_tags.some(t => t === sectorFilter)) return false;
    if (search && !p.content.toLowerCase().includes(search.toLowerCase()) && !p.author_name.toLowerCase().includes(search.toLowerCase()) && !(p.project_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      {/* Desktop ad rails — hidden on mobile per roadmap */}
      <DesktopAdRail side="left" />
      <DesktopAdRail side="right" />
      {celebrationBadges.length > 0 && (
        <BadgeCelebration badges={celebrationBadges} onClose={() => setCelebrationBadges([])} />
      )}
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
          </div>
          <div className="flex items-center gap-2">
            {isGC && (
              <Link href="/messages" className="flex items-center gap-1.5 px-3 py-2 bg-blue-900/40 border border-blue-800/50 rounded-xl text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> Messages
              </Link>
            )}
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filter
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts, names, projects…" className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 mb-5 space-y-3">
            <button onClick={() => setAvailableNow(!availableNow)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${availableNow ? "bg-green-900/40 border-green-700 text-green-400" : "bg-slate-900 border-slate-600 text-slate-400 hover:border-green-700/50"}`}>
              <span className={`w-2 h-2 rounded-full ${availableNow ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} /> Available Now Only
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Trade</p>
              <div className="flex flex-wrap gap-2">
                {ALL_FEED_TRADES.map(t => (
                  <button key={t} onClick={() => setTradeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tradeFilter === t ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sector</p>
              <div className="flex flex-wrap gap-2">
                {FEED_SECTORS.map(s => (
                  <button key={s} onClick={() => setSectorFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sectorFilter === s ? "bg-blue-700 text-white" : "bg-slate-900 text-slate-400 border border-slate-600 hover:border-slate-400"}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        {currentUser && (
          <div className="mb-5 space-y-3">
            {showOnboarding && (
              <OnboardingCard
                onDismiss={dismissOnboarding}
                onPrompt={handleOnboardingPrompt}
              />
            )}
            <PostComposer
              onPost={(newBadges) => { dismissOnboarding(); fetchPosts(); if (newBadges?.length) setCelebrationBadges(newBadges); }}
              promptContent={activePrompt}
            />
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 animate-pulse h-32" />)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((post, i) => (
              // Inject sponsored card every 5 posts (after index 4, 9, 14…)
              // Roadmap: "every 5-6 posts — sponsored/ad card, clearly labeled"
              <div key={post.id}>
                {i > 0 && i % 5 === 0 && <div className="mb-4"><FeedAdCard index={Math.floor(i / 5) - 1} /></div>}
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
                    currentAuthorId={currentAuthorId}
                    onReact={(type) => handleReact(post.id, type)}
                    onSave={() => toggleSave(post.id)}
                    onFollow={() => post.news_source_name && toggleFollowSource(post.news_source_name)}
                    onShare={() => sharePost(post)}
                    onDelete={() => deletePost(post.id)}
                    onEdit={() => setEditingPost(post)}
                    onPin={() => pinPost(post.id)}
                    onDM={() => dmPost(post)}
                  />
                </motion.div>
              )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Rss className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold mb-1">{search || availableNow || tradeFilter !== "All Trades" ? "No posts match your filters" : "The feed is empty right now"}</p>
            {!currentUser && <Link href="/signup" className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors"><HardHat className="w-4 h-4" /> Join and Post Updates</Link>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedPage() {
  return <Suspense fallback={null}><FeedPageInner /></Suspense>;
}
