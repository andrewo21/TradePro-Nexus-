// South Carolina Department of Labor, Licensing and Regulation (LLR)
// Target: https://verify.llronline.com/LicLookup/Contractors/Contractor.aspx
//
// SC LLR Contractor's Licensing Board covers:
//   - General Contractors (residential & commercial)
//   - Mechanical Contractors
//   - Electrical Contractors
//   - Plumbing Contractors
//   - Fire Alarm / Sprinkler Contractors
//
// Third-party services reference a "SC LLR Contractor Licensing Board bulk
// download" last updated March 2026, confirming bulk export capability.
// The primary lookup at verify.llronline.com is ASP.NET WebForms.
//
// Strategy:
//   1. Check robots.txt at verify.llronline.com
//   2. Probe for export/download endpoints common to the LLR portal
//   3. Try the main license type list endpoint with ContractorType=All
//   4. Fall back to probing the main search page for export links
//
// If all probes fail, return robotsBlocked so the admin UI shows a
// clear status and the CSV upload fallback is available.

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay, parseCSV } from "./utils";

const LLR_BASE    = "https://verify.llronline.com";
const LLR_PAGE    = `${LLR_BASE}/LicLookup/Contractors/Contractor.aspx?div=69`;
const SOURCE_STATE = "SC";

// Known contractor type codes in the SC LLR system
// div=69 is the Contractors board
const CONTRACTOR_DIVS = [
  { div: "69", label: "General Contractor" },
  { div: "24", label: "Mechanical Contractor" },
  { div: "48", label: "Electrical Contractor" },
  { div: "50", label: "Fire Alarm / Sprinkler" },
];

// Probe endpoints common to ASP.NET LLR portals for bulk export
const EXPORT_PROBES = [
  "/LicLookup/Contractors/ContractorExport.aspx",
  "/LicLookup/Contractors/ContractorList.aspx",
  "/LicLookup/Export/ContractorCSV.aspx",
  "/LicLookup/Contractors/Contractor.aspx?action=export",
  "/LicLookup/Contractors/Contractor.aspx?export=csv",
  "/LicLookup/LookupMain.aspx?export=1",
];

function parseContractorHtml(html: string, licenseType: string): RawRecord[] {
  const records: RawRecord[] = [];

  // SC LLR results tables typically have <table> with contractor rows
  // Each row: License# | Name | City | State | Status | Expiration
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const rowHtml = m[1];
    const cells: string[] = [];
    let c: RegExpExecArray | null;
    while ((c = cellRe.exec(rowHtml)) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g, "").trim());
    }

    if (cells.length < 3) continue;

    // Skip header rows
    if (cells[0].toLowerCase().includes("license") ||
        cells[0].toLowerCase().includes("name") ||
        cells[0] === "#") continue;

    // Typical order: LicenseNumber, Name, City, State, Status, Expiration
    const licenseNumber = cells[0];
    const name          = cells[1];
    const city          = cells[2] || "";
    const stateAbbr     = cells[3] || SOURCE_STATE;
    const status        = cells[4] || "";
    const expiration    = cells[5] || "";

    if (!name || name.length < 2 || !licenseNumber) continue;

    // Skip inactive/expired
    if (status && !/^(active|current|valid)/i.test(status)) continue;
    if (expiration) {
      const exp = new Date(expiration);
      if (!isNaN(exp.getTime()) && exp < today) continue;
    }

    records.push({
      businessName:  name,
      licenseType,
      licenseNumber,
      city:          city || undefined,
      state:         stateAbbr || SOURCE_STATE,
      rawData:       { status, expiration, source_div: "llr" },
    });
  }

  return records;
}

async function probeForExport(): Promise<{ csv: string; label: string } | null> {
  for (const path of EXPORT_PROBES) {
    try {
      const url = `${LLR_BASE}${path}`;
      const res = await rateLimitedFetch(url, {
        headers: { Accept: "text/csv,application/csv,text/*,*/*" },
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("csv") || ct.includes("text")) {
          const text = await res.text();
          if (text.includes(",") && text.split("\n").length > 10) {
            return { csv: text, label: path };
          }
        }
      }
    } catch { /* continue probing */ }
    await delay(2000);
  }
  return null;
}

export const SouthCarolinaScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "South Carolina",
  registryUrl: LLR_PAGE,

  async scrape(_importId: string): Promise<ScraperResult> {
    // robots.txt check
    const allowed = await isScrapingAllowed(LLR_BASE, "/LicLookup/");
    if (!allowed) {
      return { records: [], robotsBlocked: true, pagesScraped: 0 };
    }

    console.log("[SC] Probing LLR for bulk export endpoint...");
    const exportData = await probeForExport();

    if (exportData) {
      console.log(`[SC] Found export at ${exportData.label} — parsing CSV...`);
      const rows = parseCSV(exportData.csv);
      const records: RawRecord[] = rows
        .filter(r => r.business_name || r.name || r.company_name || r.licensee_name)
        .map(r => ({
          businessName:  r.business_name || r.name || r.company_name || r.licensee_name || "",
          licenseType:   r.license_type || r.type || "General Contractor",
          licenseNumber: r.license_number || r.license_no || r.number || "",
          city:          r.city || r.business_city || undefined,
          state:         r.state || SOURCE_STATE,
          phone:         r.phone || r.telephone || undefined,
          rawData:       r,
        }))
        .filter(r => r.businessName && r.licenseNumber);
      return { records, robotsBlocked: false, pagesScraped: 1 };
    }

    // Probe main page for hidden export links
    console.log("[SC] No export endpoint found — probing main page for download links...");
    try {
      const res = await withRetry(() =>
        rateLimitedFetch(LLR_PAGE, { headers: { Accept: "text/html" } })
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Look for CSV/export link
      const exportLinkRe = /href=["']([^"']*(?:export|csv|download)[^"']*)["']/gi;
      let em: RegExpExecArray | null;
      while ((em = exportLinkRe.exec(html)) !== null) {
        const exportUrl = em[1].startsWith("http") ? em[1] : `${LLR_BASE}${em[1]}`;
        console.log(`[SC] Found potential export link: ${exportUrl}`);
        try {
          const er = await rateLimitedFetch(exportUrl);
          if (er.ok) {
            const text = await er.text();
            if (text.includes(",") && text.split("\n").length > 10) {
              const rows = parseCSV(text);
              const records: RawRecord[] = rows
                .filter(r => Object.values(r).some(v => v.length > 0))
                .map(r => ({
                  businessName:  r.business_name || r.name || r.company_name || "",
                  licenseType:   r.license_type || "General Contractor",
                  licenseNumber: r.license_number || r.license_no || "",
                  city:          r.city || undefined,
                  state:         SOURCE_STATE,
                  rawData:       r,
                }))
                .filter(r => r.businessName && r.licenseNumber);
              return { records, robotsBlocked: false, pagesScraped: 2 };
            }
          }
        } catch { /* continue */ }
      }

      // If no export found, return blocked so CSV upload fallback is available
      console.log("[SC] No bulk export found. Returning blocked — use CSV upload fallback.");
      return {
        records: [],
        robotsBlocked: true,
        error: "No bulk export endpoint found on LLR portal. Request data via public records request to Contact.CLB@llr.sc.gov or use CSV upload.",
        pagesScraped: 1,
      };
    } catch (err) {
      return {
        records: [],
        robotsBlocked: true,
        error: `LLR portal unavailable: ${err instanceof Error ? err.message : String(err)}`,
        pagesScraped: 0,
      };
    }
  },
};
