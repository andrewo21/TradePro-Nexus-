// POST /api/admin/registry/import/[state]
// Triggers a scrape for the given state. Admin-only.
// Creates an import run, calls the state scraper, saves to staging.

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { STATE_SCRAPERS } from "@/lib/scraper";
import type { RawRecord } from "@/lib/scraper/types";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const stateCode = state.toUpperCase();

  // Auth check
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Validate state
  const scraper = STATE_SCRAPERS[stateCode];
  if (!scraper) {
    return NextResponse.json(
      { error: `No scraper implemented for state: ${stateCode}. Use CSV upload.` },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin() as any;

  // Create import run record
  const { data: importRun, error: importErr } = await db
    .from("registry_imports")
    .insert({
      source_state: stateCode,
      import_type: "scrape",
      status: "running",
      started_by: user.id,
    })
    .select()
    .single();

  if (importErr) {
    return NextResponse.json({ error: "Failed to create import run." }, { status: 500 });
  }

  const importId = importRun.id;

  // Run scraper asynchronously — respond immediately with importId so admin
  // can poll /api/admin/registry/status for progress without waiting
  runScrapeAndSave(importId, stateCode, scraper, db).catch(err => {
    console.error(`Registry scrape failed [${stateCode}]:`, err);
    db.from("registry_imports").update({
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
      completed_at: new Date().toISOString(),
    }).eq("id", importId);
  });

  return NextResponse.json({
    importId,
    state: stateCode,
    message: "Scrape started. Poll /api/admin/registry/status for progress.",
  });
}

async function runScrapeAndSave(
  importId: string,
  stateCode: string,
  scraper: ReturnType<typeof STATE_SCRAPERS["FL"]["scrape"] extends Function ? () => any : never> extends never
    ? any : any,
  db: any
) {
  let fetched = 0;

  try {
    const result = await (scraper as any).scrape(importId);

    if (result.robotsBlocked) {
      await db.from("registry_imports").update({
        status: "blocked",
        robots_blocked: true,
        error_message: result.error ?? "robots.txt blocked scraping",
        completed_at: new Date().toISOString(),
      }).eq("id", importId);
      return;
    }

    if (result.error && !result.records.length) {
      await db.from("registry_imports").update({
        status: "failed",
        error_message: result.error,
        completed_at: new Date().toISOString(),
      }).eq("id", importId);
      return;
    }

    fetched = result.records.length;

    // Save to staging in batches of 500
    const BATCH = 500;
    for (let i = 0; i < result.records.length; i += BATCH) {
      const batch: RawRecord[] = result.records.slice(i, i + BATCH);
      const rows = batch.map((r: RawRecord) => ({
        import_id:      importId,
        source_state:   stateCode,
        business_name:  r.businessName?.trim() || null,
        license_type:   r.licenseType?.trim() || null,
        license_number: r.licenseNumber?.trim() || null,
        city:           r.city?.trim() || null,
        state:          r.state?.trim() || stateCode,
        phone:          r.phone?.trim() || null,
        email:          r.email?.trim() || null,
        license_status: "active", // scraper only fetches active
        raw_data:       r.rawData ?? {},
        status:         "pending",
      }));

      await db.from("registry_staging").insert(rows);
    }

    await db.from("registry_imports").update({
      status: "complete",
      records_fetched: fetched,
      completed_at: new Date().toISOString(),
    }).eq("id", importId);

  } catch (err) {
    await db.from("registry_imports").update({
      status: "failed",
      records_fetched: fetched,
      error_message: err instanceof Error ? err.message : String(err),
      completed_at: new Date().toISOString(),
    }).eq("id", importId);
    throw err;
  }
}
