// POST /api/admin/registry/promote
// Promotes a single batch of staging records to unclaimed_profiles.
// Call repeatedly with increasing `offset` until `hasMore` is false.
//
// Body: { state?: string, importId?: string, batchSize?: number, offset?: number }
// Returns: { promoted, duplicate, flagged, belowThreshold, errors, offset, batchSize, total, hasMore }

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { cleanPhone, isValidEmail } from "@/lib/scraper/utils";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";
const QUALITY_THRESHOLD = 6;

export async function POST(request: NextRequest) {
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    importId,
    state: stateCode,
    batchSize = 500,
    offset = 0,
  } = body as {
    importId?: string;
    state?: string;
    batchSize?: number;
    offset?: number;
  };

  const db = getSupabaseAdmin() as any;
  const safeSize = Math.min(Math.max(batchSize, 50), 500);

  // ── Count total pending records (only on first batch) ─────────────────────
  let countQuery = db
    .from("registry_staging")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (importId) countQuery = countQuery.eq("import_id", importId);
  if (stateCode) countQuery = countQuery.eq("source_state", stateCode.toUpperCase());
  const { count: total } = await countQuery;

  // ── Fetch this batch ───────────────────────────────────────────────────────
  let query = db
    .from("registry_staging")
    .select("*")
    .eq("status", "pending")
    .order("id")
    .range(offset, offset + safeSize - 1);
  if (importId) query = query.eq("import_id", importId);
  if (stateCode) query = query.eq("source_state", stateCode.toUpperCase());

  const { data: stagingRecords, error: fetchErr } = await query;
  if (fetchErr) return NextResponse.json({ error: "Failed to fetch staging records." }, { status: 500 });
  if (!stagingRecords?.length) {
    return NextResponse.json({ promoted: 0, duplicate: 0, flagged: 0, belowThreshold: 0, errors: 0, offset, batchSize: safeSize, total: total ?? 0, hasMore: false });
  }

  let promoted = 0, duplicate = 0, flagged = 0, belowThreshold = 0, errors = 0;

  for (const record of stagingRecords as any[]) {
    try {
      const qualityScore = record.quality_score ?? 0;

      // ── Quality check ──────────────────────────────────────────────────────
      if (qualityScore < QUALITY_THRESHOLD) {
        await db.from("registry_staging").update({
          status: "skipped",
          flagged_for_review: true,
          review_reason: ["below_quality_threshold"],
        }).eq("id", record.id);
        belowThreshold++;
        continue;
      }

      // ── Duplicate detection via RPC ────────────────────────────────────────
      const { data: dupResult } = await db.rpc("check_registry_duplicate", {
        p_license_number: record.license_number,
        p_source_state:   record.source_state,
        p_business_name:  record.business_name,
        p_city:           record.city,
        p_phone:          record.phone,
      });

      if (dupResult?.length) {
        const dup = dupResult[0];
        if (dup.duplicate_type === "exact_license") {
          await db.from("registry_staging").update({
            status: "duplicate",
            duplicate_type: "exact_license",
            duplicate_of: dup.duplicate_id,
          }).eq("id", record.id);
          duplicate++;
          continue;
        }
        await db.from("registry_staging").update({
          status: "flagged",
          flagged_for_review: true,
          duplicate_type: dup.duplicate_type,
          duplicate_of: dup.duplicate_id,
          review_reason: [dup.duplicate_type],
        }).eq("id", record.id);
        flagged++;
        continue;
      }

      // ── Promote ────────────────────────────────────────────────────────────
      const phone = record.phone ? cleanPhone(record.phone) : null;
      const email = record.email && isValidEmail(record.email)
        ? record.email.toLowerCase().trim()
        : null;

      const { error: insertErr } = await db.from("unclaimed_profiles").insert({
        business_name:  record.business_name,
        license_type:   record.license_type,
        license_number: record.license_number,
        city:           record.city,
        state:          record.state || record.source_state,
        phone,
        email,
        source:         "state_registry",
        source_state:   record.source_state,
        quality_score:  qualityScore,
        license_status: record.license_status,
        visible:        true,
      });

      if (insertErr) {
        if (insertErr.code === "23505") {
          await db.from("registry_staging").update({ status: "duplicate", duplicate_type: "exact_license" }).eq("id", record.id);
          duplicate++;
        } else {
          await db.from("registry_staging").update({ status: "error", error_detail: insertErr.message }).eq("id", record.id);
          errors++;
        }
        continue;
      }

      await db.from("registry_staging").update({ status: "promoted" }).eq("id", record.id);
      promoted++;

    } catch (err) {
      await db.from("registry_staging").update({
        status: "error",
        error_detail: err instanceof Error ? err.message : String(err),
      }).eq("id", record.id);
      errors++;
    }
  }

  // Because we mark records as promoted/dup/flagged as we go, the next call
  // with offset=0 naturally picks up only remaining pending records.
  // hasMore = we processed a full batch, so there may be more pending.
  const hasMore = stagingRecords.length === safeSize;

  return NextResponse.json({
    promoted,
    duplicate,
    flagged,
    belowThreshold,
    errors,
    offset,
    batchSize: safeSize,
    total: total ?? 0,
    hasMore,
  });
}
