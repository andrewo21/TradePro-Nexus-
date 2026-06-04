// GET /api/admin/registry/records
// Returns paginated individual staging records for review.
// ?state=FL&status=pending&page=1&limit=50&search=

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

export async function GET(request: NextRequest) {
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const p = request.nextUrl.searchParams;
  const state  = p.get("state")?.toUpperCase() || null;
  const status = p.get("status") || null;
  const search = p.get("search") || null;
  const page   = Math.max(1, parseInt(p.get("page") || "1"));
  const limit  = Math.min(100, Math.max(10, parseInt(p.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const db = getSupabaseAdmin() as any;

  let query = db
    .from("registry_staging")
    .select("id, import_id, source_state, business_name, license_type, license_number, city, state, phone, email, license_status, quality_score, status, duplicate_type, flagged_for_review, review_reason, error_detail, raw_data, created_at", { count: "exact" })
    .order("quality_score", { ascending: false })
    .order("business_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (state)  query = query.eq("source_state", state);
  if (status) query = query.eq("status", status);
  if (search) query = query.or(`business_name.ilike.%${search}%,license_number.ilike.%${search}%,email.ilike.%${search}%`);

  const { data: records, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    records: records ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
