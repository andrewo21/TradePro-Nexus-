"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2, Newspaper, HardHat, Building2, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

interface Post {
  id: string;
  author_type: string;
  content: string;
  project_name: string | null;
  is_industry_news: boolean;
  news_source_name: string | null;
  created_at: string;
  author_name: string;
  author_slug: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function ModerationPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "user" | "news">("all");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const db = getSupabase() as any;

    const { data: raw } = await db
      .from("feed_posts")
      .select("id, author_id, author_type, content, project_name, is_industry_news, news_source_name, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!raw?.length) { setPosts([]); setLoading(false); return; }

    const profileIds = raw.filter((p: any) => p.author_type === "profile").map((p: any) => p.author_id);
    const companyIds = raw.filter((p: any) => p.author_type === "company").map((p: any) => p.author_id);

    const [profRes, compRes] = await Promise.all([
      profileIds.length > 0
        ? db.from("profiles").select("id, first_name, last_name, slug").in("id", profileIds)
        : { data: [] },
      companyIds.length > 0
        ? db.from("companies").select("id, name, slug").in("id", companyIds)
        : { data: [] },
    ]);

    const pm: Record<string, any> = {};
    const cm: Record<string, any> = {};
    for (const p of profRes.data ?? []) pm[p.id] = p;
    for (const c of compRes.data ?? []) cm[c.id] = c;

    const mapped: Post[] = raw.map((p: any) => {
      if (p.is_industry_news) return { ...p, author_name: p.news_source_name ?? "Industry News", author_slug: "" };
      if (p.author_type === "profile") {
        const prof = pm[p.author_id];
        return { ...p, author_name: prof ? `${prof.first_name} ${prof.last_name}` : "Unknown", author_slug: prof?.slug ?? "" };
      }
      const co = cm[p.author_id];
      return { ...p, author_name: co?.name ?? "Unknown", author_slug: co?.slug ?? "" };
    });

    setPosts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    const db = getSupabase();
    db?.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) {
        setAuthorized(true);
        fetchPosts();
      } else {
        setAuthorized(false);
        setLoading(false);
      }
    });
  }, [fetchPosts]);

  async function deletePost(id: string) {
    if (!confirm("Remove this post permanently?")) return;
    setDeletingId(id);
    await fetch(`/api/feed/${id}`, { method: "DELETE" });
    setDeleted(prev => new Set(prev).add(id));
    setDeletingId(null);
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Not authorized.</p>
      </div>
    );
  }

  const visible = posts.filter(p => {
    if (deleted.has(p.id)) return false;
    if (filter === "user") return !p.is_industry_news;
    if (filter === "news") return p.is_industry_news;
    return true;
  });

  const userCount = posts.filter(p => !p.is_industry_news && !deleted.has(p.id)).length;
  const newsCount = posts.filter(p => p.is_industry_news && !deleted.has(p.id)).length;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">Admin Only</span>
            </div>
            <h1 className="text-2xl font-black text-white">Feed Moderation</h1>
            <p className="text-slate-400 text-sm mt-0.5">Remove inappropriate posts from the Live Feed</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPosts}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link href="/admin/waitlist" className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400 hover:text-white transition-colors">
              ← Admin
            </Link>
          </div>
        </div>

        {/* Stats + filter */}
        <div className="flex items-center gap-3 mb-5">
          {[
            { key: "all",  label: `All (${userCount + newsCount})` },
            { key: "user", label: `User Posts (${userCount})` },
            { key: "news", label: `Industry News (${newsCount})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === tab.key ? "bg-red-900/40 border border-red-800/60 text-red-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">Deletions are permanent and immediate. There is no undo.</p>
        </div>

        {/* Posts list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No posts to show.</div>
        ) : (
          <div className="space-y-3">
            {visible.map(post => (
              <div key={post.id} className={`bg-slate-800/60 border rounded-xl p-4 flex items-start gap-4 ${post.is_industry_news ? "border-slate-700/40" : "border-slate-600/50"}`}>
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${post.is_industry_news ? "bg-blue-900/30 border border-blue-800/40" : post.author_type === "company" ? "bg-orange-900/30 border border-orange-800/40" : "bg-slate-700/60 border border-slate-600/50"}`}>
                  {post.is_industry_news
                    ? <Newspaper className="w-4 h-4 text-blue-400" />
                    : post.author_type === "company"
                    ? <Building2 className="w-4 h-4 text-orange-400" />
                    : <HardHat className="w-4 h-4 text-slate-300" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.is_industry_news ? (
                      <span className="text-xs font-semibold text-blue-400">{post.news_source_name}</span>
                    ) : post.author_slug ? (
                      <Link href={`/${post.author_type === "company" ? "company" : "pro"}/${post.author_slug}`}
                        className="text-xs font-semibold text-white hover:text-orange-300 transition-colors" target="_blank">
                        {post.author_name}
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-white">{post.author_name}</span>
                    )}
                    <span className="text-[10px] text-slate-600">{timeAgo(post.created_at)}</span>
                    {post.is_industry_news && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 border border-blue-800/40 rounded-full text-blue-400 font-semibold">Industry News</span>}
                  </div>
                  {post.project_name && (
                    <p className="text-xs text-slate-400 font-semibold mb-0.5 truncate">{post.project_name}</p>
                  )}
                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">{post.content}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deletingId === post.id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-900/30 border border-red-800/50 hover:bg-red-900/50 text-red-400 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {deletingId === post.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
