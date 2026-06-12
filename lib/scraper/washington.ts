// Washington Department of Labor & Industries — Contractor License Data
// Target: https://data.wa.gov/resource/m8qx-ubtq.json (Socrata SODA API)
//
// L&I's "Verify a Contractor" tool (secure.lni.wa.gov/verify/) is an
// individual lookup form (search by Name / License / Account / UBI) with no
// bulk export. However, L&I publishes its full contractor license register
// as an open dataset on data.wa.gov — "L&I Contractor License Data -
// General" (id m8qx-ubtq), ~160K rows, free, no login, queryable via the
// Socrata SODA REST API as plain JSON.
//
// robots.txt: data.wa.gov/robots.txt allows /resource/* (only /browse,
// /catalog, /facet query-param variants and a few admin paths are
// disallowed) and sets Crawl-delay: 1 — we use the standard 2s delay.
//
// Pagination: $limit=50000 + $offset, ordered by contractorlicensenumber for
// stable paging across requests.
//
// Active filter: contractorlicensestatus='ACTIVE' (server-side $where) AND
// licenseexpirationdate >= today (client-side — a small number of "ACTIVE"
// rows have lapsed expiration dates due to data lag).
//
// Covers four license types: CC (Construction Contractor), EC (Electrical
// Contractor), PC (Plumbing Contractor), LC (Elevator Contractor).

import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, cleanPhone } from "./utils";

const WA_BASE = "https://data.wa.gov";
const DATASET_URL = `${WA_BASE}/resource/m8qx-ubtq.json`;
const PAGE_SIZE = 50000;

const TYPE_NAMES: Record<string, string> = {
  CC: "Construction Contractor",
  EC: "Electrical Contractor",
  PC: "Plumbing Contractor",
  LC: "Elevator Contractor",
};

interface WaRow {
  businessname?: string;
  contractorlicensenumber?: string;
  contractorlicensetypecode?: string;
  contractorlicensetypecodedesc?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phonenumber?: string;
  licenseeffectivedate?: string;
  licenseexpirationdate?: string;
  businesstypecodedesc?: string;
  specialtycode1desc?: string;
  specialtycode2desc?: string;
  ubi?: string;
  primaryprincipalname?: string;
  statuscode?: string;
  contractorlicensestatus?: string;
}

// ── Fetch all ACTIVE rows via SODA pagination ───────────────────────────────────

async function fetchActiveRows(): Promise<WaRow[]> {
  const rows: WaRow[] = [];
  let offset = 0;

  for (;;) {
    const url = new URL(DATASET_URL);
    url.searchParams.set("$where", "contractorlicensestatus='ACTIVE'");
    url.searchParams.set("$order", "contractorlicensenumber");
    url.searchParams.set("$limit", String(PAGE_SIZE));
    url.searchParams.set("$offset", String(offset));

    const res = await withRetry(() => rateLimitedFetch(url.toString(), { method: "GET" }));
    if (!res.ok) throw new Error(`SODA query failed: ${res.status} ${res.statusText}`);

    const page = (await res.json()) as WaRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

// ── Parse + filter rows ─────────────────────────────────────────────────────────

function parseRows(rows: WaRow[]): RawRecord[] {
  const records: RawRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const expirationRaw = row.licenseexpirationdate;
    const expiration = expirationRaw ? new Date(expirationRaw) : null;
    if (!expiration || isNaN(expiration.getTime()) || expiration < today) continue;

    const businessName = row.businessname?.trim();
    const licenseNumber = row.contractorlicensenumber?.trim();
    if (!businessName || !licenseNumber) continue;

    const typeCode = (row.contractorlicensetypecode ?? "").trim().toUpperCase();
    const phone = row.phonenumber?.trim();

    records.push({
      businessName,
      licenseNumber,
      licenseType: TYPE_NAMES[typeCode] ?? (row.contractorlicensetypecodedesc || undefined),
      city: row.city?.trim() || undefined,
      state: "WA",
      phone: phone ? cleanPhone(phone) : undefined,
      rawData: {
        address1: row.address1 ?? "",
        address2: row.address2 ?? "",
        address_state: row.state ?? "",
        zip: row.zip ?? "",
        business_type: row.businesstypecodedesc ?? "",
        specialty1: row.specialtycode1desc ?? "",
        specialty2: row.specialtycode2desc ?? "",
        ubi: row.ubi ?? "",
        primary_principal: row.primaryprincipalname ?? "",
        effective_date: row.licenseeffectivedate ?? "",
        expiration_date: row.licenseexpirationdate ?? "",
        status: row.contractorlicensestatus ?? "",
      },
    });
  }

  return records;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt (allows /resource/*)
  const allowed = await isScrapingAllowed(WA_BASE, "/resource/m8qx-ubtq.json");
  if (!allowed) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: "robots.txt disallows /resource/m8qx-ubtq.json — use CSV upload fallback for Washington.",
    };
  }

  // 2. Fetch all ACTIVE rows (paginated)
  let rows: WaRow[];
  let pages = 0;
  try {
    rows = await fetchActiveRows();
    pages = Math.ceil(rows.length / PAGE_SIZE) || 1;
  } catch (err) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 1,
      error: `Could not fetch L&I contractor dataset from data.wa.gov: ${err instanceof Error ? err.message : String(err)} — use CSV upload fallback for Washington.`,
    };
  }

  // 3. Filter to unexpired licenses
  const records = parseRows(rows);

  return { records, robotsBlocked: false, pagesScraped: pages };
}

export const WashingtonScraper: StateScraperModule = {
  state: "WA",
  displayName: "Washington",
  registryUrl: DATASET_URL,
  scrape,
};
