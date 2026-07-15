// Pennsylvania contractor/trade license data — city-level open data sources.
//
// PA has no statewide bulk contractor registry (PALS is a reCAPTCHA-gated SPA
// with no export, see the history of this file). Contractor/trade licensing
// in PA is issued locally. Two cities publish real open data:
//
// 1. Philadelphia L&I Trade Licenses (OpenDataPhilly / CARTO SQL API)
//    https://phl.carto.com/api/v2/sql?q=SELECT+*+FROM+trade_licenses
//    robots.txt (phl.carto.com) only disallows /api/ for a handful of named
//    crawlers (Googlebot, Slurp, Yandex, msnbot, baiduspider) — no wildcard
//    rule, so our bot is allowed.
//
// 2. City of Pittsburgh + Allegheny County (Western PA Regional Data Center,
//    data.wprdc.org, CKAN datastore API):
//    - Licensed Contractors (General Contractor, Sign Contractor)
//    - Trade Licenses (Electrical Trade, HVAC Mechanical Trade,
//      Stationary Power Engineer, Fire Suppression Trade License)
//    - Allegheny County Master Plumbers (county-wide, not just Pittsburgh)
//    robots.txt (data.wprdc.org) disallows "/datastore/dump/" for User-agent:
//    * (the raw CSV dump URLs) but does NOT disallow "/api/3/action/" (the
//    CKAN datastore_search_sql JSON API) — so we use the API, never the raw
//    dump path, to stay inside what robots.txt permits.
//
// None of these sources expose phone or email — only Philadelphia's separate
// business_licenses/com_act_licenses tables carry contact info, and there is
// no reliable join key back to trade_licenses for most rows, so phone/email
// are left null here (consistent with FL, which also omits them).
//
// Pittsburgh's Licensed Contractors and Trade Licenses resources carry no
// address/city/zip/state fields at all in the source data — city is set to
// the constant "Pittsburgh" since that's what the license covers, not
// because it's present per-row. Allegheny County Master Plumbers does carry
// city + zip per row.

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const CARTO_BASE = "https://phl.carto.com";
const WPRDC_BASE = "https://data.wprdc.org";

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bHvac\b/gi, "HVAC")
    .replace(/\bPa\b/g, "PA");
}

