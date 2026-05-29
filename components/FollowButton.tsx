"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserCheck } from "lucide-react";

interface Props {
  followingId: string;
  followingType: "profile" | "company";
  label?: string;
}

export default function FollowButton({ followingId, followingType, label }: Props) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/follows?following_id=${followingId}`)
      .then(r => r.json())
      .then(d => { setFollowing(d.following ?? false); setLoading(false); })
      .catch(() => setLoading(false));
  }, [followingId]);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: followingId, following_type: followingType }),
    });
    const data = await res.json();
    if (res.status === 401) { window.location.href = "/login"; return; }
    setFollowing(data.following ?? !following);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${
        following
          ? "bg-slate-700 border-slate-600 text-slate-300 hover:border-red-600/50 hover:text-red-400"
          : "bg-blue-900/40 border-blue-700/60 text-blue-400 hover:bg-blue-800/40"
      }`}
    >
      {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      {following ? "Following" : (label ?? "Follow")}
    </button>
  );
}
