import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// ── Mention search ────────────────────────────────────────────────────────────
// GET /api/feed/search-mentions?q=foo&type=person|company
// Returns up to 8 matching profiles or companies for @-tagging in posts.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") === "company" ? "company" : "person";

  if (q.length < 2) return NextResponse.json({ results: [] });

  const db = (await getSupabaseServer()) as any;

  if (type === "company") {
    const { data } = await db
      .from("companies")
      .select("id, name, slug")
      .ilike("name", `%${q}%`)
      .limit(8);

    const results = (data ?? []).map((c: any) => ({ type: "company", id: c.id, name: c.name, slug: c.slug }));
    return NextResponse.json({ results });
  }

  const { data } = await db
    .from("profiles")
    .select("id, first_name, last_name, slug")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(8);

  const results = (data ?? []).map((p: any) => ({ type: "profile", id: p.id, name: `${p.first_name} ${p.last_name}`.trim(), slug: p.slug }));
  return NextResponse.json({ results });
}
