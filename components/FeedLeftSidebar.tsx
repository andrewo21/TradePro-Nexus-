"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Search, Shield, Gift, ShieldCheck, Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

interface Props {
  userId: string | null;
  authorId: string | null;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  trade: string | null;
  availability_status: string | null;
  slug: string;
}

const QUICK_LINKS = [
  { label: "Find Crews", href: "/search", icon: Search },
  { label: "Union Jobs", href: "/work", icon: Shield },
  { label: "Refer and Earn", href: "/account", icon: Gift },
  { label: "Get Verified", href: "/verify", icon: ShieldCheck },
];

export default function FeedLeftSidebar({ userId, authorId }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ contractors: 0, available: 0 });

  useEffect(() => {
    if (authorId) {
      const db = getSupabase() as any;
      db.from("profiles")
        .select("first_name, last_name, trade, availability_status, slug")
        .eq("id", authorId)
        .maybeSingle()
        .then(({ data }: any) => { if (data) setProfile(data); });
    }
  }, [authorId]);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => {
        setStats({
          contractors: (d.directoryListings ?? 0) + (d.profiles ?? 0),
          available: 0,
        });
      })
      .catch(() => {});

    const db = getSupabase() as any;
    if (db) {
      db.from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("availability_status", "available")
        .eq("is_seed_account", false)
        .then(({ count }: any) => {
          setStats(s => ({ ...s, available: count ?? 0 }));
        });
    }
  }, []);

  const initials = profile
    ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <div className="space-y-4">

      {/* Profile card — only when logged in */}
      {userId && profile && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-[#f97316] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#0f172a] text-sm truncate">
                {profile.first_name} {profile.last_name}
              </p>
              {profile.trade && (
                <p className="text-[#f97316] text-xs font-semibold truncate">{profile.trade}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              profile.availability_status === "available"
                ? "text-green-700 bg-green-50 border-green-200"
                : profile.availability_status === "available_soon"
                ? "text-yellow-700 bg-yellow-50 border-yellow-200"
                : "text-slate-500 bg-slate-100 border-slate-200"
            }`}>
              {profile.availability_status === "available" ? "Available Now"
                : profile.availability_status === "available_soon" ? "Available Soon"
                : "Booked"}
            </span>
          </div>
          <Link href={`/pro/${profile.slug}`}
            className="block w-full text-center py-2 border border-[#e2e8f0] hover:border-[#f97316] text-[#475569] hover:text-[#f97316] text-xs font-semibold rounded-xl transition-colors">
            View My Trade Card
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4">
        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Quick Links</p>
        <div className="space-y-1">
          {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#f1f5f9] text-[#475569] hover:text-[#f97316] transition-colors group">
              <Icon className="w-4 h-4 text-[#f97316] flex-shrink-0" />
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Platform Stats */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4">
        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-3">Platform</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#64748b] text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>Contractors listed</span>
            </div>
            <span className="text-[#0f172a] font-black text-sm">
              {stats.contractors > 0 ? `${Math.floor(stats.contractors / 1000)}K+` : "500K+"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#64748b] text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>States covered</span>
            </div>
            <span className="text-[#0f172a] font-black text-sm">7</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#64748b] text-xs">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Available now</span>
            </div>
            <span className="text-green-600 font-black text-sm">
              {stats.available > 0 ? stats.available.toLocaleString() : "—"}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
