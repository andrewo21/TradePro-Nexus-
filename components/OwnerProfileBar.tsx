"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, Save, X, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

interface Post {
  id: string;
  content: string;
  project_name: string | null;
  created_at: string;
}

interface EditFields {
  bio: string;
  phone: string;
  email: string;
  location_city: string;
  location_state: string;
  trade: string;
  years_experience: string;
}

interface Props {
  profileId: string;
  initialBio: string;
  initialPhone: string;
  initialEmail: string;
  initialCity: string;
  initialState: string;
  initialTrade: string;
  initialYears: number;
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

export default function OwnerProfileBar({
  profileId,
  initialBio,
  initialPhone,
  initialEmail,
  initialCity,
  initialState,
  initialTrade,
  initialYears,
}: Props) {
  const [panel, setPanel] = useState<"none" | "edit" | "posts">("none");
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [fields, setFields] = useState<EditFields>({
    bio: initialBio,
    phone: initialPhone,
    email: initialEmail,
    location_city: initialCity,
    location_state: initialState,
    trade: initialTrade,
    years_experience: String(initialYears),
  });

  useEffect(() => {
    if (panel !== "posts" || postsLoaded) return;
    const db = getSupabase() as any;
    db.from("feed_posts")
      .select("id, content, project_name, created_at")
      .eq("author_id", profileId)
      .eq("author_type", "profile")
      .eq("is_industry_news", false)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }: any) => {
        setPosts(data ?? []);
        setPostsLoaded(true);
      });
  }, [panel, profileId, postsLoaded]);

  async function deletePost(postId: string) {
    setDeleting(postId);
    try {
      const res = await fetch(`/api/feed/${postId}`, { method: "DELETE" });
      if (res.ok) setPosts(p => p.filter(x => x.id !== postId));
    } finally {
      setDeleting(null);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          years_experience: parseInt(fields.years_experience) || 0,
        }),
      });
      setSaveMsg(res.ok ? "Saved." : "Something went wrong.");
      if (res.ok) setTimeout(() => setSaveMsg(""), 2500);
    } finally {
      setSaving(false);
    }
  }

  function toggle(next: "edit" | "posts") {
    setPanel(p => p === next ? "none" : next);
  }

  return (
    <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl mb-4 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-orange-400 uppercase tracking-widest">Your Trade Card</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              panel === "edit"
                ? "bg-orange-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
          >
            <Pencil className="w-3 h-3" />
            {panel === "edit" ? "Close Edit" : "Edit Trade Card"}
          </button>
          <button
            onClick={() => toggle("posts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              panel === "posts"
                ? "bg-slate-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
          >
            {panel === "posts" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            My Posts
          </button>
        </div>
      </div>

      {/* Edit Panel */}
      {panel === "edit" && (
        <div className="border-t border-orange-800/30 px-4 py-4 space-y-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-3">Update your info — changes are live immediately</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trade / Specialty</label>
              <input
                value={fields.trade}
                onChange={e => setFields(f => ({ ...f, trade: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Years Experience</label>
              <input
                type="number"
                min={0}
                value={fields.years_experience}
                onChange={e => setFields(f => ({ ...f, years_experience: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
              <input
                value={fields.location_city}
                onChange={e => setFields(f => ({ ...f, location_city: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
              <input
                value={fields.location_state}
                onChange={e => setFields(f => ({ ...f, location_state: e.target.value }))}
                maxLength={2}
                placeholder="FL"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
              <input
                value={fields.phone}
                onChange={e => setFields(f => ({ ...f, phone: e.target.value }))}
                type="tel"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email (public)</label>
              <input
                value={fields.email}
                onChange={e => setFields(f => ({ ...f, email: e.target.value }))}
                type="email"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bio</label>
            <textarea
              value={fields.bio}
              onChange={e => setFields(f => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saveMsg && (
              <span className={`text-xs font-semibold ${saveMsg === "Saved." ? "text-green-400" : "text-red-400"}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Posts Panel */}
      {panel === "posts" && (
        <div className="border-t border-orange-800/30 px-4 py-3">
          {!postsLoaded ? (
            <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading posts…
            </div>
          ) : posts.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">No posts yet. Head to the <a href="/feed" className="text-orange-400 hover:underline">Live Feed</a> to post your first update.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-2">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
              {posts.map(post => (
                <div key={post.id} className="flex items-start gap-3 bg-slate-900/60 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    {post.project_name && (
                      <p className="text-xs font-bold text-white truncate mb-0.5">{post.project_name}</p>
                    )}
                    <p className="text-xs text-slate-400 line-clamp-2">{post.content}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(post.created_at)}</p>
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={deleting === post.id}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-red-950/50 hover:bg-red-700/50 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-40"
                    aria-label="Delete post"
                  >
                    {deleting === post.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
