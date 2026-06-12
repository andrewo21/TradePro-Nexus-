// Nevada State Contractors Board (NVSCB) — Public Contractor Listing Search
// Target: https://app.nvcontractorsboard.com/Clients/nvscb/Public/ContractorListing/ListingSearch.aspx
//
// Classic ASP.NET WebForms, same postback style as california.ts but much
// simpler — there is no CSV export, but the search form has only two
// dropdowns (County, Primary Classification), both offering an "All" option
// (value "0"). Submitting County=All + Classification=All returns every
// licensed contractor in a single server-rendered page (~19K rows, ~52MB) —
// no pagination, no CAPTCHA.
//
// Postback dance:
//   1. GET ListingSearch.aspx to capture __VIEWSTATE / __EVENTVALIDATION +
//      session cookies.
//   2. POST __EVENTTARGET=ctl00$ContentPlaceHolder1$btnSearch with
//      County=0, App=0 (both "All") — returns a 302 redirect to
//      ListingResults.aspx (note: the Location header is malformed as
//      "//Clients/..." which `new URL()` would misparse as protocol-relative;
//      we normalize leading slashes before resolving).
//   3. GET ListingResults.aspx (same cookies) → one large HTML page with a
//      DataGrid (id="ContentPlaceHolder1_dtgResults") containing every
//      record as <span id="..._lbBusinessName_N">, "..._lbStatus_N", etc.
//
// Each row provides: business name, street address, city/state/zip, license
// number, phone, classifications, expiration date, monetary limit, and
// status (observed: "Active" / "Active Probation" — both still licensed to
// operate, so both pass our active filter; anything else is excluded).
//
// Active filter: status starts with "Active" AND ExpirationDate >= today.
//
// Rate limit: 1 request per 2 seconds between postback steps.
// robots.txt: app.nvcontractorsboard.com/robots.txt returns 404 → fails open
// (allowed). The marketing site (www.nvcontractorsboard.com) robots.txt
// allows everything except /wp-admin/, which we don't touch.

import * as cheerio from "cheerio";
import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay, cleanPhone } from "./utils";

const NV_BASE = "https://app.nvcontractorsboard.com";
const SEARCH_URL = `${NV_BASE}/Clients/nvscb/Public/ContractorListing/ListingSearch.aspx`;

interface AspNetState {
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
  cookies: string;
}

function extractAspState(html: string, cookies: string): AspNetState {
  const $ = cheerio.load(html);
  return {
    viewState: ($('input[name="__VIEWSTATE"]').val() as string) ?? "",
    viewStateGenerator: ($('input[name="__VIEWSTATEGENERATOR"]').val() as string) ?? "",
    eventValidation: ($('input[name="__EVENTVALIDATION"]').val() as string) ?? "",
    cookies,
  };
}

function mergeCookies(existing: string, res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return existing;
  const newCookie = setCookie.split(";")[0];
  const name = newCookie.split("=")[0];
  const filtered = existing.split("; ").filter(c => !c.startsWith(`${name}=`) && c);
  filtered.push(newCookie);
  return filtered.join("; ");
}

// Resolve a Location header that may be malformed as "//Clients/..." (which
// `new URL()` would treat as protocol-relative, picking "Clients" as host).
function resolveRedirect(location: string, base: string): string {
  const normalized = location.replace(/^\/+/, "/");
  return new URL(normalized, base).toString();
}

// ── Step 1+2: postback dance to get the results page URL ──────────────────────

async function getResultsUrl(): Promise<{ url: string; cookies: string }> {
  // Step 1: initial GET
  const res1 = await withRetry(() => rateLimitedFetch(SEARCH_URL, { method: "GET" }));
  if (!res1.ok) throw new Error(`Initial GET failed: ${res1.status} ${res1.statusText}`);
  const html1 = await res1.text();
  const cookies = mergeCookies("", res1);
  const state1 = extractAspState(html1, cookies);

  if (!state1.viewState) {
    throw new Error("ListingSearch.aspx did not return __VIEWSTATE — page layout may have changed.");
  }

  await delay(2000);

  // Step 2: submit County=All (0), Classification=All (0), click Search
  const body = new URLSearchParams({
    __EVENTTARGET: "ctl00$ContentPlaceHolder1$btnSearch",
    __EVENTARGUMENT: "",
    __VIEWSTATE: state1.viewState,
    __VIEWSTATEGENERATOR: state1.viewStateGenerator,
    __EVENTVALIDATION: state1.eventValidation,
    "ctl00$ContentPlaceHolder1$County": "0",
    "ctl00$ContentPlaceHolder1$App": "0",
  });

  const res2 = await withRetry(() =>
    rateLimitedFetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: body.toString(),
      redirect: "manual",
    })
  );

  const location = res2.headers.get("location");
  if (!location) throw new Error(`Expected redirect to results page, got ${res2.status}`);

  return { url: resolveRedirect(location, SEARCH_URL), cookies: mergeCookies(cookies, res2) };
}

