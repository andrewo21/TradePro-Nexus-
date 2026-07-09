// POST /api/admin/registry/upload/[state]
// CSV upload fallback for states that block scraping.
// Accepts multipart/form-data with a "file" field.
// Admin-only.

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { ADMIN_EMAILS } from "@/lib/constants";
import { parseCSV, normalizeCsvRecord, isValidLicenseNumber } from "@/lib/scraper/utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const stateCode = state.toUpperCase();

  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (!ADMIN_EMAILS.includes(user?.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Parse multipart form
  let csvText: string;
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large (max 50MB)." }, { status: 400 });
    csvText = await file.text();
  } catch {
    return NextResponse.json({ error: "Failed to read uploaded file." }, { status: 400 });
  }

  const rows = parseCSV(csvText);
  if (!rows.length) {
    return NextResponse.json({ error: "CSV is empty or has no data rows." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;

  // Create import run
  const { data: importRun } = await db
    .from("registry_imports")
    .insert({ source_state: stateCode, import_type: "csv", status: "running", started_by: user.id })
    .select()
    .single();

  const importId = importRun.id;
  let staged = 0, skipped = 0;

  try {
    const BATCH = 500;
    const stagingRows: any[] = [];

    for (const row of rows) {
      const normalized = normalizeCsvRecord(row);

      // Skip records without a valid license number
      if (!normalized.licenseNumber || !isValidLicenseNumber(normalized.licenseNumber)) {
        skipped++;
        continue;
      }

      // Only import active licenses — check the status column if present
      const rawStatus = (row["license_status"] ?? row["status"] ?? row["lic_status"] ?? "active").toLowerCase();
      if (rawStatus && !["active", "current", "clear"].includes(rawStatus)) {
        skipped++;
        continue;
      }

      stagingRows.push({
        import_id:      importId,
        source_state:   stateCode,
        business_name:  normalized.businessName || null,
        license_type:   normalized.licenseType || null,
        license_number: normalized.licenseNumber,
        city:           normalized.city || null,
        state:          normalized.state || stateCode,
        phone:          normalized.phone || null,
        email:          normalized.email || null,
        license_status: "active",
        raw_data:       row,
        status:         "pending",
      });
      staged++;
    }

    // Insert in batches
    for (let i = 0; i < stagingRows.length; i += BATCH) {
      await db.from("registry_staging").insert(stagingRows.slice(i, i + BATCH));
    }

    await db.from("registry_imports").update({
      status: "complete",
      records_fetched: staged + skipped,
      records_error: skipped,
      completed_at: new Date().toISOString(),
    }).eq("id", importId);

    return NextResponse.json({
      importId,
      staged,
      skipped,
      message: `${staged} records staged. Run promote to push to live directory.`,
    });
  } catch (err) {
    await db.from("registry_imports").update({
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
      completed_at: new Date().toISOString(),
    }).eq("id", importId);
    return NextResponse.json({ error: "Upload failed during staging." }, { status: 500 });
  }
}
