// Oregon Construction Contractors Board — CCB Active Licenses
// Source: data.oregon.gov Socrata SODA API (g77e-6bhs)
// Free, no login, updated daily. ~56K records, ~43K contractor types.
// Fields: full_name, endorsement_text, license_number, city, state, zip_code, phone_number
// See scripts/import-oregon.js for the full import script.

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay } from "./utils";

const OR_API      = "https://data.oregon.gov/resource/g77e-6bhs.json";
const SOURCE_STATE = "OR";
const PAGE_SIZE   = 50000;

const INCLUDE_TYPES = new Set(["RGC","RSC","CGC1","CGC2","CSC1","CSC2","RLC"]);

function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
}

export const OregonScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "Oregon",
  registryUrl: "https://data.oregon.gov/business/CCB-Active-Licenses/g77e-6bhs",

  async scrape(_importId: string): Promise<ScraperResult> {
    const allowed = await isScrapingAllowed("https://data.oregon.gov", "/resource/");
    if (!allowed) return { records: [], robotsBlocked: true, pagesScraped: 0 };

    const rows: any[] = [];
    let offset = 0;

    for (;;) {
      const url = new URL(OR_API);
      url.searchParams.set("$order", "license_number");
      url.searchParams.set("$limit", String(PAGE_SIZE));
      url.searchParams.set("$offset", String(offset));

      const res = await withRetry(() => rateLimitedFetch(url.toString()));
      if (!res.ok) throw new Error(`Oregon API ${res.status}`);
      const page = await res.json() as any[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
      await delay(2000);
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const seen = new Set<string>();
    const records = [];

    for (const row of rows) {
      const licType = (row.license_type || "").trim().toUpperCase();
      if (!INCLUDE_TYPES.has(licType)) continue;
      const name   = (row.full_name || "").trim();
      const licNum = (row.license_number || "").trim();
      if (!name || !licNum) continue;
      const expRaw = (row.lic_exp_date || "").trim();
      if (expRaw) {
        const [m, d, y] = expRaw.split("/").map(Number);
        const exp = new Date(y, m-1, d);
        if (!isNaN(exp.getTime()) && exp < today) continue;
      }
      const key = `${licNum}:OR`;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push({
        businessName:  name,
        licenseType:   row.endorsement_text || licType,
        licenseNumber: licNum,
        city:          row.city || undefined,
        state:         "OR",
        phone:         row.phone_number ? cleanPhone(row.phone_number) : undefined,
        rawData:       { zip: row.zip_code, county: row.county_name, address: row.address },
      });
    }

    return { records, robotsBlocked: false, pagesScraped: Math.ceil(rows.length / PAGE_SIZE) };
  },
};
