// Ohio eLicense Center — OCILB Roster Download
// Target: https://elicense4.com.ohio.gov/Lookup/GenerateRoster.aspx
//
// Session 3 marked elicense.ohio.gov as blocked because /OH_VerifyLicense
// (the individual license-search form) embeds a Google reCAPTCHA. However,
// the eLicense Center's "Roster Download" tool — on a different host,
// elicense4.com.ohio.gov — is a separate, public bulk-export feature with no
// CAPTCHA and no login.
//
// Postback dance:
//   1. GET /Lookup/GenerateRoster.aspx — capture __VIEWSTATE +
//      __VIEWSTATEGENERATOR + session cookies. The page lists one checkbox
//      per licensing board; ckbRoster0 = "OCLIB (No Fee Required)" =
//      Ohio Construction Industry Licensing Board (Electrical, HVAC,
//      Hydronics, Plumbing, Refrigeration, Tradesman).
//   2. POST ckbRoster0=on + btnRosterContinue=Continue — 302 redirect to
//      /Lookup/DownloadRoster.aspx.
//   3. GET DownloadRoster.aspx — lists the generated OCILB roster file
//      (~12,622 records) with a dynamic job ID, e.g. RosterIdnt="187050".
//   4. GET /Lookup/FileDownload.aspx?Idnt={RosterIdnt}&Type=Comma (same
//      session cookies) — returns the CSV directly. Discovered via
//      Lookup.js's OpenFileDownloadWindow, which does
//      window.open("FileDownload.aspx?Idnt=" + idnt + "&Type=" + format).
//
// Note: this site does not use ASP.NET event validation
// (__EVENTVALIDATION is absent on every page in this flow).
//
// CSV schema: FormattedCredential, Name, LastName, Type, Status, State,
// County, Effective Date, Expiration Date, Company, Company Address,
// Company Address 2, Company City, Company State, Company Zip, Company
// Phone, Company Fax, Company Email (+ trailing empty column).
// Type codes: EL (Electrical), HV (HVAC), PL (Plumbing), HY (Hydronics),
// RE (Refrigeration), TA (Tradesman).
//
// Active filter: Status is "ACTIVE" or "ACTIVE IN RENEWAL" (both currently
// licensed to operate) AND Expiration Date >= today.
//
// Rate limit: 1 request per 2 seconds between postback steps.
// robots.txt: elicense4.com.ohio.gov/robots.txt returns 404 -> fails open
// (allowed).

import * as cheerio from "cheerio";
import type { StateScraperModule, ScraperResult, RawRecord } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry, delay, cleanPhone, parseCSV } from "./utils";

const OH_BASE = "https://elicense4.com.ohio.gov";
const ROSTER_URL = `${OH_BASE}/Lookup/GenerateRoster.aspx`;
const DOWNLOAD_URL = `${OH_BASE}/Lookup/DownloadRoster.aspx`;

const TYPE_NAMES: Record<string, string> = {
  EL: "Electrical Contractor",
  HV: "HVAC Contractor",
  PL: "Plumbing Contractor",
  HY: "Hydronics Contractor",
  RE: "Refrigeration Contractor",
  TA: "Tradesman",
};

interface AspNetState {
  viewState: string;
  viewStateGenerator: string;
  cookies: string;
}