// ── Parse the results DataGrid ──────────────────────────────────────────────────

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseCityStateZip(raw: string | undefined): { city?: string; state?: string; zip?: string } {
  if (!raw) return {};
  const m = raw.trim().match(/^(.*)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!m) return { city: raw.trim() || undefined };
  return { city: m[1].trim(), state: m[2], zip: m[3] };
}

function parseResultsHtml(html: string): RawRecord[] {
  const $ = cheerio.load(html);
  const records: RawRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const indices = new Set<string>();
  $('span[id*="_lbBusinessName_"]').each((_, el) => {
    const id = $(el).attr("id") ?? "";
    const m = id.match(/_lbBusinessName_(\d+)$/);
    if (m) indices.add(m[1]);
  });

  for (const i of indices) {
    const get = (field: string) =>
      $(`span[id$="_${field}_${i}"]`).first().text().trim();

    const status = get("lbStatus");
    if (!/^active/i.test(status)) continue;

    const expires = parseDate(get("lbExpires"));
    if (!expires || expires < today) continue;

    const businessName = get("lbBusinessName");
    const licenseNumber = $(`a[id$="_lnkLicense_${i}"]`).first().text().trim();
    if (!businessName || !licenseNumber) continue;

    const street = get("lbCompoundStreet");
    const cityStateZip = parseCityStateZip(get("lbCityStateZip"));
    const phone = get("lbPhone");
    const classifications = $(`span[id$="_lbClassifications_${i}"]`)
      .first()
      .html()
      ?.split(/<br\s*\/?>/i)
      .map(s => s.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join("; ");
    const limitation = get("lbLimitation");
    const monetaryLimit = get("lbLimit");

    records.push({
      businessName,
      licenseNumber,
      licenseType: classifications || undefined,
      city: cityStateZip.city,
      state: "NV",
      phone: phone ? cleanPhone(phone) : undefined,
      rawData: {
        street: street ?? "",
        zip_code: cityStateZip.zip ?? "",
        expires: get("lbExpires"),
        monetary_limit: monetaryLimit ?? "",
        limitation: limitation ?? "",
        status,
      },
    });
  }

  return records;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt (app.nvcontractorsboard.com/robots.txt returns 404 -> fails open)
  const allowed = await isScrapingAllowed(NV_BASE, "/Clients/nvscb/Public/ContractorListing/ListingSearch.aspx");
  if (!allowed) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: "robots.txt disallows ListingSearch.aspx — use CSV upload fallback for Nevada.",
    };
  }

  // 2. Postback dance: County=All + Classification=All -> results page URL
  let resultsUrl: string;
  let cookies: string;
  try {
    const result = await getResultsUrl();
    resultsUrl = result.url;
    cookies = result.cookies;
  } catch (err) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 1,
      error: `Could not submit NVSCB contractor search: ${err instanceof Error ? err.message : String(err)} — use CSV upload fallback for Nevada.`,
    };
  }

  await delay(2000);

  // 3. Fetch the results page (~19K rows in one page)
  let html: string;
  try {
    const res = await withRetry(() =>
      rateLimitedFetch(resultsUrl, { headers: { Cookie: cookies } }, 0),
      2
    );
    if (!res.ok) {
      return {
        records: [], robotsBlocked: false, pagesScraped: 2,
        error: `NVSCB ListingResults.aspx returned ${res.status} ${res.statusText} — use CSV upload fallback for Nevada.`,
      };
    }
    html = await res.text();
  } catch (err) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 2,
      error: `Failed fetching NVSCB results page: ${err instanceof Error ? err.message : String(err)} — use CSV upload fallback for Nevada.`,
    };
  }

  // 4. Parse and filter to active, unexpired licenses
  const records = parseResultsHtml(html);

  return { records, robotsBlocked: false, pagesScraped: 3 };
}

export const NevadaScraper: StateScraperModule = {
  state: "NV",
  displayName: "Nevada",
  registryUrl: SEARCH_URL,
  scrape,
};
