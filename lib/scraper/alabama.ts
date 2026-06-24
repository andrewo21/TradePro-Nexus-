// Alabama — General Contractors + Trade Boards
// Target GC:       https://genconbd.alabama.gov/database-sql/roster.aspx
//   (~10,654 GC records, searchable ASP.NET roster)
// Target Electrical: Alabama Electrical Contractors Board (AECB)
//   https://aecb.alabama.gov
// Target Plumbing:   Alabama State Plumbers and Gas Fitters Examining Board
// Target HVAC:       Alabama Licensing Board for General Contractors (covers HVAC)
//
// Strategy:
//   1. Check robots.txt on each board site
//   2. Probe the GC roster for a "view all" or export endpoint
//   3. The roster at /database-sql/roster.aspx loads via ASP.NET PostBack
//      — attempt fetching without search params (returns all records)
//   4. If blocked, return status so CSV upload fallback is available
//
// Note: Alabama is a smaller market (~10-20K records across all boards).
// Priority is Virginia > SC > Alabama.

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay } from "./utils";

const AL_GC_BASE   = "https://genconbd.alabama.gov";
const AL_GC_ROSTER = `${AL_GC_BASE}/database-sql/roster.aspx`;
const AECB_BASE    = "https://aecb.alabama.gov";
const SOURCE_STATE = "AL";

function parseRosterHtml(html: string, licenseType: string): RawRecord[] {
  const records: RawRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse HTML table rows — AL GC roster typically has:
  // License# | Company Name | City | State | Status
  const rowRe = /<tr[^>]*class=["'][^"']*(?:row|data|record)[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  let m: RegExpExecArray | null;

  // Also try a simpler all-row match
  const allRowRe = /<tr>([\s\S]*?)<\/tr>/gi;

  const processRow = (rowHtml: string) => {
    const cells: string[] = [];
    let c: RegExpExecArray | null;
    const cr = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    while ((c = cr.exec(rowHtml)) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length < 2) return;
    if (cells[0].toLowerCase().includes("license") ||
        cells[0].toLowerCase().includes("number") ||
        cells[0] === "#") return;

    const licenseNumber = cells[0];
    const name = cells[1];
    const city = cells[2] || "";
    const stateAbbr = cells[3] || SOURCE_STATE;
    const status = cells[4] || "";

    if (!name || name.length < 2 || !licenseNumber || licenseNumber.length < 3) return;
    if (status && !/^(active|current|valid|licensed)/i.test(status)) return;

    records.push({
      businessName:  name,
      licenseType,
      licenseNumber,
      city:          city || undefined,
      state:         stateAbbr || SOURCE_STATE,
      rawData:       { status, source: "genconbd" },
    });
  };

  // Try styled rows first
  while ((m = rowRe.exec(html)) !== null) processRow(m[1]);

  // If nothing found, try plain rows
  if (records.length === 0) {
    while ((m = allRowRe.exec(html)) !== null) processRow(m[1]);
  }

  return records;
}

export const AlabamaScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "Alabama",
  registryUrl: AL_GC_ROSTER,

  async scrape(_importId: string): Promise<ScraperResult> {
    const gcAllowed = await isScrapingAllowed(AL_GC_BASE, "/database-sql/roster.aspx");
    if (!gcAllowed) {
      return { records: [], robotsBlocked: true, pagesScraped: 0 };
    }

    console.log("[AL] Fetching GC roster from genconbd.alabama.gov...");
    const allRecords: RawRecord[] = [];

    // Attempt 1: fetch roster with no search filter (may return all records)
    try {
      const res = await withRetry(() =>
        rateLimitedFetch(AL_GC_ROSTER, { headers: { Accept: "text/html" } })
      );
      if (res.ok) {
        const html = await res.text();

        // Check for "show all" or pagination control
        const totalMatch = html.match(/Total Records[^0-9]*([0-9,]+)/i);
        const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, "")) : 0;
        console.log(`[AL] Roster reports ${total.toLocaleString()} total GC records`);

        const gcRecords = parseRosterHtml(html, "General Contractor");
        console.log(`[AL] Parsed ${gcRecords.length.toLocaleString()} GC records from initial page`);
        allRecords.push(...gcRecords);

        // If we got fewer than expected and there's pagination, report it
        if (total > 0 && gcRecords.length < total * 0.5) {
          console.log("[AL] Roster appears paginated — only partial data retrieved");
          console.log("[AL] Recommend CSV upload via public records request to (334) 272-5030");
        }
      }
    } catch (err) {
      console.warn("[AL] Error fetching GC roster:", err);
    }

    await delay(2000);

    // Attempt 2: probe AECB for electrical contractor data
    const ecAllowed = await isScrapingAllowed(AECB_BASE, "/");
    if (ecAllowed) {
      console.log("[AL] Probing AECB for electrical contractor data...");
      try {
        const res = await rateLimitedFetch(`${AECB_BASE}/wp-content/uploads/`, {
          headers: { Accept: "text/html" },
        });
        // AECB sometimes publishes Excel reports in wp-content
        if (res.ok) {
          const html = await res.text();
          const csvLink = html.match(/href=["']([^"']*\.(?:csv|xlsx|xls))['"]/i);
          if (csvLink) {
            console.log(`[AL] Found AECB data file: ${csvLink[1]}`);
          } else {
            console.log("[AL] No downloadable AECB data file found on public directory");
          }
        }
      } catch { /* continue */ }
    }

    if (allRecords.length === 0) {
      return {
        records: [],
        robotsBlocked: true,
        error: "Alabama GC roster is paginated and does not support bulk export. " +
               "Recommend public records request to AL General Contractors Board (334) 272-5030. " +
               "~10,654 GC records available; electrical via AECB (334) 263-6743.",
        pagesScraped: 1,
      };
    }

    return { records: allRecords, robotsBlocked: false, pagesScraped: 1 };
  },
};
