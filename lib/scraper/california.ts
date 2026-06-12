// California Contractors State License Board (CSLB) — Public Data Portal
// Target: https://www.cslb.ca.gov/onlineservices/dataportal/ContractorList
//
// CSLB publishes a free, no-cost "Master License File" covering every
// licensed contractor in California (license number, business name,
// address, classifications, status, bond/workers'-comp info). The portal is
// classic ASP.NET WebForms — getting the CSV requires a two-step postback
// dance:
//   1. GET the portal page to capture __VIEWSTATE / __EVENTVALIDATION.
//   2. POST with __EVENTTARGET=ctl00$MainContent$ddlStatus and
//      ddlStatus=M ("License Master") — this postback re-renders the page
//      with a "download" link/button (ctl00$MainContent$lbMasterCSV).
//   3. POST with __EVENTTARGET=ctl00$MainContent$lbMasterCSV (carrying the
//      ddlStatus=M selection and the new VIEWSTATE from step 2) — this
//      returns a 302 redirect to
//      /OnlineServices/DataPortal/DownLoadFile.ashx?fName=MasterLicenseData&type=C
//   4. GET that URL (same session cookies) → ~75MB CSV, ~243K rows.
//
// Active filter: PrimaryStatus === "CLEAR" AND ExpirationDate >= today
// (the Master file also includes "expired but renewable" licenses, which
// CSLB still marks CLEAR — we exclude those to honor "active licenses only").
//
// Rate limit: 1 request per 2 seconds between the postback steps (the final
// CSV download is a single large request).
// robots.txt: cslb.ca.gov has no robots.txt (404 → fails open / allowed).
//
// CSV columns (Master License File):
// LicenseNo, LastUpdate, BusinessName, BUS-NAME-2, FullBusinessName,
// MailingAddress, City, State, County, ZIPCode, country, BusinessPhone,
// BusinessType, IssueDate, ReissueDate, ExpirationDate, ..., PrimaryStatus,
// SecondaryStatus, Classifications(s), ...

import * as cheerio from "cheerio";
import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay, cleanPhone, parseCSV } from "./utils";

const CSLB_BASE = "https://www.cslb.ca.gov";
const PORTAL_URL = `${CSLB_BASE}/onlineservices/dataportal/ContractorList`;

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

// ── Step 1+2+3: postback dance to find the CSV download URL ───────────────────

async function getCsvDownloadUrl(): Promise<{ url: string; cookies: string }> {
  // Step 1: initial GET
  const res1 = await withRetry(() => rateLimitedFetch(PORTAL_URL, { method: "GET" }));
  if (!res1.ok) throw new Error(`Initial GET failed: ${res1.status} ${res1.statusText}`);
  const html1 = await res1.text();
  let cookies = mergeCookies("", res1);
  const state1 = extractAspState(html1, cookies);

  await delay(2000);

  // Step 2: select "License Master" (ddlStatus=M) — autopostback
  const body2 = new URLSearchParams({
    __EVENTTARGET: "ctl00$MainContent$ddlStatus",
    __EVENTARGUMENT: "",
    __VIEWSTATE: state1.viewState,
    __VIEWSTATEGENERATOR: state1.viewStateGenerator,
    __EVENTVALIDATION: state1.eventValidation,
    "ctl00$MainContent$ddlStatus": "M",
  });

  const res2 = await withRetry(() =>
    rateLimitedFetch(PORTAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: body2.toString(),
    })
  );
  if (!res2.ok) throw new Error(`ddlStatus postback failed: ${res2.status} ${res2.statusText}`);
  const html2 = await res2.text();
  cookies = mergeCookies(cookies, res2);
  const state2 = extractAspState(html2, cookies);

  if (!/lbMasterCSV/.test(html2)) {
    throw new Error("Master License CSV download link not found after ddlStatus postback — CSLB portal layout may have changed.");
  }

  await delay(2000);

  // Step 3: click "download" (lbMasterCSV) — returns a 302 to the file URL
  const body3 = new URLSearchParams({
    __EVENTTARGET: "ctl00$MainContent$lbMasterCSV",
    __EVENTARGUMENT: "",
    __VIEWSTATE: state2.viewState,
    __VIEWSTATEGENERATOR: state2.viewStateGenerator,
    __EVENTVALIDATION: state2.eventValidation,
    "ctl00$MainContent$ddlStatus": "M",
  });

  const res3 = await withRetry(() =>
    rateLimitedFetch(PORTAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: body3.toString(),
      redirect: "manual",
    })
  );
  cookies = mergeCookies(cookies, res3);

  const location = res3.headers.get("location");
  if (!location) throw new Error(`Expected redirect to download URL, got ${res3.status}`);

  return { url: new URL(location, CSLB_BASE).toString(), cookies };
}

