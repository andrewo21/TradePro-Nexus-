// Virginia Department of Professional and Occupational Regulation (DPOR)
// Target: https://www.dpor.virginia.gov/RegulantLists
//
// DPOR publishes free ASCII tab-delimited regulant lists for all licensed
// professions. No login, no fee, no CAPTCHA. Files are linked directly from
// the RegulantLists page as .txt downloads.
//
// robots.txt: dpor.virginia.gov/robots.txt — check before fetching.
//
// Relevant boards:
//   Board for Contractors → Class A, B, C Contractors
//   Board for Tradesmen  → Electricians, Plumbers, HVAC/Gas fitters
//
// File format: ASCII tab-delimited, no header row (or header varies).
// Columns vary by file but typically:
//   0: License Number
//   1: Board / License Type
//   2: Full Name / Business Name
//   3+: Address, City, State, Zip, Phone, Expiration, Status
//
// We fetch the RegulantLists page, find links to contractor/tradesman
// .txt files, download each, parse, and stage.

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay } from "./utils";

const DPOR_BASE       = "https://www.dpor.virginia.gov";
const REGULANT_PAGE   = `${DPOR_BASE}/RegulantLists`;
const SOURCE_STATE    = "VA";

// Keywords that identify contractor / tradesman regulant list links
const TARGET_KEYWORDS = [
  "contractor", "tradesman", "electrician", "plumber", "plumbing",
  "hvac", "gas fitter", "mechanical",
];

function matchesTarget(href: string, text: string): boolean {
  const combined = (href + " " + text).toLowerCase();
  return TARGET_KEYWORDS.some(k => combined.includes(k));
}

// Parse a DPOR tab-delimited file.
// DPOR files have no consistent header row — columns shift per board.
// We try to identify columns by position and content heuristics.
function parseDporFile(raw: string, fileLabel: string): RawRecord[] {
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  const records: RawRecord[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const line of lines) {
    // Skip obvious header lines
    if (line.toLowerCase().includes("license number") ||
        line.toLowerCase().includes("licensenumber") ||
        line.startsWith("LIC") ||
        line.startsWith("Board")) {
      continue;
    }

    const cols = line.split("\t").map(c => c.trim());
    if (cols.length < 3) continue;

    // Heuristic column mapping — DPOR files typically:
    // Col 0: License number (alphanumeric, 4-12 chars)
    // Col 1: License type or board code
    // Col 2: Business/person name
    // Col 3-6: Address parts
    // Col 7: City
    // Col 8: State abbr
    // Col 9: Zip
    // Col 10: Expiration date or phone
    // Col 11+: Status, expiration, etc.

    let licenseNumber = cols[0] || "";
    let licenseType   = fileLabel; // use file label as fallback
    let name          = "";
    let city          = "";
    let stateAbbr     = "";
    let phone         = "";
    let expiration    = "";
    let status        = "";

    // Try to find expiration date and status in the last few columns
    for (let i = cols.length - 1; i >= Math.max(0, cols.length - 4); i--) {
      const v = cols[i];
      // Date pattern MM/DD/YYYY or YYYY-MM-DD
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        if (!expiration) expiration = v;
      }
      // Status: Active, Inactive, Expired, etc.
      if (/^(active|inactive|expired|current|valid|revoked|suspended|cancelled)/i.test(v)) {
        if (!status) status = v;
      }
    }

    // Check expiration — skip expired records
    if (expiration) {
      const exp = new Date(expiration);
      if (!isNaN(exp.getTime()) && exp < today) continue;
    }

    // Skip if clearly not active
    if (status && !/^(active|current|valid)/i.test(status)) continue;

    // Extract name (typically col 2, sometimes col 1)
    if (cols.length >= 3) {
      // If col 1 looks like a license type (non-numeric text), use col 2 as name
      if (isNaN(Number(cols[1])) && cols[1].length > 2 && !cols[1].match(/^\d{4}/)) {
        licenseType = cols[1];
        name = cols[2];
      } else {
        name = cols[1];
      }
    }

    // Find city / state by looking for a 2-letter state abbreviation
    for (let i = 3; i < Math.min(cols.length, 12); i++) {
      if (/^[A-Z]{2}$/.test(cols[i]) && cols[i] !== "VA" || cols[i] === "VA") {
        stateAbbr = cols[i];
        city = cols[i - 1] || "";
        // Check for phone in adjacent columns
        const phoneCandidate = cols[i + 1] || cols[i + 2] || "";
        if (/[\d\-\(\)\s]{10,}/.test(phoneCandidate)) {
          phone = phoneCandidate.replace(/\D/g, "");
          if (phone.length === 10) phone = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
          else phone = phoneCandidate;
        }
        break;
      }
    }

    if (!name || name.length < 2) continue;
    if (!licenseNumber || licenseNumber.length < 3) continue;

    // Clean up license type
    licenseType = licenseType
      .replace(/board for/i, "")
      .replace(/regulant list/i, "")
      .trim() || fileLabel;

    records.push({
      businessName:  name,
      licenseType:   licenseType,
      licenseNumber: licenseNumber,
      city:          city || undefined,
      state:         stateAbbr || SOURCE_STATE,
      phone:         phone || undefined,
      rawData:       { raw_cols: cols.join("|"), source_file: fileLabel },
    });
  }

  return records;
}

