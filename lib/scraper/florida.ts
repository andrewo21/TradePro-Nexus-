// Florida DBPR Contractor Registry Scraper
// Target: https://www.myfloridalicense.com/wl11.asp
//
// Florida DBPR is ASP.NET WebForms — requires capturing ViewState on the
// initial GET before POSTing a search. Each profession type (General Contractor,
// Electrical, Plumbing, etc.) is searched separately.
//
// Rate limit: 1 request per 2 seconds (strictly enforced)
// robots.txt: checked before any scraping begins
//
// If the site structure changes or blocks scraping, fall back to CSV upload.
// CSV template for Florida: business_name, license_type, license_number,
//   city, state, phone, email, license_status

import * as cheerio from "cheerio";
import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay } from "./utils";

const FLORIDA_BASE = "https://www.myfloridalicense.com";
const SEARCH_URL = `${FLORIDA_BASE}/wl11.asp`;

// Florida profession codes for contractor trades.
// These map to the "profession" POST field on the DBPR search form.
// Verified against DBPR public documentation — update if site changes.
const FL_PROFESSION_CODES = [
  { code: "1501000000", name: "General Contractor" },
  { code: "1512000000", name: "Electrical Contractor" },
  { code: "1505000000", name: "Plumbing Contractor" },
  { code: "1504000000", name: "HVAC Contractor" },
  { code: "1502000000", name: "Building Contractor" },
  { code: "1503000000", name: "Residential Contractor" },
  { code: "1513000000", name: "Fire Sprinkler Contractor" },
  { code: "1506000000", name: "Roofing Contractor" },
];

const RESULTS_PER_PAGE = 50;

// ── Fetch ViewState ───────────────────────────────────────────────────────────

async function getViewState(): Promise<{ viewState: string; eventValidation: string } | null> {
  const res = await withRetry(() =>
    rateLimitedFetch(SEARCH_URL, { method: "GET" })
  );
  if (!res.ok) return null;

  const html = await res.text();
  const $ = cheerio.load(html);

  const viewState = $('input[name="__VIEWSTATE"]').val() as string | undefined;
  const eventValidation = $('input[name="__EVENTVALIDATION"]').val() as string | undefined;

  if (!viewState) return null;
  return { viewState, eventValidation: eventValidation ?? "" };
}

// ── Parse result table ────────────────────────────────────────────────────────

function parseResultsTable(html: string, licenseType: string): RawRecord[] {
  const $ = cheerio.load(html);
  const records: RawRecord[] = [];

  // DBPR results render in a table with class "resultsTable" or similar.
  // Column order: License Name | License Number | City | Status | Type
  // NOTE: verify column positions if DBPR updates their layout.
  const table = $("table.resultsTable, table#searchResults, table").filter((_, el) => {
    return $(el).find("tr").length > 1;
  }).first();

  if (!table.length) return records;

  // Detect header columns to handle layout changes
  const headers: string[] = [];
  table.find("tr").first().find("th, td").each((_, th) => {
    headers.push($(th).text().trim().toLowerCase());
  });

  const nameIdx   = headers.findIndex(h => h.includes("name") || h.includes("licensee"));
  const numIdx    = headers.findIndex(h => h.includes("number") || h.includes("license #"));
  const cityIdx   = headers.findIndex(h => h.includes("city"));
  const statusIdx = headers.findIndex(h => h.includes("status"));

  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("td");
    if (!cells.length) return;

    const cell = (i: number) => $(cells.eq(i)).text().trim();

    const status = statusIdx >= 0 ? cell(statusIdx).toLowerCase() : "unknown";

    // Only import ACTIVE licenses — skip expired, suspended, revoked
    if (status && status !== "active" && status !== "current") return;

    const record: RawRecord = {
      businessName:  nameIdx   >= 0 ? cell(nameIdx)   : cell(0),
      licenseNumber: numIdx    >= 0 ? cell(numIdx)     : cell(1),
      city:          cityIdx   >= 0 ? cell(cityIdx)    : cell(2),
      state:         "FL",
      licenseType,
      rawData: {},
    };

    // Capture all cells in rawData for debugging / future use
    cells.each((i, td) => {
      if (headers[i]) record.rawData![headers[i]] = $(td).text().trim();
    });

    if (record.licenseNumber && record.businessName) {
      records.push(record);
    }
  });

  return records;
}

// ── Check pagination ──────────────────────────────────────────────────────────

