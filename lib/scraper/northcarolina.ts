// North Carolina — General Contractors + Electrical
// Target GC:  https://portal.nclbgc.org/Public/Search  (NCLBGC — ~76K contractors)
// Target EC:  https://arls-public.ncbeec.org/Public/Search  (NCBEEC — electrical)
//
// Neither portal offers a documented public bulk download. Both are .NET SPAs
// with individual search only. No matching dataset found on data.nc.gov.
//
// Strategy: probe both portals for undocumented export endpoints.
// If nothing is found, return robotsBlocked so the admin dashboard shows the
// correct status and a public records request can be made to NCLBGC / NCBEEC.
//
// NC is a large market (~76K+ contractors) worth pursuing via FOIA if scrapers
// don't find a bulk path.

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, delay, parseCSV } from "./utils";

const NCLBGC_BASE  = "https://portal.nclbgc.org";
const NCBEEC_BASE  = "https://arls-public.ncbeec.org";
const SOURCE_STATE = "NC";

const EXPORT_PROBES = [
  { base: NCLBGC_BASE,  path: "/Public/Export",            label: "NCLBGC Export" },
  { base: NCLBGC_BASE,  path: "/Public/Search?export=csv", label: "NCLBGC CSV" },
  { base: NCLBGC_BASE,  path: "/NCLBGCApplication/Export", label: "NCLBGC App Export" },
  { base: NCBEEC_BASE,  path: "/Public/Export",            label: "NCBEEC Export" },
  { base: NCBEEC_BASE,  path: "/Public/Search?export=csv", label: "NCBEEC CSV" },
];

export const NorthCarolinaScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "North Carolina",
  registryUrl: `${NCLBGC_BASE}/Public/Search`,

  async scrape(_importId: string): Promise<ScraperResult> {
    const gcAllowed = await isScrapingAllowed(NCLBGC_BASE, "/Public/Search");
    const ecAllowed = await isScrapingAllowed(NCBEEC_BASE, "/Public/Search");

    if (!gcAllowed && !ecAllowed) {
      return { records: [], robotsBlocked: true, pagesScraped: 0 };
    }

    console.log("[NC] Probing NCLBGC and NCBEEC for bulk export endpoints...");

    for (const probe of EXPORT_PROBES) {
      const base = probe.base === NCLBGC_BASE ? NCLBGC_BASE : NCBEEC_BASE;
      const baseAllowed = probe.base === NCLBGC_BASE ? gcAllowed : ecAllowed;
      if (!baseAllowed) continue;

      try {
        await delay(2000);
        const res = await rateLimitedFetch(`${base}${probe.path}`, {
          headers: { Accept: "text/csv,application/csv,text/html,*/*" },
        });
        if (res.ok) {
          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("csv") || ct.includes("text/plain")) {
            const text = await res.text();
            if (text.split("\n").length > 10) {
              console.log(`[NC] Found bulk data at ${probe.label}`);
              const rows = parseCSV(text);
              const records = rows
                .filter(r => r.business_name || r.name || r.licensee_name || r.company_name)
                .map(r => ({
                  businessName:  r.business_name || r.name || r.licensee_name || r.company_name || "",
                  licenseType:   r.license_type || r.type || "General Contractor",
                  licenseNumber: r.license_number || r.license_no || r.number || "",
                  city:          r.city || undefined,
                  state:         r.state || SOURCE_STATE,
                  phone:         r.phone || undefined,
                  rawData:       r,
                }))
                .filter(r => r.businessName && r.licenseNumber);
              return { records, robotsBlocked: false, pagesScraped: 1 };
            }
          }
        }
      } catch { /* continue */ }
    }

    // No bulk export found
    return {
      records: [],
      robotsBlocked: true,
      error: "No bulk export found on NCLBGC or NCBEEC portals. " +
             "Recommend public records request to NCLBGC (919-571-4183) or NCBEEC (919-571-4183). " +
             "~76,000 GC records available once data is obtained.",
      pagesScraped: 2,
    };
  },
};
