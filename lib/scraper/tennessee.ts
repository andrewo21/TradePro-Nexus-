// Tennessee Board for Licensing Contractors (TN Dept. of Commerce & Insurance)
// Target: https://www.tn.gov/commerce/regboards/contractors.html
//
// License verification redirects to verify.tn.gov -> search.cloud.commerce.tn.gov,
// a Tyler Technologies "Forge"/Entellitrak Next.js single-page app. The search UI
// is entirely client-rendered and its backing API
// (https://access.cloud.commerce.tn.gov/entellitrak/api/endpoints/v1) requires an
// auth token (/api/auth/token) and reCAPTCHA verification (/api/recaptcha/verify)
// before any query can be made. There is no static HTML result set or bulk data
// export to scrape, and we will not attempt to bypass reCAPTCHA / auth gating.
//
// Rate limit: 1 request per 2 seconds (n/a — we make a single probe request)
// robots.txt: checked first (search.cloud.commerce.tn.gov has no robots.txt,
// which fails open / "allowed" — the block is the JS+CAPTCHA gate, not robots.txt).
//
// CSV fallback: Tennessee contractor license data must be sourced manually
// (e.g. an open-records request to the TN Board for Licensing Contractors) and
// uploaded via the CSV importer. CSV template: business_name, license_type,
//   license_number, city, state, phone, email, license_status

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const TN_BASE = "https://search.cloud.commerce.tn.gov";
const SEARCH_URL = `${TN_BASE}/`;

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt (search.cloud.commerce.tn.gov has none -> fails open)
  await isScrapingAllowed(TN_BASE, "/");

  // 2. Probe the public search portal
  try {
    const res = await withRetry(() => rateLimitedFetch(SEARCH_URL, { method: "GET" }), 2);

    if (!res.ok) {
      return {
        records: [], robotsBlocked: true, pagesScraped: 0,
        error: `search.cloud.commerce.tn.gov returned ${res.status} ${res.statusText} — ` +
               `use CSV upload fallback for Tennessee.`,
      };
    }
  } catch (err) {
    return {
      records: [], robotsBlocked: true, pagesScraped: 0,
      error: `Could not reach search.cloud.commerce.tn.gov: ${err instanceof Error ? err.message : String(err)} — ` +
             `use CSV upload fallback for Tennessee.`,
    };
  }

  // The portal is a Next.js SPA — no server-rendered license data is present in
  // the HTML, and its backing API requires reCAPTCHA + an auth token. We do not
  // attempt to solve CAPTCHAs or use undocumented authenticated endpoints.
  return {
    records: [], robotsBlocked: true, pagesScraped: 1,
    error: "search.cloud.commerce.tn.gov is a JS-rendered SPA backed by a " +
           "reCAPTCHA + auth-gated API (entellitrak/api/endpoints/v1). No static " +
           "or bulk data export is available. Use CSV upload fallback for " +
           "Tennessee — source contractor license data via an open-records " +
           "request to the TN Board for Licensing Contractors.",
  };
}

export const TennesseeScraper: StateScraperModule = {
  state: "TN",
  displayName: "Tennessee",
  registryUrl: "https://www.tn.gov/commerce/regboards/contractors.html",
  scrape,
};