function getTotalPages(html: string): number {
  const $ = cheerio.load(html);
  // DBPR shows "Showing records X-Y of Z" or similar pagination text
  const pageText = $("span.pageCount, .pagination, #pageInfo").text();
  const match = pageText.match(/of\s+(\d+)/i) ?? html.match(/of\s+(\d+)\s+records/i);
  if (!match) return 1;
  const total = parseInt(match[1]);
  return Math.ceil(total / RESULTS_PER_PAGE);
}

// ── Scrape one profession ─────────────────────────────────────────────────────

async function scrapeProfession(
  professionCode: string,
  professionName: string,
  stateTokens: { viewState: string; eventValidation: string }
): Promise<{ records: RawRecord[]; pages: number }> {
  const allRecords: RawRecord[] = [];
  let currentPage = 1;

  // First page — POST the search form
  const firstBody = new URLSearchParams({
    __VIEWSTATE:       stateTokens.viewState,
    __EVENTVALIDATION: stateTokens.eventValidation,
    profession:        professionCode,
    county:            "00",   // 00 = all counties
    search_name:       "",
    l_type:            "1",    // Active licenses
    Search:            "Search",
  });

  const firstRes = await withRetry(() =>
    rateLimitedFetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: firstBody.toString(),
    })
  );

  if (!firstRes.ok) {
    console.warn(`FL scraper: profession ${professionName} returned ${firstRes.status}`);
    return { records: [], pages: 0 };
  }

  const firstHtml = await firstRes.text();
  allRecords.push(...parseResultsTable(firstHtml, professionName));

  const totalPages = getTotalPages(firstHtml);
  currentPage = 2;

  // Subsequent pages — re-fetch ViewState from first result, then page through
  while (currentPage <= totalPages) {
    await delay(2000); // strict 2-second rate limit

    const $ = cheerio.load(firstHtml);
    const nextViewState       = $('input[name="__VIEWSTATE"]').val() as string || stateTokens.viewState;
    const nextEventValidation = $('input[name="__EVENTVALIDATION"]').val() as string || stateTokens.eventValidation;

    const pageBody = new URLSearchParams({
      __VIEWSTATE:         nextViewState,
      __EVENTVALIDATION:   nextEventValidation,
      __EVENTTARGET:       "GridView1",  // DBPR pagination target — verify if changed
      __EVENTARGUMENT:     `Page$${currentPage}`,
      profession:          professionCode,
      county:              "00",
    });

    const pageRes = await withRetry(() =>
      rateLimitedFetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: pageBody.toString(),
      })
    );

    if (!pageRes.ok) break;

    const pageHtml = await pageRes.text();
    const pageRecords = parseResultsTable(pageHtml, professionName);
    if (!pageRecords.length) break; // Empty page = done
    allRecords.push(...pageRecords);
    currentPage++;
  }

  return { records: allRecords, pages: totalPages };
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt before anything
  const allowed = await isScrapingAllowed(FLORIDA_BASE, "/wl11.asp");
  if (!allowed) {
    console.warn("FL scraper: robots.txt disallows scraping /wl11.asp — use CSV upload");
    return { records: [], robotsBlocked: true, pagesScraped: 0,
             error: "robots.txt blocks /wl11.asp — use CSV upload fallback" };
  }

  // 2. Get initial ViewState from search form
  let stateTokens: { viewState: string; eventValidation: string } | null = null;
  try {
    stateTokens = await getViewState();
  } catch (err) {
    return { records: [], robotsBlocked: false, pagesScraped: 0,
             error: `Failed to load DBPR search form: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!stateTokens) {
    return { records: [], robotsBlocked: false, pagesScraped: 0,
             error: "Could not extract ViewState — DBPR form structure may have changed. Use CSV upload." };
  }

  // 3. Scrape each profession type
  const allRecords: RawRecord[] = [];
  let totalPages = 0;

  for (const prof of FL_PROFESSION_CODES) {
    console.log(`FL scraper: scraping profession "${prof.name}" (${prof.code})`);
    try {
      const { records, pages } = await scrapeProfession(prof.code, prof.name, stateTokens);
      allRecords.push(...records);
      totalPages += pages;
      console.log(`FL scraper: "${prof.name}" → ${records.length} active records, ${pages} pages`);
    } catch (err) {
      console.warn(`FL scraper: profession "${prof.name}" failed:`, err instanceof Error ? err.message : String(err));
      // Continue to next profession — don't abort entire import
    }

    // Respectful pause between profession searches
    await delay(3000);
  }

  return {
    records: allRecords,
    robotsBlocked: false,
    pagesScraped: totalPages,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const FloridaScraper: StateScraperModule = {
  state: "FL",
  displayName: "Florida",
  registryUrl: SEARCH_URL,
  scrape,
};
