// Florida DBPR Contractor Registry Scraper — Session 5
// Target: DBPR "Public Records" bulk CSV extracts (www2.myfloridalicense.com)
//   - Construction Industry (Board 06): all CILB trades (CGC, CBC, CAC, CCC,
//     CFC, CRC, CPC, SCC, CUC, CMC, CSC, PCC, CVC, RR/RB/RG/RC/RP/RM/RU/RQ/RS/RA/RX,
//     QB, FRO)
//   - Electrical Contractors (Board 08): EC, ER, ES, EF, EG, EY, EZ, EH, EI, ET
//
// These are official weekly bulk-data extracts published under DBPR's
// "Public Records" program (https://www2.myfloridalicense.com/construction-industry/public-records/
// and .../electrical-contractors/public-records/) — no login required.
// The legacy wl11.asp interactive search wizard is NOT used: it is a
// classic-ASP multi-step form intended for one-off lookups and does not
// support bulk "all licenses of type X, all counties" queries.
//
// CSV layout (NO header row), per DBPR's published ReadMe/Disclaimer
// (https://www2.myfloridalicense.com/public-records-read-medisclaimer/):
//   0  Board Number
//   1  Occupation Code (license type abbreviation, e.g. CGC, CBC, EC...)
//   2  Licensee Name (individual, "LAST, FIRST MIDDLE")
//   3  Doing Business As Name
//   4  Class Code
//   5  Address Line 1
//   6  Address Line 2
//   7  Address Line 3
//   8  City
//   9  State
//   10 Zip
//   11 County Code
//   12 License Number (numeric, zero-padded)
//   13 Primary Status   (C = Current/clear standing, S = Suspended, P = Probation)
//   14 Secondary Status (A = Active, I = Inactive, '' = n/a)
//   15 Original Licensure Date
//   16 Effective Date
//   17 Expiration Date
//   18 (blank)
//   19 Renewal Period
//   20 Alternate License # (occupation code + license number, e.g. "CGC1234567")
//
// "Active" = Primary Status 'C' AND Secondary Status 'A' — matches DBPR's
// public "active, in good standing" definition and excludes
// suspended/probation licenses.
//
// Excludes CRS1/CRS2/CRS3 occupation codes — these are continuing-education
// course records, not contractor licenses.
//
// robots.txt: www2.myfloridalicense.com only disallows /wp-admin/,
// /wp-includes/, /wp-content/, /xmlrpc.php, /author/* — /sto/file_download/*
// is allowed.
//
// No phone/email fields are present in these extracts (DBPR omits contact
// info from the public bulk download for privacy).

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const FL_BASE = "https://www2.myfloridalicense.com";

const EXTRACTS = [
  { url: `${FL_BASE}/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv`, name: "construction (Board 06)" },
  { url: `${FL_BASE}/sto/file_download/extracts/lic08el.csv`, name: "electrical (Board 08)" },
];

// Occupation Code → full license type name, per DBPR "Understanding DBPR Codes"
const OCCUPATION_NAMES: Record<string, string> = {
  // Construction Industry (Board 06)
  CGC: "Certified General Contractor",
  CBC: "Certified Building Contractor",
  CAC: "Certified Air Conditioning Contractor",
  CCC: "Certified Roofing Contractor",
  CFC: "Certified Plumbing Contractor",
  CRC: "Certified Residential Contractor",
  CPC: "Certified Pool/Spa Contractor",
  SCC: "Certified Specialty Contractor",
  CUC: "Certified Utility & Excavation Contractor",
  CMC: "Certified Mechanical Contractor",
  CSC: "Certified Sheet Metal Contractor",
  PCC: "Certified Pollutant Storage Contractor",
  CVC: "Certified Solar Contractor",
  RR: "Registered Residential Contractor",
  RF: "Registered Plumbing Contractor",
  RC: "Registered Roofing Contractor",
  RP: "Registered Pool/Spa Contractor",
  RB: "Registered Building Contractor",
  RG: "Registered General Contractor",
  RX: "Registered Specialty Contractor",
  RM: "Registered Mechanical Contractor",
  RU: "Registered Underground Utility Excavator",
  RQ: "Registered Precision Tank Tester",
  RS: "Registered Sheet Metal Contractor",
  RA: "Registered Air Conditioning Contractor",
  QB: "Construction Business",
  FRO: "Financially Responsible Officer",
  // Electrical Contractors (Board 08)
  EC: "Electrical Contractor",
  ER: "Registered Electrical Contractor",
  ES: "Certified Specialty Contractor (Electrical)",
  EF: "Certified Alarm System Contractor I",
  EG: "Certified Alarm System Contractor II",
  EY: "Registered Alarm System Contractor I",
  EZ: "Registered Alarm System Contractor II",
  EH: "Registered Alarm System Contractor (EH)",
  EI: "Registered Alarm System Contractor (EI)",
  ET: "Electrical Contractor (ET)",
};

