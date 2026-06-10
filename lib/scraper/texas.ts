// Texas Department of Licensing and Regulation (TDLR) — bulk license data
// Target: https://www.tdlr.texas.gov/LicenseSearch/licfile.asp
//
// TDLR publishes daily CSV extracts of every active/inactive licensee per
// license type at https://www.tdlr.texas.gov/dbproduction2/<file>.csv.
// robots.txt only disallows /ithelp/ and a couple of PDF certificate
// templates — bulk data downloads are explicitly offered to the public, so
// no search-form scraping is needed.
//
// Rate limit: 1 request per 2 seconds between file downloads (strictly
// enforced via rateLimitedFetch + an extra delay between files).
//
// Active filter: TDLR's extracts include all licenses regardless of status,
// so we filter on LICENSE EXPIRATION DATE >= today.
//
// If TDLR renames/moves these files, check licfile.asp for current links and
// fall back to CSV upload (CSV template: business_name, license_type,
// license_number, city, state, phone, email, license_status).

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay, parseCSV } from "./utils";

const TDLR_BASE = "https://www.tdlr.texas.gov";
const LICFILE_URL = `${TDLR_BASE}/LicenseSearch/licfile.asp`;

// Construction-relevant contractor license data files.
// Verify against licfile.asp ("Download License Files") if these 404.
const TX_LICENSE_FILES: { url: string; licenseType: string }[] = [
  { url: `${TDLR_BASE}/dbproduction2/Lteecele.csv`, licenseType: "Electrical Contractor" },
  { url: `${TDLR_BASE}/dbproduction2/Ltescele.csv`, licenseType: "Electrical Sign Contractor" },
  { url: `${TDLR_BASE}/dbproduction2/ltairref.csv`, licenseType: "Air Conditioning & Refrigeration Contractor" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseExpirationDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

// "HOUSTON TX 77031-2516" → "HOUSTON"
function parseCity(combined: string | undefined): string | null {
  if (!combined) return null;
  const m = combined.trim().match(/^(.*?)\s+[A-Z]{2}\s+\d{5}/);
  if (m) return m[1].trim() || null;
  return combined.trim() || null;
}

function parseFile(csvText: string, licenseType: string): RawRecord[] {
  const rows = parseCSV(csvText);
  const records: RawRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    // Active licenses only — skip expired
    const expiration = parseExpirationDate(row["license_expiration_date"]);
    if (!expiration || expiration < today) continue;

    const businessName = row["business_name"]?.trim() || row["name"]?.trim();
    const licenseNumber = row["license_number"]?.trim();
    if (!businessName || !licenseNumber) continue;

    const city =
      parseCity(row["business_city,_state_zip"]) ??
      parseCity(row["mailing_address_city,_state_zip"]);

    const phone = row["business_phone"]?.trim() || row["phone_number"]?.trim();

    const subtype = row["license_subtype"]?.trim();

    records.push({
      businessName,
      licenseNumber,
      licenseType: subtype ? `${licenseType} (${subtype})` : licenseType,
      city: city ?? undefined,
      state: "TX",
      phone: phone || undefined,
      rawData: {
        county: row["county"] ?? "",
        license_expiration_date: row["license_expiration_date"] ?? "",
        license_subtype: subtype ?? "",
      },
    });
  }

  return records;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt for the bulk data directory
  const allowed = await isScrapingAllowed(TDLR_BASE, "/dbproduction2/");
  if (!allowed) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: "robots.txt disallows /dbproduction2/ — use CSV upload fallback for Texas.",
    };
  }

  const allRecords: RawRecord[] = [];
  let filesFetched = 0;

  for (const file of TX_LICENSE_FILES) {
    try {
      const res = await withRetry(() => rateLimitedFetch(file.url));
      if (!res.ok) {
        console.warn(`TX scraper: ${file.licenseType} file returned ${res.status}`);
        await delay(2000);
        continue;
      }
      const csvText = await res.text();
      const records = parseFile(csvText, file.licenseType);
      allRecords.push(...records);
      filesFetched++;
      console.log(`TX scraper: ${file.licenseType} → ${records.length} active records`);
    } catch (err) {
      console.warn(`TX scraper: ${file.licenseType} failed:`, err instanceof Error ? err.message : String(err));
    }

    // Respectful pause between large file downloads
    await delay(2000);
  }

  if (filesFetched === 0) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 0,
      error: "Could not fetch any TDLR license data files — use CSV upload fallback for Texas.",
    };
  }

  return { records: allRecords, robotsBlocked: false, pagesScraped: filesFetched };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const TexasScraper: StateScraperModule = {
  state: "TX",
  displayName: "Texas",
  registryUrl: LICFILE_URL,
  scrape,
};