// ── Parse the Master License CSV ────────────────────────────────────────────────

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseMasterCsv(csvText: string): RawRecord[] {
  const rows = parseCSV(csvText);
  const records: RawRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    // Active filter: CLEAR status AND not yet expired
    if ((row["primarystatus"] ?? "").trim().toUpperCase() !== "CLEAR") continue;

    const expiration = parseDate(row["expirationdate"]);
    if (!expiration || expiration < today) continue;

    const licenseNumber = row["licenseno"]?.trim();
    const businessName = row["fullbusinessname"]?.trim() || row["businessname"]?.trim();
    if (!licenseNumber || !businessName) continue;

    records.push({
      businessName,
      licenseNumber,
      licenseType: row["classifications(s)"]?.trim() || undefined,
      city: row["city"]?.trim() || undefined,
      state: "CA",
      phone: row["businessphone"] ? cleanPhone(row["businessphone"]) : undefined,
      rawData: {
        county: row["county"] ?? "",
        zip_code: row["zipcode"] ?? "",
        mailing_address: row["mailingaddress"] ?? "",
        business_type: row["businesstype"] ?? "",
        issue_date: row["issuedate"] ?? "",
        expiration_date: row["expirationdate"] ?? "",
        primary_status: row["primarystatus"] ?? "",
        secondary_status: row["secondarystatus"] ?? "",
        asbestos_reg: row["asbestosreg"] ?? "",
      },
    });
  }

  return records;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt (none present -> fails open)
  const allowed = await isScrapingAllowed(CSLB_BASE, "/onlineservices/dataportal/ContractorList");
  if (!allowed) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: "robots.txt disallows /onlineservices/dataportal/ContractorList — use CSV upload fallback for California.",
    };
  }

  // 2. Walk the postback dance to get the Master License CSV URL
  let downloadUrl: string;
  let cookies: string;
  try {
    const result = await getCsvDownloadUrl();
    downloadUrl = result.url;
    cookies = result.cookies;
  } catch (err) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 1,
      error: `Could not reach CSLB Master License download link: ${err instanceof Error ? err.message : String(err)} — use CSV upload fallback for California.`,
    };
  }

  await delay(2000);

  // 3. Download the CSV (~75MB, ~243K rows)
  let csvText: string;
  try {
    const res = await withRetry(() =>
      rateLimitedFetch(downloadUrl, { headers: { Cookie: cookies } }, 0),
      2
    );
    if (!res.ok) {
      return {
        records: [], robotsBlocked: false, pagesScraped: 2,
        error: `CSLB Master License file download returned ${res.status} ${res.statusText} — use CSV upload fallback for California.`,
      };
    }
    csvText = await res.text();
  } catch (err) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 2,
      error: `Failed downloading CSLB Master License file: ${err instanceof Error ? err.message : String(err)} — use CSV upload fallback for California.`,
    };
  }

  // 4. Parse and filter to active (CLEAR + unexpired) licenses
  const records = parseMasterCsv(csvText);

  return { records, robotsBlocked: false, pagesScraped: 3 };
}

export const CaliforniaScraper: StateScraperModule = {
  state: "CA",
  displayName: "California",
  registryUrl: PORTAL_URL,
  scrape,
};