async function fetchRegulantsPage(): Promise<string | null> {
  try {
    const res = await withRetry(() =>
      rateLimitedFetch(REGULANT_PAGE, {
        headers: { Accept: "text/html" },
      })
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractFileLinks(html: string): Array<{ url: string; label: string }> {
  const links: Array<{ url: string; label: string }> = [];

  // Match href attributes in anchor tags
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").trim();

    // We want .txt files or links referencing regulant list downloads
    if (!href) continue;
    const isDownload = href.endsWith(".txt") ||
                       href.includes("Regulant") ||
                       href.includes("regulant") ||
                       href.includes("List") ||
                       href.includes("download");

    if (isDownload && matchesTarget(href, text)) {
      const url = href.startsWith("http") ? href : `${DPOR_BASE}${href.startsWith("/") ? href : "/" + href}`;
      links.push({ url, label: text || href.split("/").pop() || "Unknown" });
    }
  }

  // De-duplicate by URL
  const seen = new Set<string>();
  return links.filter(l => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

async function downloadAndParse(url: string, label: string): Promise<RawRecord[]> {
  try {
    const res = await withRetry(() =>
      rateLimitedFetch(url, {
        headers: { Accept: "text/plain,text/*,*/*" },
      })
    );
    if (!res.ok) {
      console.warn(`  [VA] Could not download ${label}: HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    const records = parseDporFile(text, label);
    console.log(`  [VA] ${label}: ${records.length.toLocaleString()} active records parsed`);
    return records;
  } catch (err) {
    console.warn(`  [VA] Error downloading ${label}:`, err);
    return [];
  }
}

export const VirginiaScraper: StateScraperModule = {
  state: SOURCE_STATE,
  displayName: "Virginia",
  registryUrl: REGULANT_PAGE,

  async scrape(importId: string): Promise<ScraperResult> {
    // robots.txt check
    const allowed = await isScrapingAllowed(DPOR_BASE, "/RegulantLists");
    if (!allowed) {
      return { records: [], robotsBlocked: true, pagesScraped: 0 };
    }

    console.log("[VA] Fetching DPOR RegulantLists page...");
    const html = await fetchRegulantsPage();
    if (!html) {
      return {
        records: [],
        robotsBlocked: false,
        error: "Could not fetch DPOR RegulantLists page",
        pagesScraped: 0,
      };
    }

    const links = extractFileLinks(html);
    console.log(`[VA] Found ${links.length} contractor/tradesman regulant list files`);

    if (links.length === 0) {
      // Fallback: try known DPOR direct file paths
      const knownPaths = [
        "/sites/default/files/Records%20and%20Documents/Regulant%20List/Contractors.txt",
        "/sites/default/files/Records%20and%20Documents/Regulant%20List/Tradesmen.txt",
        "/sites/default/files/Records%20and%20Documents/Regulant%20List/Electricians.txt",
      ];
      for (const p of knownPaths) {
        links.push({ url: `${DPOR_BASE}${p}`, label: p.split("/").pop()?.replace(".txt", "") || "Unknown" });
      }
      console.log("[VA] Using fallback known file paths");
    }

    const allRecords: RawRecord[] = [];
    let pagesScraped = 1; // the regulant lists page itself

    for (const link of links) {
      console.log(`[VA] Downloading: ${link.label}`);
      const records = await downloadAndParse(link.url, link.label);
      allRecords.push(...records);
      pagesScraped++;
      await delay(2000);
    }

    // Dedupe within VA on license number
    const seen = new Set<string>();
    const deduped: RawRecord[] = [];
    for (const r of allRecords) {
      const key = `${r.licenseNumber}:VA`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
    }

    console.log(`[VA] Total after dedup: ${deduped.length.toLocaleString()} records`);
    return { records: deduped, robotsBlocked: false, pagesScraped };
  },
};
