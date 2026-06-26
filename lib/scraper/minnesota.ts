// Minnesota Department of Labor and Industry — License Exports
// Source: secure.doli.state.mn.us — Direct public CSVs, updated nightly, free.
// Files: Electrical, Plumbing, Residential Contractors, Contractor Registrations
// Fields: Name, License_Subtype, Lic_Number, City, St, Phone_No, Status, Exp_Date
// ~99K active records across all four files.
// See scripts/import-minnesota.js for the full import script.

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay } from "./utils";
import { parseCSV } from "./utils";

const BASE_URL     = "https://secure.doli.state.mn.us/ccld/data/";
const SOURCE_STATE = "MN";
const FILES = [
  { path: "MNDLILicRegCertExport_Electrical.csv",              label: "Electrical" },
  { path: "MNDLILicRegCertExport_Plumbing.csv",                label: "Plumbing" },
  { path: "MNDLILicRegCertExport_Residential_Contractors.csv", label: "Residential Contractors" },
  { path: "MNDLILicRegCertExport_Contractor_Registrations.csv", label: "Contractor Registrations" },
];

function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
}

export const MinnesotaScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "Minnesota",
  registryUrl: "https://www.dli.mn.gov/license-and-registration-lookup",

  async scrape(_importId: string): Promise<ScraperResult> {
    const allowed = await isScrapingAllowed("https://secure.doli.state.mn.us", "/ccld/data/");
    if (!allowed) return { records: [], robotsBlocked: true, pagesScraped: 0 };

    const today = new Date(); today.setHours(0,0,0,0);
    const seen = new Set<string>();
    const records = [];
    let pagesScraped = 0;

    for (const file of FILES) {
      const res = await withRetry(() => rateLimitedFetch(`${BASE_URL}${file.path}`));
      if (!res.ok) { console.warn(`MN: ${file.label} returned ${res.status}`); continue; }
      const text = await res.text();
      const rows = parseCSV(text);
      pagesScraped++;

      for (const row of rows) {
        if ((row["Status"] || "").toLowerCase() !== "issued") continue;
        const name   = (row["Name"] || row["DBA_Name"] || "").trim();
        const licNum = (row["Lic_Number"] || "").trim();
        if (!name || !licNum) continue;
        const expRaw = (row["Exp_Date"] || "").trim();
        if (expRaw) {
          const [m, d, y] = expRaw.split("/").map(Number);
          const exp = new Date(y, m-1, d);
          if (!isNaN(exp.getTime()) && exp < today) continue;
        }
        const key = `${licNum}:MN`;
        if (seen.has(key)) continue;
        seen.add(key);
        const phone = (row["Phone_No"] || "").trim();
        records.push({
          businessName:  name,
          licenseType:   row["License_Subtype"] || file.label,
          licenseNumber: licNum,
          city:          row["City"] || undefined,
          state:         row["St"] || "MN",
          phone:         phone ? cleanPhone(phone) : undefined,
          rawData:       { zip: row["Zip"], source_file: file.label, bus_pers: row["Bus_Pers"] },
        });
      }

      await delay(2000);
    }

    return { records, robotsBlocked: false, pagesScraped };
  },
};
