// Pennsylvania Licensing System (PALS) — PA Dept. of State, Bureau of
// Professional and Occupational Affairs
// Target: https://www.pals.pa.gov
//
// PALS is an Angular single-page app ("BPOA Portal", `data-ng-app="bpoaApp"`)
// served entirely client-side. Its main bundle (js/app.js) loads
// `vendor/recaptcha/api_v3.js?render=explicit` on initial page load and
// renders a reCAPTCHA challenge before the license-verification search can
// be submitted — the same "JS SPA + reCAPTCHA-gated API" pattern as
// Tennessee (lib/scraper/tennessee.ts). There is no server-rendered HTML
// result table and no documented bulk data export.
//
// Rate limit: 1 request per 2 seconds (n/a — we make a single probe request)
// robots.txt: www.pals.pa.gov/robots.txt returns 404 (none present), which
// fails open / "allowed" — the block is the reCAPTCHA gate, not robots.txt.
//
// CSV fallback: PA contractor/trade license data must be sourced manually
// (e.g. an open-records (Right-to-Know) request to the PA Dept. of State,
// Bureau of Professional and Occupational Affairs) and uploaded via the CSV
// importer. CSV template: business_name, license_type, license_number, city,
//   state, phone, email, license_status

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const PA_BASE = "https://www.pals.pa.gov";

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt (none present -> fails open)
  await isScrapingAllowed(PA_BASE, "/");

  // 2. Probe the portal
  try {
    const res = await withRetry(() => rateLimitedFetch(`${PA_BASE}/`, { method: "GET" }), 2);

    if (!res.ok) {
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 0,
        error: `www.pals.pa.gov returned ${res.status} ${res.statusText} — use CSV upload fallback for Pennsylvania.`,
      };
    }

    const body = await res.text();
    const isAngularSpa = /data-ng-app="bpoaApp"/i.test(body);
    const hasRecaptcha = /recaptcha/i.test(body);

    if (isAngularSpa && hasRecaptcha) {
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 1,
        error:
          "www.pals.pa.gov is an Angular SPA (bpoaApp) that loads reCAPTCHA v3 " +
          "(explicit render) on initial page load and gates license-verification " +
          "search behind it. No server-rendered result table or bulk export is " +
          "available, and we will not attempt to bypass reCAPTCHA. Use CSV upload " +
          "fallback for Pennsylvania.",
      };
    }
  } catch (err) {
    return {
      records: [],
      robotsBlocked: true,
      pagesScraped: 0,
      error:
        `Could not reach www.pals.pa.gov: ${err instanceof Error ? err.message : String(err)} — ` +
        `use CSV upload fallback for Pennsylvania.`,
    };
  }

  return {
    records: [],
    robotsBlocked: false,
    pagesScraped: 1,
    error:
      "www.pals.pa.gov reachable but no scraper implemented for its search API yet. " +
      "Use CSV upload fallback for Pennsylvania.",
  };
}

export const PennsylvaniaScraper: StateScraperModule = {
  state: "PA",
  displayName: "Pennsylvania",
  registryUrl: "https://www.pals.pa.gov/#/Verification/SearchLicense",
  scrape,
};