// Continuing-education course records — not contractor licenses
const EXCLUDED_CODES = new Set(["CRS1", "CRS2", "CRS3"]);

// ── CSV parsing (no header row, simple quoted-field lines) ──────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function fetchCsvRows(url: string): Promise<string[][]> {
  const res = await withRetry(() => rateLimitedFetch(url, { method: "GET" }), 3, 5000);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.map(parseCsvLine);
}

// ── Parse + filter rows ─────────────────────────────────────────────────────────

function parseRows(rows: string[][], sourceFile: string): RawRecord[] {
  const records: RawRecord[] = [];

  for (const cols of rows) {
    if (cols.length < 21) continue;

    const occCode = cols[1].trim();
    const primaryStatus = cols[13].trim();
    const secondaryStatus = cols[14].trim();

    // Active, in good standing only
    if (primaryStatus !== "C" || secondaryStatus !== "A") continue;
    if (EXCLUDED_CODES.has(occCode)) continue;

    const individualName = cols[2].trim();
    const dbaName = cols[3].trim();
    const businessName = dbaName || individualName;
    if (!businessName) continue;

    const licenseNumRaw = cols[12].trim();
    const altLicNum = cols[20]?.trim();
    const licenseNumber = altLicNum || `${occCode}${licenseNumRaw}`;
    if (!licenseNumber) continue;

    records.push({
      businessName,
      licenseType: OCCUPATION_NAMES[occCode] ?? occCode,
      licenseNumber,
      city: cols[8].trim() || undefined,
      state: "FL",
      rawData: {
        board: cols[0] ?? "",
        occupation_code: occCode,
        individual_name: individualName,
        dba_name: dbaName,
        address1: cols[5] ?? "",
        address2: cols[6] ?? "",
        zip: cols[10] ?? "",
        county_code: cols[11] ?? "",
        primary_status: primaryStatus,
        secondary_status: secondaryStatus,
        original_license_date: cols[15] ?? "",
        effective_date: cols[16] ?? "",
        expiration_date: cols[17] ?? "",
        source_file: sourceFile,
      },
    });
  }

  return records;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  const allowed = await isScrapingAllowed(FL_BASE, "/sto/file_download/extracts/CONSTRUCTIONLICENSE_1.csv");
  if (!allowed) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: "robots.txt disallows /sto/file_download/extracts/ — use CSV upload fallback for Florida.",
    };
  }

  const allRecords: RawRecord[] = [];

  for (const extract of EXTRACTS) {
    try {
      const rows = await fetchCsvRows(extract.url);
      allRecords.push(...parseRows(rows, extract.name));
    } catch (err) {
      return {
        records: allRecords, robotsBlocked: false, pagesScraped: allRecords.length ? 1 : 0,
        error: `Failed fetching DBPR ${extract.name} extract: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { records: allRecords, robotsBlocked: false, pagesScraped: EXTRACTS.length };
}

export const FloridaScraper: StateScraperModule = {
  state: "FL",
  displayName: "Florida",
  registryUrl: `${FL_BASE}/construction-industry/public-records/`,
  scrape,
};
