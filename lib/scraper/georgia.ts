// Georgia Secretary of State — Professional Licensing Boards
// Target: https://sos.ga.gov/index.php/licensing (contractor licenses are
// issued by the State Licensing Board for Residential and General
// Contractors, verified via https://verify.sos.ga.gov)
//
// The entire sos.ga.gov domain sits behind a WAF/bot-protection layer that
// returns 403 Forbidden to automated requests — including requests for
// robots.txt itself. We cannot scrape this site.
//
// Rate limit: 1 request per 2 seconds (n/a — we make a single probe request)
// robots.txt: checked first, but the WAF blocks the request before robots.txt
// rules can even be evaluated.
//
// CSV fallback: Georgia contractor license data must be sourced manually
// (e.g. an open-records request to the GA Secretary of State / SLB for
// Residential and General Contractors) and uploaded via the CSV importer.
// CSV template: business_name, license_type, license_number, city, state,
//   phone, email, license_status

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const GA_BASE = "https://sos.ga.gov";
const LICENSING_URL = `${GA_BASE}/index.php/licensing`;

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt — sos.ga.gov returns 403 even for robots.txt, so
  //    isScrapingAllowed() fails open (allowed) here. The real block happens
  //    on the next step.
  await isScrapingAllowed(GA_BASE, "/index.php/licensing");

  // 2. Probe the licensing page itself.
  try {
    const res = await withRetry(() => rateLimitedFetch(LICENSING_URL, { method: "GET" }), 2);

    if (!res.ok) {
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 0,
        error: `sos.ga.gov returned ${res.status} ${res.statusText} — site blocks automated ` +
               `requests (WAF/bot protection). Use CSV upload fallback for Georgia.`,
      };
    }
  } catch (err) {
    return {
      records: [],
      robotsBlocked: true,
      pagesScraped: 0,
      error: `Could not reach sos.ga.gov: ${err instanceof Error ? err.message : String(err)} — ` +
             `use CSV upload fallback for Georgia.`,
    };
  }

  // If the site is ever reachable in the future, scraping logic for the
  // GA SLB for Residential and General Contractors search would go here,
  // following the same pattern as florida.ts (cheerio table parsing,
  // active-license filtering, pagination with rate limiting).
  return {
    records: [],
    robotsBlocked: false,
    pagesScraped: 1,
    error: "sos.ga.gov licensing page reachable but no scraper implemented for its search form yet. " +
           "Use CSV upload fallback for Georgia.",
  };
}

export const GeorgiaScraper: StateScraperModule = {
  state: "GA",
  displayName: "Georgia",
  registryUrl: LICENSING_URL,
  scrape,
};
