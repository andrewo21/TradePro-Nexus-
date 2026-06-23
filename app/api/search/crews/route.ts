import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const PAGE_SIZE = 20;

// Maps UI trade values to license_type ILIKE patterns for unclaimed_profiles.
// Multiple patterns per trade — Supabase .or() unions them.
const TRADE_LICENSE_PATTERNS: Record<string, string[]> = {
  "Electrical":        ["electrical", "electrician", "C10", "C-8", "Registered Electrical"],
  "Plumbing":          ["plumb", "C36", "C-36", "CPC"],
  "HVAC":              ["hvac", "air cond", "refriger", "C20", "C-20", "CAC", "HVAC Contractor"],
  "Carpentry":         ["carpent", "finish carp", "CBC", "Certified Building"],
  "Structural Steel":  ["steel", "ironwork", "structural"],
  "Mechanical":        ["mechanic", "CMC", "Certified Mechanical"],
  "Roofing":           ["roof", "D49", "CRC", "Certified Roofing"],
  "Concrete":          ["concrete", "cement", "C-6", "CCC", "Certified Concrete"],
  "Masonry":           ["mason", "C29", "brick"],
  "Drywall":           ["drywall", "gypsum", "plaster", "drywall"],
  "Painting":          ["paint", "C33", "C-9", "coating"],
  "Fire Suppression":  ["fire suppr", "sprinkler", "CFC", "C-16", "fire protect"],
  "Civil":             ["general contractor", "general building", "civil", "excavation",
                        "utility", "CGC", "Certified General", "Certified Residential"],
  "Demolition":        ["demoli", "wreck", "C-21"],
  "Welding":           ["weld", "C-60"],
};

// Sector → license_type ILIKE patterns (rough mapping, best-effort)
const SECTOR_LICENSE_PATTERNS: Record<string, string[]> = {
  "Residential":   ["residential", "B-2", "dwelling"],
  "Commercial":    ["commercial", "general contractor", "Certified General", "Certified Building"],
  "Industrial":    ["industrial"],
  "Government":    ["government", "federal", "public"],
};

// Displayed state name → 2-letter abbreviation
const STATE_ABBR: Record<string, string> = {
  "Florida": "FL", "Texas": "TX", "California": "CA", "Nevada": "NV",
  "Ohio": "OH", "Washington": "WA", "Georgia": "GA", "Tennessee": "TN",
  "New York": "NY", "Pennsylvania": "PA", "Illinois": "IL", "Arizona": "AZ",
};

function buildOrPattern(patterns: string[]): string {
  return patterns.map(p => `license_type.ilike.%${p}%`).join(",");
}

