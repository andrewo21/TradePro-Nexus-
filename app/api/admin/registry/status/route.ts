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

  // Outreach settings (master switch status)
  const { data: settings } = await db
    .from("admin_settings")
    .select("key, value")
    .in("key", ["outreach_enabled", "outreach_test_mode", "outreach_test_email", "outreach_batch_size"]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) settingsMap[s.key] = s.value;

  return NextResponse.json({
    imports: imports ?? [],
    staging: stagingRaw ?? [],
    unclaimed: unclaimedRaw ?? [],
    outreach: {
      enabled: settingsMap.outreach_enabled === "true",
      testMode: settingsMap.outreach_test_mode === "true",
      testEmail: settingsMap.outreach_test_email,
      batchSize: parseInt(settingsMap.outreach_batch_size ?? "50"),
    },
  });
}
