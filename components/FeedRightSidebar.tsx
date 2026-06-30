"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, UserPlus } from "lucide-react";
import AvatarImage from "./AvatarImage";
import { getSupabase } from "@/lib/supabase";

interface Props {
  userId: string | null;
  userState: string | null;
  followedIds: Set<string>;
}

interface NearbyPro {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  trade: string | null;
  location_city: string | null;
  location_state: string | null;
  availability_status: string | null;
  avatar_url?: string | null;
}

export default function FeedRightSidebar({ userId, userState, followedIds }: Props) {
  const [nearbyPros, setNearbyPros] = useState<NearbyPro[]>([]);
  const [suggested, setSuggested] = useState<NearbyPro[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const displayState = userState || "FL";

  useEffect(() => {
    const db = getSupabase() as any;
    if (!db) return;

    // Trade Pros Near You — from user's state (or FL if not known)
    db.from("profiles")
      .select("id, slug, first_name, last_name, trade, location_city, location_state, availability_status, avatar_url")
      .eq("location_state", displayState)
      .eq("is_seed_account", false)
      .eq("is_internal", false)
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }: any) => { if (data?.length) setNearbyPros(data); });

    // Suggested Connections — only when logged in
    if (userId) {
      db.from("profiles")
        .select("id, slug, first_name, last_name, trade, location_city, location_state, availability_status, avatar_url")
        .eq("is_seed_account", false)
        .eq("is_internal", false)
        .not("slug", "is", null)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }: any) => {
          if (!data) return;
          // Exclude already-followed and the user themselves
          const unfollowed = data
            .filter((p: any) => !followedIds.has(`profile:${p.id}`))
            .slice(0, 3);
          setSuggested(unfollowed);
        });
    }
  }, [userId, displayState, followedIds]);

  async function handleFollow(profileId: string) {
    setFollowing(prev => new Set([...prev, profileId]));
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: profileId, following_type: "profile" }),
    }).catch(() => {});
  }

  function ProRow({ pro, showFollow = false }: { pro: NearbyPro; showFollow?: boolean }) {
    const initials = `${pro.first_name[0] ?? ""}${pro.last_name[0] ?? ""}`.toUpperCase();
    const isFollowed = following.has(pro.id) || followedIds.has(`profile:${pro.id}`);

    return (
      <div className="flex items-center gap-2.5 py-2">
        <Link href={`/pro/${pro.slug}`}
          className="w-9 h-9 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center text-[#f97316] font-black text-xs flex-shrink-0 hover:bg-[#f97316]/20 transition-colors overflow-hidden">
          {pro.avatar_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={pro.avatar_url} alt={initials} className="w-full h-full object-cover" />
            : initials}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/pro/${pro.slug}`}
            className="block font-bold text-[#0f172a] text-xs hover:text-[#f97316] transition-colors truncate">
            {pro.first_name} {pro.last_name}
          </Link>
          <div className="flex items-center gap-1.5 flex-wrap">
            {pro.trade && <span className="text-[#f97316] text-[10px] font-semibold">{pro.trade}</span>}
            {pro.location_city && (
              <span className="text-[#94a3b8] text-[10px] flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />{pro.location_city}
              </span>
            )}
          </div>
          {pro.availability_status === "available" && (
            <span className="text-[9px] font-bold text-green-600">Available Now</span>
          )}
        </div>
        {showFollow && userId && !isFollowed && (
          <button onClick={() => handleFollow(pro.id)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-[#f97316] hover:bg-[#ea6c00] text-white text-[10px] font-bold rounded-lg transition-colors">
            <UserPlus className="w-3 h-3" /> Follow
          </button>
        )}
        {showFollow && isFollowed && (
          <span className="flex-shrink-0 text-[10px] text-green-600 font-semibold">Following</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Trade Pros Near You */}
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-[#f97316]" />
          <p className="font-black text-[#0f172a] text-sm">Trade Pros Near You</p>
        </div>
        <p className="text-[#94a3b8] text-[11px] mb-3">
          {userState ? `Active in ${userState}` : "Active in Florida"}
        </p>

        {nearbyPros.length > 0 ? (
          <>
            <div className="divide-y divide-[#e2e8f0]">
              {nearbyPros.map(pro => (
                <ProRow key={pro.id} pro={pro} />
              ))}
            </div>
            <Link href={`/search?state=${userState || "Florida"}`}
              className="block text-center text-xs text-[#f97316] hover:text-[#ea6c00] font-semibold mt-3 transition-colors">
              See all in {userState || "Florida"} →
            </Link>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-[#94a3b8] text-xs">Loading nearby pros...</p>
          </div>
        )}
      </div>

      {/* Suggested Connections — logged-in only */}
      {userId && suggested.length > 0 && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4">
          <p className="font-black text-[#0f172a] text-sm mb-1">Suggested Connections</p>
          <p className="text-[#94a3b8] text-[11px] mb-3">Trade pros you may know</p>
          <div className="divide-y divide-[#e2e8f0]">
            {suggested.map(pro => (
              <ProRow key={pro.id} pro={pro} showFollow />
            ))}
          </div>
        </div>
      )}

      {/* Sidebar sponsor slot */}
      <a
        href="/advertise"
        className="block bg-[#0f172a] border border-slate-700/50 rounded-2xl p-4 text-center hover:border-orange-500/50 transition-colors group"
        aria-label="Advertise on TradePro Nexus"
      >
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-2">Sponsored</p>
        <p className="text-white font-black text-sm mb-1 group-hover:text-orange-400 transition-colors">
          Reach 706,044 Licensed Contractors
        </p>
        <p className="text-[#94a3b8] text-xs leading-relaxed mb-3">
          Founding sponsor slots available. Reserve your placement today.
        </p>
        <span className="block w-full py-2.5 bg-[#f97316] group-hover:bg-[#ea6c00] text-white text-xs font-bold rounded-xl transition-colors">
          Reserve a Slot
        </span>
      </a>

    </div>
  );
}