function extractAspState(html: string, cookies: string): AspNetState {
  const $ = cheerio.load(html);
  return {
    viewState: ($('input[name="__VIEWSTATE"]').val() as string) ?? "",
    viewStateGenerator: ($('input[name="__VIEWSTATEGENERATOR"]').val() as string) ?? "",
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

// Find the dynamic OCILB roster job ID (RosterIdnt) on DownloadRoster.aspx.
// Lookup.js's OpenFileDownloadWindow does:
//   window.open("FileDownload.aspx?Idnt=" + idnt + "&Type=" + format, ...)
// — a plain GET, not a form POST.
function findRosterIdnt(html: string): string | null {
  const m = html.match(/RosterIdnt="(\d+)"/);
  return m ? m[1] : null;
}

// ── Postback dance: GenerateRoster.aspx -> DownloadRoster.aspx -> CSV ──────────

async function getRosterCsv(): Promise<string> {
  // Step 1: initial GET
  const res1 = await withRetry(() => rateLimitedFetch(ROSTER_URL, { method: "GET" }));
  if (!res1.ok) throw new Error(`Initial GET failed: ${res1.status} ${res1.statusText}`);
  const html1 = await res1.text();
  let cookies = mergeCookies("", res1);
  const state1 = extractAspState(html1, cookies);

  if (!state1.viewState) {
    throw new Error("GenerateRoster.aspx did not return __VIEWSTATE — page layout may have changed.");
  }

  await delay(2000);

  // Step 2: check "OCLIB" (ckbRoster0) and continue -> redirects to DownloadRoster.aspx
  const body2 = new URLSearchParams({
    __EVENTTARGET: "",
    __EVENTARGUMENT: "",
    __VIEWSTATE: state1.viewState,
    __VIEWSTATEGENERATOR: state1.viewStateGenerator,
    __VIEWSTATEENCRYPTED: "",
    "ctl00$MainContentPlaceHolder$ckbRoster0": "on",
    "ctl00$MainContentPlaceHolder$btnRosterContinue": "Continue",
  });

  const res2 = await withRetry(() =>
    rateLimitedFetch(ROSTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: body2.toString(),
      redirect: "manual",
    })
  );
  cookies = mergeCookies(cookies, res2);

  let html3: string;
  if (res2.status >= 300 && res2.status < 400 && res2.headers.get("location")) {
    await delay(2000);
    const res3 = await withRetry(() =>
      rateLimitedFetch(new URL(res2.headers.get("location")!, OH_BASE).toString(), {
        method: "GET",
        headers: { Cookie: cookies },
      })
    );
    if (!res3.ok) throw new Error(`DownloadRoster.aspx GET failed: ${res3.status} ${res3.statusText}`);
    html3 = await res3.text();
    cookies = mergeCookies(cookies, res3);
  } else if (res2.ok) {
    html3 = await res2.text();
  } else {
    throw new Error(`Roster generation postback failed: ${res2.status} ${res2.statusText}`);
  }

  const state3 = extractAspState(html3, cookies);
  if (!state3.viewState) {
    throw new Error("DownloadRoster.aspx did not return __VIEWSTATE — page layout may have changed.");
  }

  const idnt = findRosterIdnt(html3);
  if (!idnt) {
    throw new Error("Could not find OCILB roster job ID (RosterIdnt) on DownloadRoster.aspx.");
  }

  await delay(2000);

  // Step 4: GET the generated roster file directly
  const fileUrl = `${OH_BASE}/Lookup/FileDownload.aspx?Idnt=${idnt}&Type=Comma`;
  const res4 = await withRetry(() =>
    rateLimitedFetch(fileUrl, {
      method: "GET",
      headers: { Cookie: cookies },
    }, 0),
    2
  );
  if (!res4.ok) throw new Error(`Roster CSV download failed: ${res4.status} ${res4.statusText}`);

  const csvText = await res4.text();
  if (!/^FormattedCredential,/.test(csvText)) {
    throw new Error("Roster download did not return the expected OCILB CSV — page layout may have changed.");
  }
  return csvText;
}

// ── Parse the OCILB roster CSV ──────────────────────────────────────────────────

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseRosterCsv(csvText: string): RawRecord[] {
  const rows = parseCSV(csvText);
  const records: RawRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const status = (row["status"] ?? "").trim().toUpperCase();
    if (status !== "ACTIVE" && status !== "ACTIVE IN RENEWAL") continue;

    const expiration = parseDate(row["expiration_date"]);
    if (!expiration || expiration < today) continue;

    const licenseNumber = row["formattedcredential"]?.trim();
    if (!licenseNumber) continue;

    const businessName = row["company"]?.trim() || row["name"]?.trim();
    if (!businessName) continue;

    const typeCode = (row["type"] ?? "").trim().toUpperCase();
    const phone = row["company_phone"]?.trim();
    const email = row["company_email"]?.trim();

    records.push({
      businessName,
      licenseNumber,
      licenseType: TYPE_NAMES[typeCode] ?? (typeCode || undefined),
      city: row["company_city"]?.trim() || undefined,
      state: "OH",
      phone: phone ? cleanPhone(phone) : undefined,
      email: email || undefined,
      rawData: {
        name: row["name"] ?? "",
        last_name: row["lastname"] ?? "",
        type: typeCode,
        county: row["county"] ?? "",
        effective_date: row["effective_date"] ?? "",
        expiration_date: row["expiration_date"] ?? "",
        company_address: row["company_address"] ?? "",
        company_address_2: row["company_address_2"] ?? "",
        company_state: row["company_state"] ?? "",
        company_zip: row["company_zip"] ?? "",
        company_fax: row["company_fax"] ?? "",
        status,
      },
    });
  }

  return records;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt (404 -> fails open)
  await isScrapingAllowed(OH_BASE, "/Lookup/GenerateRoster.aspx");

  // 2. Walk the roster-download postback dance
  let csvText: string;
  try {
    csvText = await getRosterCsv();
  } catch (err) {
    return {
      records: [], robotsBlocked: false, pagesScraped: 1,
      error: `Could not download OCILB roster from elicense4.com.ohio.gov: ${err instanceof Error ? err.message : String(err)} — use CSV upload fallback for Ohio.`,
    };
  }

  // 3. Parse and filter to active (ACTIVE / ACTIVE IN RENEWAL + unexpired) licenses
  const records = parseRosterCsv(csvText);

  return { records, robotsBlocked: false, pagesScraped: 4 };
}

export const OhioScraper: StateScraperModule = {
  state: "OH",
  displayName: "Ohio",
  registryUrl: ROSTER_URL,
  scrape,
};
