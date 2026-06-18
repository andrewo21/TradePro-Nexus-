// GET /api/admin/registry/status
// Returns import stats, staging breakdown, and unclaimed profile counts.
// Admin-only.

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

export async function GET(request: NextRequest) {
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
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
    ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) settingsMap[s.key] = s.value;

  // Ramp schedule: days 1-7 → 2K/day, days 8-21 → 5K/day, day 22+ → 10K/day
  function getRampInfo(startDate: string | undefined, todayUtc: string) {
    if (!startDate) return { dailyCap: 2000, rampDay: 1 };
    const daysElapsed = Math.round(
      (new Date(todayUtc).getTime() - new Date(startDate).getTime()) / 86400000
    );
    return {
      rampDay: daysElapsed + 1,
      dailyCap: daysElapsed < 7 ? 2000 : daysElapsed < 21 ? 5000 : 10000,
    };
  }

  const todayUtc = new Date().toISOString().split("T")[0];
  const { dailyCap, rampDay } = getRampInfo(settingsMap.outreach_start_date, todayUtc);
  const rawDailySent = parseInt(settingsMap.daily_emails_sent ?? "0") || 0;
  // Reset to 0 if the counter is from a previous day
  const dailySent = settingsMap.daily_emails_date === todayUtc ? rawDailySent : 0;

  // Outreach log breakdown by status
  const { data: outreachLog } = await db.from("outreach_log").select("status");
  const outreachCounts: Record<string, number> = {};
  for (const row of outreachLog ?? []) {
    outreachCounts[row.status] = (outreachCounts[row.status] ?? 0) + 1;
  }

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
      log: outreachCounts,
    },
  });
}
