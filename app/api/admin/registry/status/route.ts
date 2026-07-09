// GET /api/admin/registry/status
// Returns import stats, staging breakdown, and unclaimed profile counts.
// Admin-only.

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { ADMIN_EMAILS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (!ADMIN_EMAILS.includes(user?.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const db = getSupabaseAdmin() as any;
  const state = request.nextUrl.searchParams.get("state")?.toUpperCase();

  // Recent import runs
  let importQuery = db
    .from("registry_imports")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  if (state) importQuery = importQuery.eq("source_state", state);
  const { data: imports } = await importQuery;

  // Staging breakdown per state
  const { data: stagingRaw } = await db.rpc("registry_staging_summary");

  // Unclaimed profile counts
  const { data: unclaimedRaw } = await db.rpc("unclaimed_profiles_summary");

  // Outreach settings (master switch status + daily ramp tracking)
  const { data: settings } = await db
    .from("admin_settings")
    .select("key, value")
    .in("key", [
      "outreach_enabled",
      "outreach_test_mode",
      "outreach_test_email",
      "outreach_batch_size",
      "outreach_physical_address",
      "outreach_last_run",
      "outreach_last_count",
      "outreach_start_date",
      "daily_emails_sent",
      "daily_emails_date",
      "outreach_daily_cap",
    ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) settingsMap[s.key] = s.value;

  // Cap is read from admin_settings so pg_cron can update it on schedule
  function getRampInfo(startDate: string | undefined, todayUtc: string, cap: number) {
    if (!startDate) return { dailyCap: cap, rampDay: 1 };
    const daysElapsed = Math.round(
      (new Date(todayUtc).getTime() - new Date(startDate).getTime()) / 86400000
    );
    return { rampDay: daysElapsed + 1, dailyCap: cap };
  }

  // Use Eastern time for day display — avoids rampDay jumping at 8 PM EDT
  // when UTC rolls to the next calendar date.
  const EDT_OFFSET_MS = 4 * 60 * 60 * 1000; // UTC-4 (Eastern Daylight Time)
  const todayEastern = new Date(Date.now() - EDT_OFFSET_MS).toISOString().split("T")[0];
  const todayUtc     = new Date().toISOString().split("T")[0]; // keep for daily cap reset check

  const capFromSettings = Math.max(1, parseInt(settingsMap.outreach_daily_cap ?? "1000") || 1000);
  const { dailyCap, rampDay } = getRampInfo(settingsMap.outreach_start_date, todayEastern, capFromSettings);
  const rawDailySent = parseInt(settingsMap.daily_emails_sent ?? "0") || 0;
  // Reset display to 0 if the counter is from a previous UTC day
  const dailySent = settingsMap.daily_emails_date === todayUtc ? rawDailySent : 0;

  // Real-time engagement stats, computed in SQL (not by pulling every
  // outreach_log row into JS) so this scales as the table grows and so
  // opened/clicked/delivered are actually counted -- they live in timestamp
  // columns, not the `status` field, so a group-by-status query can never
  // surface them no matter how often it's re-run.
  const { data: engagementRows } = await db.rpc("outreach_engagement_summary");
  const engagement = engagementRows?.[0] ?? {
    total_sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, sent_today: 0,
  };

  const { count: failedCount } = await db
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .eq("is_test", false);

  return NextResponse.json({
    imports: imports ?? [],
    staging: stagingRaw ?? [],
    unclaimed: unclaimedRaw ?? [],
    outreach: {
      enabled: settingsMap.outreach_enabled === "true",
      testMode: settingsMap.outreach_test_mode === "true",
      testEmail: settingsMap.outreach_test_email,
      batchSize: parseInt(settingsMap.outreach_batch_size ?? "50"),
      physicalAddress: settingsMap.outreach_physical_address ?? "",
      lastRun: settingsMap.outreach_last_run ?? "never",
      lastCount: parseInt(settingsMap.outreach_last_count ?? "0"),
      dailyCap,
      dailySent,
      rampDay,
      startDate: settingsMap.outreach_start_date ?? null,
      totalSentToDate: Number(engagement.total_sent),
      engagement: {
        totalSent: Number(engagement.total_sent),
        delivered: Number(engagement.delivered),
        opened: Number(engagement.opened),
        clicked: Number(engagement.clicked),
        bounced: Number(engagement.bounced),
        unsubscribed: Number(engagement.unsubscribed),
        sentToday: Number(engagement.sent_today),
        failed: failedCount ?? 0,
      },
    },
  });
}
