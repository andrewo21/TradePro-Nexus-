import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const trade     = searchParams.get("trade") ?? "";
    const state     = searchParams.get("state") ?? "";
    const union     = searchParams.get("union") === "true";
    const available = searchParams.get("available") === "true";
    const q         = searchParams.get("q") ?? "";
    const local     = searchParams.get("local") ?? ""; // e.g. "349" or "IBEW Local 349"
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const offset = (page - 1) * PAGE_SIZE;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;

    let query = db
      .from("profiles")
      .select(
        "slug, first_name, last_name, trade, location_city, location_state, availability_status, " +
        "union_member, union_name, union_local_number, crew_size, years_experience, " +
        "verification_status, avatar_url, firm_name, profile_type",
        { count: "exact" }
      )
      .or("is_internal.is.null,is_internal.eq.false")
      .not("slug", "is", null);

    if (trade)     query = query.eq("trade", trade);
    if (state)     query = query.eq("location_state", state);
    if (union)     query = query.eq("union_member", true);
    if (available) query = query.eq("availability_status", "available");

    // Local number: strip "local" / union name prefix so "IBEW Local 349" → matches "349"
    if (local) {
      const localNum = local.replace(/[^0-9]/g, "") || local.trim();
      query = query.or(
        `union_local_number.ilike.%${localNum}%,union_name.ilike.%${local}%`
      );
    }

    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,firm_name.ilike.%${q}%,` +
        `trade.ilike.%${q}%,union_name.ilike.%${q}%,union_local_number.ilike.%${q}%`
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Search crews error:", error);
      return NextResponse.json({ error: "Query failed." }, { status: 500 });
    }

    const total = count ?? 0;
    const pages = Math.ceil(total / PAGE_SIZE);

    return NextResponse.json({ results: data ?? [], total, page, pages });
  } catch (err) {
    console.error("Search crews unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
