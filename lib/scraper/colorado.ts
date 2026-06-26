// Colorado DORA — Professional and Occupational Licenses (Contractor Types)
// Source: data.colorado.gov Socrata SODA API (7s5z-vewr)
// Filtered to contractor trade types: JW, ME, EC, MP, JP, PC
// Note: Individual names (no business name), no phone/email.
// See scripts/import-colorado.js for the full import script.

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay } from "./utils";

const CO_API      = "https://data.colorado.gov/resource/7s5z-vewr.json";
const SOURCE_STATE = "CO";
const PAGE_SIZE   = 50000;

const CONTRACTOR_TYPES = new Set(["JW","ME","EC","MP","JP","PC","EW","EP"]);
const TYPE_NAMES: Record<string, string> = {
  JW: "Journeyman Wireman", ME: "Master Electrician", EC: "Electrical Contractor",
  EW: "Electrical Wireman", EP: "Electrician Provisional",
  MP: "Master Plumber", JP: "Journeyman Plumber", PC: "Plumbing Contractor",
};

export const ColoradoScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "Colorado",
  registryUrl: "https://data.colorado.gov/Regulations/Professional-and-Occupational-Licenses-in-Colorado/7s5z-vewr",

  async scrape(_importId: string): Promise<ScraperResult> {
    const allowed = await isScrapingAllowed("https://data.colorado.gov", "/resource/");
    if (!allowed) return { records: [], robotsBlocked: true, pagesScraped: 0 };

    const typeFilter = [...CONTRACTOR_TYPES].map(t => `licensetype='${t}'`).join(" OR ");
    const rows: any[] = [];
    let offset = 0;

    for (;;) {
      const url = new URL(CO_API);
      url.searchParams.set("$where", `(${typeFilter}) AND licensestatusdescription='Active'`);
      url.searchParams.set("$order", "licensenumber");
      url.searchParams.set("$limit", String(PAGE_SIZE));
      url.searchParams.set("$offset", String(offset));

      const res = await withRetry(() => rateLimitedFetch(url.toString()));
      if (!res.ok) throw new Error(`Colorado API ${res.status}`);
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
      const licType  = (row.licensetype || "").trim().toUpperCase();
      const name     = [row.firstname, row.lastname].filter(Boolean).join(" ").toUpperCase();
      const licNum   = (row.licensenumber || "").trim();
      if (!name || !licNum) continue;
      const expRaw = row.licenseexpirationdate || "";
      if (expRaw) {
        const exp = new Date(expRaw);
        if (!isNaN(exp.getTime()) && exp < today) continue;
      }
      const key = `${licNum}:CO`;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push({
        businessName:  name,
        licenseType:   TYPE_NAMES[licType] || licType,
        licenseNumber: licNum,
        city:          row.city || undefined,
        state:         "CO",
        rawData:       { zip: row.mailzipcode, type_code: licType },
      });
    }

    return { records, robotsBlocked: false, pagesScraped: Math.ceil(rows.length / PAGE_SIZE) };
  },
};