async function fetchJson(url: string): Promise<any> {
  const res = await withRetry(() => rateLimitedFetch(url, { method: "GET" }), 3, 5000);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

// ── Philadelphia (CARTO SQL API) ────────────────────────────────────────────

async function fetchPhiladelphia(): Promise<RawRecord[]> {
  const sql = `SELECT licensenumber, licensetype, licensestatus, contactname, companyname, issuedate, expirationdate, icccategory FROM trade_licenses WHERE licensestatus='ACTIVE'`;
  const url = `${CARTO_BASE}/api/v2/sql?q=${encodeURIComponent(sql)}`;
  const data = await fetchJson(url);
  const rows: any[] = data.rows ?? [];

  const records: RawRecord[] = [];
  for (const row of rows) {
    const businessName = (row.companyname || row.contactname || "").trim();
    const licenseNumber = (row.licensenumber || "").trim();
    if (!businessName || !licenseNumber) continue;

    records.push({
      businessName,
      licenseType: row.licensetype ? titleCase(row.licensetype) : undefined,
      licenseNumber,
      city: "Philadelphia",
      state: "PA",
      rawData: {
        source_file: "Philadelphia L&I Trade Licenses",
        license_status_raw: row.licensestatus ?? "",
        contact_name: row.contactname ?? "",
        company_name: row.companyname ?? "",
        issue_date: row.issuedate ?? "",
        expiration_date: row.expirationdate ?? "",
        icc_category: row.icccategory ?? "",
      },
    });
  }
  return records;
}

// ── Pittsburgh / Allegheny County (WPRDC CKAN datastore API) ───────────────

async function datastoreSearchSql(sql: string): Promise<any[]> {
  const url = `${WPRDC_BASE}/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`;
  const data = await fetchJson(url);
  if (!data.success) throw new Error(`WPRDC query failed: ${JSON.stringify(data.error ?? data)}`);
  return data.result?.records ?? [];
}

const PITTSBURGH_CONTRACTORS_RESOURCE = "7e195511-5219-4d16-84f7-f34a2aedf5b4"; // Licensed Contractors
const PITTSBURGH_TRADE_RESOURCE = "51470435-a36f-4385-aee2-1c4766214a9a"; // Trade Licenses
const ALLEGHENY_PLUMBERS_RESOURCE = "60637ef7-96c9-47ee-95c3-ccc2a2140367"; // current Master Plumbers

async function fetchPittsburghContractors(): Promise<RawRecord[]> {
  const rows = await datastoreSearchSql(
    `SELECT license_number, license_type_name, naics_code, business_name, license_state, effective_date, expiration_date FROM "${PITTSBURGH_CONTRACTORS_RESOURCE}" WHERE license_state = 'Active'`
  );
  return rows
    .filter((r) => r.business_name && r.license_number)
    .map((r) => ({
      businessName: String(r.business_name).trim(),
      licenseType: r.license_type_name ? String(r.license_type_name).trim() : undefined,
      licenseNumber: String(r.license_number).trim(),
      city: "Pittsburgh",
      state: "PA",
      rawData: {
        source_file: "Pittsburgh Licensed Contractors",
        naics_code: r.naics_code ?? "",
        license_state_raw: r.license_state ?? "",
        effective_date: r.effective_date ?? "",
        expiration_date: r.expiration_date ?? "",
      },
    }));
}

async function fetchPittsburghTradeLicenses(): Promise<RawRecord[]> {
  const rows = await datastoreSearchSql(
    `SELECT license_number, license_type_name, naics_code, business_name, license_state, effective_date, expiration_date FROM "${PITTSBURGH_TRADE_RESOURCE}" WHERE license_state = 'Active'`
  );
  return rows
    .filter((r) => r.business_name && r.license_number)
    .map((r) => ({
      businessName: String(r.business_name).trim(),
      licenseType: r.license_type_name ? String(r.license_type_name).trim() : undefined,
      licenseNumber: String(r.license_number).trim(),
      city: "Pittsburgh",
      state: "PA",
      rawData: {
        source_file: "Pittsburgh Trade Licenses",
        naics_code: r.naics_code ?? "",
        license_state_raw: r.license_state ?? "",
        effective_date: r.effective_date ?? "",
        expiration_date: r.expiration_date ?? "",
      },
    }));
}

async function fetchAlleghenyPlumbers(): Promise<RawRecord[]> {
  const rows = await datastoreSearchSql(
    `SELECT registration_number, first_name, last_name, city, zip_code FROM "${ALLEGHENY_PLUMBERS_RESOURCE}"`
  );
  return rows
    .filter((r) => r.registration_number && (r.first_name || r.last_name))
    .map((r) => ({
      businessName: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
      licenseType: "Master Plumber",
      licenseNumber: String(r.registration_number).trim(),
      city: r.city ? String(r.city).trim() : undefined,
      state: "PA",
      rawData: {
        source_file: "Allegheny County Master Plumbers",
        zip: r.zip_code ?? "",
      },
    }));
}

// ── Main scraper ────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  const cartoAllowed = await isScrapingAllowed(CARTO_BASE, "/api/v2/sql");
  const wprdcAllowed = await isScrapingAllowed(WPRDC_BASE, "/api/3/action/datastore_search_sql");

  if (!cartoAllowed && !wprdcAllowed) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: "robots.txt disallows both phl.carto.com/api/ and data.wprdc.org/api/ for our bot.",
    };
  }

  const allRecords: RawRecord[] = [];
  const errors: string[] = [];
  let pagesScraped = 0;

  if (cartoAllowed) {
    try {
      allRecords.push(...await fetchPhiladelphia());
      pagesScraped++;
    } catch (err) {
      errors.push(`Philadelphia L&I: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push("Philadelphia L&I: robots.txt disallows phl.carto.com/api/ for our bot.");
  }

  if (wprdcAllowed) {
    try {
      allRecords.push(...await fetchPittsburghContractors());
      pagesScraped++;
    } catch (err) {
      errors.push(`Pittsburgh Licensed Contractors: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      allRecords.push(...await fetchPittsburghTradeLicenses());
      pagesScraped++;
    } catch (err) {
      errors.push(`Pittsburgh Trade Licenses: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      allRecords.push(...await fetchAlleghenyPlumbers());
      pagesScraped++;
    } catch (err) {
      errors.push(`Allegheny County Master Plumbers: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push("Pittsburgh/Allegheny: robots.txt disallows data.wprdc.org/api/ for our bot.");
  }

  return {
    records: allRecords,
    robotsBlocked: false,
    pagesScraped,
    error: errors.length ? errors.join(" | ") : undefined,
  };
}

export const PennsylvaniaScraper: StateScraperModule = {
  state: "PA",
  displayName: "Pennsylvania",
  registryUrl: "https://opendataphilly.org/datasets/licenses-and-inspections-trade-licenses/",
  scrape,
};
