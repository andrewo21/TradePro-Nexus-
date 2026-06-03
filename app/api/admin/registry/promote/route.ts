// POST /api/admin/registry/promote
// Promotes clean staging records to unclaimed_profiles.
// Runs duplicate detection and quality scoring on each record.
// Admin-only.
//
// Body: { importId?: string, state?: string, limit?: number }
// If importId provided: promote records from that specific import.
// If state provided: promote all pending records for that state.

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { cleanPhone, isValidEmail } from "@/lib/scraper/utils";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";
const QUALITY_THRESHOLD = 6; // records below this stay in staging for review

export async function POST(request: NextRequest) {
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { importId, state: stateCode, limit = 1000 } = body as {
    importId?: string;
    state?: string;
    limit?: number;
  };

  const db = getSupabaseAdmin() as any;

  // Fetch pending staging records
  let query = db
    .from("registry_staging")
    .select("*")
    .eq("status", "pending")
    .limit(Math.min(limit, 5000)); // Cap at 5k per run

  if (importId) query = query.eq("import_id", importId);
  if (stateCode) query = query.eq("source_state", stateCode.toUpperCase());

  const { data: stagingRecords, error: fetchErr } = await query;
  if (fetchErr) return NextResponse.json({ error: "Failed to fetch staging records." }, { status: 500 });
  if (!stagingRecords?.length) return NextResponse.json({ promoted: 0, message: "No pending records." });

  let promoted = 0, duplicate = 0, flagged = 0, belowThreshold = 0, errors = 0;

  for (const record of stagingRecords as any[]) {
    try {
      // ── Quality check ─────────────────────────────────────────────────────
      // Quality score is a generated column in the DB — read it directly
      const qualityScore = record.quality_score ?? 0;

      if (qualityScore < QUALITY_THRESHOLD) {
        await db.from("registry_staging").update({
          status: "skipped",
          flagged_for_review: true,
          review_reason: ["below_quality_threshold"],
        }).eq("id", record.id);
        belowThreshold++;
        continue;
      }

      // ── Duplicate detection ────────────────────────────────────────────────
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
          // Exact match → auto-reject
          await db.from("registry_staging").update({
            status: "duplicate",
            duplicate_type: "exact_license",
            duplicate_of: dup.duplicate_id,
          }).eq("id", record.id);
          duplicate++;
          continue;
        }

        // Fuzzy match or phone match → flag for review, don't promote
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

      // ── Promote to unclaimed_profiles ──────────────────────────────────────
      const phone = record.phone ? cleanPhone(record.phone) : null;
      const email = record.email && isValidEmail(record.email)
        ? record.email.toLowerCase().trim()
        : null;

      const { error: insertErr } = await db
        .from("unclaimed_profiles")
        .insert({
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
          // Race condition — exact dup appeared between check and insert
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

  // Update import run totals if importId provided
  if (importId) {
    await db.from("registry_imports").update({
      records_promoted:        db.rpc("coalesce_add", { a: promoted }),
      records_duplicate:       db.rpc("coalesce_add", { a: duplicate }),
      records_flagged:         db.rpc("coalesce_add", { a: flagged }),
      records_below_threshold: db.rpc("coalesce_add", { a: belowThreshold }),
      records_error:           db.rpc("coalesce_add", { a: errors }),
    }).eq("id", importId);
  }

  return NextResponse.json({ promoted, duplicate, flagged, belowThreshold, errors });
}
