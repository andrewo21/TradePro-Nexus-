// Illinois Dept. of Financial and Professional Regulation (IDFPR)
// Target: https://idfpr.illinois.gov
//
// idfpr.illinois.gov/robots.txt explicitly allows everything ("Allow: /"),
// but the site itself does not host a search form — license lookup is
// hosted on a separate Micropact/Entellitrak portal at
// https://online-dfpr.micropact.com/Lookup/LicenseLookup.aspx. That page
// has dropdowns relevant to us (License Type includes "ROOFING CONTRACTOR";
// States/County filters), but the search form is protected by a custom
// "FormShield" CAPTCHA (image + audio challenge, #FormShield1_Image /
// #FormShield1_SoundPlayer / txtCAPTCHA input) that must be solved before
// submission — we will not attempt to bypass it.
//
// idfpr.illinois.gov itself only publishes a monthly "Active License Report"
// as PDF (/dpr/active-license-report.html), not CSV/structured data, so it
// can't be used as a bulk-data fallback for our importer.
//
// Rate limit: 1 request per 2 seconds (n/a — single probe request)
// robots.txt: allows everything; the block is the FormShield CAPTCHA on the
// Micropact lookup portal, not robots.txt.
//
// CSV fallback: Illinois contractor license data (e.g. Roofing Contractors)
// must be sourced manually (e.g. a FOIA request to IDFPR) and uploaded via
// the CSV importer. CSV template: business_name, license_type,
//   license_number, city, state, phone, email, license_status

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const IL_LOOKUP_BASE = "https://online-dfpr.micropact.com";
const LOOKUP_URL = `${IL_LOOKUP_BASE}/Lookup/LicenseLookup.aspx`;

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt for the lookup portal
  await isScrapingAllowed(IL_LOOKUP_BASE, "/Lookup/LicenseLookup.aspx");

  // 2. Probe the license lookup page
  try {
    const res = await withRetry(() => rateLimitedFetch(LOOKUP_URL, { method: "GET" }), 2);

    if (!res.ok) {
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 0,
        error: `online-dfpr.micropact.com returned ${res.status} ${res.statusText} — use CSV upload fallback for Illinois.`,
      };
    }

    const body = await res.text();
    const hasFormShield = /FormShield/i.test(body) && /CAPTCHA/i.test(body);

    if (hasFormShield) {
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 1,
        error:
          "online-dfpr.micropact.com/Lookup/LicenseLookup.aspx requires solving a " +
          "FormShield CAPTCHA (image + audio challenge) before the search form can " +
          "be submitted. idfpr.illinois.gov itself only publishes a monthly Active " +
          "License Report as PDF, not CSV/structured data. We will not bypass the " +
          "CAPTCHA. Use CSV upload fallback for Illinois.",
      };
    }
  } catch (err) {
    return {
      records: [],
      robotsBlocked: true,
      pagesScraped: 0,
      error:
        `Could not reach online-dfpr.micropact.com: ${err instanceof Error ? err.message : String(err)} — ` +
        `use CSV upload fallback for Illinois.`,
    };
  }

  return {
    records: [],
    robotsBlocked: false,
    pagesScraped: 1,
    error:
      "online-dfpr.micropact.com/Lookup/LicenseLookup.aspx reachable but no scraper " +
      "implemented for its search results yet. Use CSV upload fallback for Illinois.",
  };
}

export const IllinoisScraper: StateScraperModule = {
  state: "IL",
  displayName: "Illinois",
  registryUrl: LOOKUP_URL,
  scrape,
};