export async function GET(request: NextRequest) {
  try {
    const sp      = request.nextUrl.searchParams;
    const trade   = sp.get("trade")    ?? "";
    const sector  = sp.get("sector")   ?? "";
    const state   = sp.get("state")    ?? "";   // display name or abbr
    const county  = sp.get("county")   ?? "";   // city / zip text
    const union   = sp.get("union")    ?? "both"; // "union" | "non-union" | "both"
    const verified = sp.get("verified") ?? "both"; // "verified" | "not-verified" | "both"
    const firmSize = sp.get("firmSize") ?? "any";  // "any" | "1-25" | "25-50" | "50+"
    const sort    = sp.get("sort")     ?? "recent"; // "available" | "union" | "recent" | "verified"
    const q       = sp.get("q")        ?? "";
    const local   = sp.get("local")    ?? "";   // union local number search
    const page    = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const profileFrom = (page - 1) * PAGE_SIZE;

    const db = getSupabaseAdmin() as any;

    // Resolve state abbreviation
    const stateAbbr = STATE_ABBR[state] ?? (state.length === 2 ? state.toUpperCase() : "");

    // ── PROFILES query ──────────────────────────────────────────────────────────
    // Exclude internal / test profiles; must have a public slug
    let pq = db
      .from("profiles")
      .select(
        "slug, first_name, last_name, firm_name, trade, location_city, location_state, " +
        "location_zip, availability_status, union_member, union_name, union_local_number, " +
        "crew_size, years_experience, verification_status, avatar_url, profile_type",
        { count: "exact" }
      )
      .or("is_internal.is.null,is_internal.eq.false")
      .not("slug", "is", null);

    if (trade)     pq = pq.eq("trade", trade);
    if (stateAbbr) pq = pq.eq("location_state", stateAbbr);

    if (county) {
      pq = pq.or(
        `location_city.ilike.%${county}%,location_zip.ilike.%${county}%`
      );
    }

    if (union === "union")     pq = pq.eq("union_member", true);
    if (union === "non-union") pq = pq.or("union_member.eq.false,union_member.is.null");

    if (verified === "verified")     pq = pq.eq("verification_status", "verified");
    if (verified === "not-verified") pq = pq.not("verification_status", "eq", "verified");

    if (firmSize === "1-25")  pq = pq.gte("crew_size", 1).lte("crew_size", 25);
    if (firmSize === "25-50") pq = pq.gt("crew_size", 25).lte("crew_size", 50);
    if (firmSize === "50+")   pq = pq.gt("crew_size", 50);

    if (local) {
      const localNum = local.replace(/[^0-9]/g, "") || local.trim();
      pq = pq.or(`union_local_number.ilike.%${localNum}%,union_name.ilike.%${local}%`);
    }

    if (q) {
      pq = pq.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,firm_name.ilike.%${q}%,` +
        `trade.ilike.%${q}%,union_name.ilike.%${q}%,union_local_number.ilike.%${q}%`
      );
    }

    // Sort
    switch (sort) {
      case "available": pq = pq.order("availability_status", { ascending: true })
                               .order("created_at", { ascending: false }); break;
      case "union":     pq = pq.order("union_member", { ascending: false, nullsFirst: false })
                               .order("created_at", { ascending: false }); break;
      case "verified":  pq = pq.order("verification_status", { ascending: false })
                               .order("created_at", { ascending: false }); break;
      default:          pq = pq.order("created_at", { ascending: false }); break;
    }

    const { data: profileRows, count: profileTotal } = await pq
      .range(profileFrom, profileFrom + PAGE_SIZE - 1);

    const profileCount  = profileTotal ?? 0;
    const profileGot    = profileRows?.length ?? 0;

    // ── UNCLAIMED PROFILES query ─────────────────────────────────────────────
    // Exclude when filters that unclaimed can't satisfy are active
    const skipUnclaimed =
      union === "union"      ||   // unclaimed have no union data
      verified === "verified" ||  // unclaimed are never verified
      firmSize !== "any";         // unclaimed have no crew_size

    let unclaimedRows: any[] = [];
    let unclaimedTotal = 0;

    if (!skipUnclaimed) {
      let uq = db
        .from("unclaimed_profiles")
        .select(
          "id, business_name, license_type, license_number, city, source_state, " +
          "claim_token, phone, quality_score",
          { count: "exact" }
        )
        .eq("visible", true)
        .eq("claimed", false)
        .eq("remove_requested", false);

      if (stateAbbr) uq = uq.eq("source_state", stateAbbr);

      if (county) uq = uq.ilike("city", `%${county}%`);

      if (trade && TRADE_LICENSE_PATTERNS[trade]) {
        const orPat = buildOrPattern(TRADE_LICENSE_PATTERNS[trade]);
        uq = uq.or(orPat);
      }

      if (sector && SECTOR_LICENSE_PATTERNS[sector]) {
        const orPat = buildOrPattern(SECTOR_LICENSE_PATTERNS[sector]);
        uq = uq.or(orPat);
      }

      if (q) {
        uq = uq.or(`business_name.ilike.%${q}%,license_type.ilike.%${q}%`);
      }

      // Always sort unclaimed by most recently added
      uq = uq.order("created_at", { ascending: false });

      // Pagination: unclaimed fills the remainder of the page after profiles
      const unclaimedFrom = Math.max(0, profileFrom - profileCount);
      const unclaimedTake = PAGE_SIZE - profileGot;

      // Always run the query (for count), take only what we need
      const { data: ur, count: uc } = await uq
        .range(unclaimedFrom, unclaimedFrom + PAGE_SIZE - 1);

      unclaimedRows  = (ur ?? []).slice(0, Math.max(unclaimedTake, 0));
      unclaimedTotal = uc ?? 0;
    }

    // ── Assemble response ────────────────────────────────────────────────────
    const results = [
      ...(profileRows ?? []).map((p: any) => ({ ...p, source: "profile" as const })),
      ...unclaimedRows.map((u: any) => ({ ...u, source: "unclaimed" as const })),
    ];

    const grandTotal = profileCount + unclaimedTotal;
    const pages = Math.ceil(grandTotal / PAGE_SIZE);

    return NextResponse.json({
      results,
      total: grandTotal,
      totalProfiles: profileCount,
      totalUnclaimed: unclaimedTotal,
      page,
      pages,
    });
  } catch (err) {
    console.error("Search crews error:", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
