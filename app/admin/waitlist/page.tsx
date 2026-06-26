import { notFound } from "next/navigation";
import { Users, HardHat, Building2, ArrowRight, Activity, TrendingUp, PenLine, BarChart2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabaseServer";
import NewsFeedAdmin from "@/components/NewsFeedAdmin";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

interface WaitlistRow {
  id: string;
  name: string;
  email: string;
  user_type: "pro" | "gc";
  position: number;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

export default async function AdminWaitlistPage() {
  const supabase = await getSupabaseServer() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) notFound();

  const db = getSupabaseAdmin() as any;

  const [
    { count: totalCount },
    { count: proCount },
    { count: gcCount },
    { data: recent },
    { data: topReferrers },
    { data: engagementData },
    { data: trafficData },
    { data: legacyMembers },
  ] = await Promise.all([
    db.from("waitlist").select("*", { count: "exact", head: true }),
    db.from("waitlist").select("*", { count: "exact", head: true }).eq("user_type", "pro"),
    db.from("waitlist").select("*", { count: "exact", head: true }).eq("user_type", "gc"),
    db.from("waitlist").select("name, email, user_type, position, referral_code, created_at").order("created_at", { ascending: false }).limit(20),
    db.from("waitlist").select("referral_code, name").limit(500),
    db.rpc("get_platform_engagement_stats"),
    db.from("site_daily_visits").select("date, visits").order("date", { ascending: false }).limit(30),
    db.from("profiles")
      .select("first_name, last_name, trade, location_state, legacy_member_granted_at, slug")
      .eq("legacy_member", true)
      .eq("is_seed_account", false)
      .order("legacy_member_granted_at", { ascending: true })
      .limit(100),
  ]);

  const engagement = engagementData as {
    total_registered: number;
    mau: number;
    active_posting_users: number;
  } | null;

  // Site traffic stats
  type TrafficRow = { date: string; visits: number };
  const traffic = (trafficData as TrafficRow[] | null) ?? [];
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const todayVisits   = traffic.find(r => r.date === todayStr)?.visits ?? 0;
  const yestVisits    = traffic.find(r => r.date === yesterdayStr)?.visits ?? 0;
  const last7Total    = traffic.filter(r => r.date >= new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0]).reduce((s, r) => s + r.visits, 0);
  const last30Total   = traffic.reduce((s, r) => s + r.visits, 0);
  // Last 7 days ordered ascending for the bar chart
  const chart7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0];
    return { date: d, visits: traffic.find(r => r.date === d)?.visits ?? 0 };
  });
  const chartMax = Math.max(...chart7.map(r => r.visits), 1);

  // News feed settings
  const { data: newsSettings } = await db
    .from("admin_settings")
    .select("key, value")
    .in("key", ["news_feed_enabled", "news_feed_last_run", "news_feed_last_count"]);
  const newsMap: Record<string, string> = {};
  for (const r of newsSettings ?? []) newsMap[r.key] = r.value;

  // Compute top referrers client-side from the data
  const referralMap: Record<string, { name: string; count: number }> = {};
  if (topReferrers) {
    const { data: referredRows } = await db.from("waitlist").select("referred_by").not("referred_by", "is", null);
    if (referredRows) {
      for (const row of referredRows as { referred_by: string }[]) {
        if (!row.referred_by) continue;
        if (!referralMap[row.referred_by]) {
          const referrer = (topReferrers as WaitlistRow[]).find(r => r.referral_code === row.referred_by);
          referralMap[row.referred_by] = { name: referrer?.name ?? row.referred_by, count: 0 };
        }
        referralMap[row.referred_by].count++;
      }
    }
  }

  const sortedReferrers = Object.entries(referralMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-black text-white">Waitlist Admin</h1>
            <p className="text-slate-400 text-sm">TradePro Nexus launch waitlist</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/jobs" className="text-xs text-orange-400 hover:text-orange-300 bg-orange-950/30 border border-orange-900/40 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Jobs →
            </Link>
            <Link href="/admin/moderation" className="text-xs text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/40 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Moderation →
            </Link>
            <span className="text-xs text-slate-600 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg font-mono">
              admin only
            </span>
          </div>
        </div>

        {/* Platform Engagement — advertising metrics */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-green-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Platform Engagement</h2>
            <span className="text-[10px] text-slate-600 ml-auto">last 30 days</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-white">{engagement?.total_registered ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Registered Users</p>
              <p className="text-[10px] text-slate-600 mt-0.5">all time</p>
            </div>
            <div className="bg-green-950/30 border border-green-900/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-3xl font-black text-green-400">{engagement?.mau ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">MAU</p>
              <p className="text-[10px] text-slate-600 mt-0.5">logged in ≤ 30 days</p>
            </div>
            <div className="bg-orange-950/30 border border-orange-900/40 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <PenLine className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <p className="text-3xl font-black text-orange-400">{engagement?.active_posting_users ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">Active Posters</p>
              <p className="text-[10px] text-slate-600 mt-0.5">posted ≤ 30 days</p>
            </div>
          </div>
          {engagement && engagement.total_registered > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/40 flex gap-6 text-xs text-slate-500">
              <span>MAU rate: <strong className="text-slate-300">{Math.round((engagement.mau / engagement.total_registered) * 100)}%</strong></span>
              <span>Posting rate: <strong className="text-slate-300">{Math.round((engagement.active_posting_users / engagement.total_registered) * 100)}%</strong></span>
            </div>
          )}
        </div>

        {/* Site Traffic */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Site Traffic</h2>
            <span className="text-[10px] text-slate-600 ml-auto">page loads, bots excluded</span>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">{todayVisits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Today</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-slate-300">{yestVisits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Yesterday</p>
            </div>
            <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-blue-400">{last7Total.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Last 7 Days</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-slate-300">{last30Total.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">Last 30 Days</p>
            </div>
          </div>

          {/* 7-day bar chart */}
          <div className="flex items-end gap-1.5 h-16">
            {chart7.map(({ date, visits }) => {
              const heightPct = Math.round((visits / chartMax) * 100);
              const isToday = date === todayStr;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500 font-mono leading-none">
                    {visits > 0 ? visits.toLocaleString() : ""}
                  </span>
                  <div className="w-full flex items-end" style={{ height: "36px" }}>
                    <div
                      className={`w-full rounded-t transition-all ${isToday ? "bg-blue-500" : "bg-slate-600"}`}
                      style={{ height: `${Math.max(heightPct, visits > 0 ? 8 : 2)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-600 leading-none">
                    {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* News Feed Admin */}
        <NewsFeedAdmin
          initialEnabled={newsMap["news_feed_enabled"] !== "false"}
          lastRun={newsMap["news_feed_last_run"] ?? "never"}
          lastCount={newsMap["news_feed_last_count"] ?? "0"}
        />

        {/* Waitlist stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 text-center">
            <p className="text-3xl font-black text-white">{totalCount ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-semibold">Total Signups</p>
          </div>
          <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <HardHat className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-3xl font-black text-orange-400">{proCount ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-semibold">Trade Pros</p>
          </div>
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-black text-blue-400">{gcCount ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-semibold">GCs</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent signups */}
          <div className="md:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recent Signups</h2>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              {(recent as WaitlistRow[] | null)?.map((row, i) => (
                <div
                  key={row.id ?? i}
                  className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      row.user_type === "pro"
                        ? "bg-orange-600/20 text-orange-400 border border-orange-800/50"
                        : "bg-blue-600/20 text-blue-400 border border-blue-800/50"
                    }`}>
                      {row.user_type === "pro" ? "P" : "G"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{row.name}</p>
                      <p className="text-xs text-slate-500 truncate">{row.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs text-slate-500 font-mono">#{row.position}</span>
                    <span className="text-xs text-slate-600">{timeAgo(row.created_at)}</span>
                  </div>
                </div>
              ))}
              {(!recent || (recent as WaitlistRow[]).length === 0) && (
                <p className="text-slate-500 text-sm text-center py-8">No signups yet.</p>
              )}
            </div>
          </div>

          {/* Top referrers */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Top Referrers</h2>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              {sortedReferrers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No referrals yet.</p>
              ) : (
                sortedReferrers.map(([code, { name, count }], i) => (
                  <div key={code} className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-600 w-5 text-center font-mono">{i + 1}</span>
                      <p className="text-sm text-white truncate">{name}</p>
                    </div>
                    <span className="text-sm font-bold text-green-400 flex-shrink-0 ml-2">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Legacy Members */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">&#127941;</span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Legacy Members — {(legacyMembers as any[])?.length ?? 0} / 100
              </h2>
            </div>
            <div className="bg-slate-800/50 border border-amber-800/30 rounded-xl overflow-hidden">
              {!legacyMembers || (legacyMembers as any[]).length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No legacy members yet.</p>
              ) : (
                (legacyMembers as any[]).map((m, i) => (
                  <div key={m.slug ?? i} className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-amber-700 w-6 text-center font-black">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {m.first_name} {m.last_name}
                        </p>
                        <p className="text-xs text-amber-400/70">{m.trade}{m.location_state ? ` · ${m.location_state}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      {m.slug && (
                        <a href={`/pro/${m.slug}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-orange-400 hover:underline">View</a>
                      )}
                      <span className="text-xs text-slate-600">
                        {m.legacy_member_granted_at
                          ? new Date(m.legacy_member_granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
