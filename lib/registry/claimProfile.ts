// Shared helpers for turning an unclaimed_profiles row into a live profiles row.
// Used by both the unauthenticated magic-claim flow and the authenticated one-click claim flow.

export function mapLicenseTypeToTrade(lt: string | null): string {
  if (!lt) return "Civil";
  const s = lt.toLowerCase();
  if (s.includes("electric"))                         return "Electrical";
  if (s.includes("plumb"))                            return "Plumbing";
  if (s.includes("hvac") || s.includes("air cond") || s.includes("refriger")) return "HVAC";
  if (s.includes("roof"))                             return "Roofing";
  if (s.includes("mechanic"))                         return "Mechanical";
  if (s.includes("fire") || s.includes("sprinkler"))  return "Fire Suppression";
  if (s.includes("concrete") || s.includes("cement")) return "Concrete";
  if (s.includes("mason"))                            return "Masonry";
  if (s.includes("paint") || s.includes("coating"))  return "Painting";
  if (s.includes("drywall") || s.includes("gypsum")) return "Drywall";
  if (s.includes("carpent") || s.includes("building contractor")) return "Carpentry";
  if (s.includes("steel") || s.includes("ironwork")) return "Structural Steel";
  return "Civil";
}

export async function generateUniqueSlug(db: any, businessName: string): Promise<string> {
  const base = (businessName || "trade-pro")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "trade-pro";

  const { data } = await db.from("profiles").select("slug").eq("slug", base).maybeSingle();
  if (!data) return base;

  for (let i = 0; i < 8; i++) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 5)}`;
    const { data: ex } = await db.from("profiles").select("slug").eq("slug", candidate).maybeSingle();
    if (!ex) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
