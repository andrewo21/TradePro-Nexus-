// Arizona Registrar of Contractors (ROC)
// Target: https://roc.az.gov
//
// roc.az.gov sits entirely behind a Cloudflare WAF challenge — every request,
// including robots.txt itself, returns HTTP 403 with `cf-mitigated: challenge`
// (interactive JS challenge page). Same pattern as Georgia (Session 2): the
// block happens before any page content or robots rules are reachable.
//
// The actual contractor license search lives on a separate Salesforce
// Experience Cloud (LWC) community: https://azroc.my.site.com/AZRoc/s/.
// robots.txt there allows everything (default sfdc community robots.txt),
// but the site is a client-side-rendered Lightning SPA — curl/fetch only
// returns an empty shell + login redirect, no server-rendered search form or
// results table. Its Content-Security-Policy also whitelists
// google.com/recaptcha and gstatic.com/recaptcha, indicating any public
// search form is reCAPTCHA-gated — same pattern as Ohio's elicense.ohio.gov
// (Session 3).
//
// Net result: no path to a server-rendered, non-CAPTCHA license search or
// bulk export. CSV upload fallback required.
//
// Rate limit: 1 request per 2 seconds (n/a — single probe request).

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const AZ_ROC_BASE = "https://roc.az.gov";
const AZ_PORTAL_BASE = "https://azroc.my.site.com";
const PORTAL_SEARCH_URL = `${AZ_PORTAL_BASE}/AZRoc/s/contractor-search`;

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt on roc.az.gov — Cloudflare WAF returns 403 even for
  //    robots.txt itself, so isScrapingAllowed() fails open here. The real
  //    block is confirmed by probing the site directly below.
  await isScrapingAllowed(AZ_ROC_BASE, "/");

  try {
    const res = await withRetry(() => rateLimitedFetch(AZ_ROC_BASE, { method: "GET" }), 2);

    if (!res.ok) {
      const cfMitigated = res.headers.get("cf-mitigated");
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 0,
        error:
          `roc.az.gov returned ${res.status} ${res.statusText}` +
          (cfMitigated ? ` (cf-mitigated: ${cfMitigated})` : "") +
          ` — entire domain sits behind a Cloudflare WAF challenge, same as ` +
          `Georgia (Session 2). The license-search backend at ` +
          `${PORTAL_SEARCH_URL} is a Salesforce Experience Cloud Lightning ` +
          `SPA whose CSP whitelists Google reCAPTCHA — no server-rendered ` +
          `search or bulk export is reachable. Use CSV upload fallback for Arizona.`,
      };
    }
  } catch (err) {
    return {
      records: [],
      robotsBlocked: true,
      pagesScraped: 0,
      error:
        `Could not reach roc.az.gov: ${err instanceof Error ? err.message : String(err)} — ` +
        `use CSV upload fallback for Arizona.`,
    };
  }

  // If roc.az.gov is ever reachable in the future, scraping logic targeting
  // azroc.my.site.com's contractor search (and its reCAPTCHA gate) would need
  // to be revisited — likely still requires CAPTCHA-bypass, which we will not do.
  return {
    records: [],
    robotsBlocked: false,
    pagesScraped: 1,
    error:
      "roc.az.gov reachable but no scraper implemented — license search lives on " +
      `${PORTAL_SEARCH_URL}, a Salesforce LWC SPA gated by reCAPTCHA. ` +
      "Use CSV upload fallback for Arizona.",
  };
}

export const ArizonaScraper: StateScraperModule = {
  state: "AZ",
  displayName: "Arizona",
  registryUrl: AZ_ROC_BASE,
  scrape,
};
