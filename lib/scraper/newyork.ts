// New York Department of State — Division of Licensing Services
// Target: https://www.license.ny.gov/public/licquery.htm (per ROADMAP)
//
// `license.ny.gov` no longer resolves to a working host (connection times
// out entirely — DNS still points at an old IP, but nothing answers on 443).
// The live system has moved to https://appext20.dos.ny.gov/lcns_public/ —
// the search index page (chk_load) and search forms (bus_name_search_frm,
// lic_name_search_frm, id_search_frm) all render fine and list license
// types relevant to TradePro Nexus (notably "Home Inspection" — code HIN —
// which maps to our Inspector profile type).
//
// However, every search-submission endpoint we tried —
//   lcns_public/bus_name_search_cursor_new
//   lcns_public/lic_name_search_cursor_new
//   lcns_public/lcns_query.id_search_cursor
//   lcns_public/lcns_query.bus_name_search_cursor_new
// — returns HTTP 404 "NYS Department of State - page unavailable", an
// auto-redirect-to-homepage page that also references a "transitioned to a
// new UCC system... old systems have been shut down" notice. The search
// *forms* are static remnants still served (likely from cache/CDN); the
// query backend itself appears decommissioned. There is no working search
// to scrape and no bulk data export for these license types (Open Data NY
// only covers Real Estate, Notary, Appraiser, and Appearance Enhancement —
// none of which are construction-trade related).
//
// Rate limit: 1 request per 2 seconds (n/a — single probe request)
// robots.txt: dos.ny.gov/robots.txt is reachable and does not disallow
// /lcns_public/ — the block is the decommissioned query backend, not robots.txt.
//
// CSV fallback: NY contractor/home-inspector license data must be sourced
// manually (e.g. an open-records request to the NY Dept of State, Division
// of Licensing Services) and uploaded via the CSV importer. CSV template:
// business_name, license_type, license_number, city, state, phone, email,
//   license_status

import type { StateScraperModule, ScraperResult } from "./types";
import { isScrapingAllowed, rateLimitedFetch, withRetry } from "./utils";

const NY_BASE = "https://appext20.dos.ny.gov";
const SEARCH_PROBE_URL = `${NY_BASE}/lcns_public/lcns_query.id_search_cursor`;

async function scrape(_importId: string): Promise<ScraperResult> {
  // 1. Check robots.txt for the licensing search path
  await isScrapingAllowed("https://dos.ny.gov", "/lcns_public/");

  // 2. Probe a search-submission endpoint
  try {
    const res = await withRetry(
      () =>
        rateLimitedFetch(SEARCH_PROBE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "p_id_no=&p_lic_code=HIN",
        }),
      2
    );

    const body = await res.text();
    const decommissioned = res.status === 404 && /page unavailable/i.test(body);

    if (!res.ok || decommissioned) {
      return {
        records: [],
        robotsBlocked: true,
        pagesScraped: 1,
        error:
          `appext20.dos.ny.gov/lcns_public search backend returned ${res.status} ` +
          `${res.statusText}${decommissioned ? " (\"page unavailable\" — system decommissioned)" : ""} — ` +
          `the legacy ASP search endpoints no longer work, even though the search ` +
          `form pages still render. Use CSV upload fallback for New York.`,
      };
    }
  } catch (err) {
    return {
      records: [],
      robotsBlocked: true,
      pagesScraped: 0,
      error:
        `Could not reach appext20.dos.ny.gov: ${err instanceof Error ? err.message : String(err)} — ` +
        `use CSV upload fallback for New York.`,
    };
  }

  // If the search backend is ever restored, scraping logic for the
  // lcns_public Home Inspection (HIN) and Alarm Installer (IN%) registries
  // would go here, following the florida.ts table-parsing pattern.
  return {
    records: [],
    robotsBlocked: false,
    pagesScraped: 1,
    error:
      "appext20.dos.ny.gov/lcns_public search backend reachable but no scraper " +
      "implemented for its result table yet. Use CSV upload fallback for New York.",
  };
}

export const NewYorkScraper: StateScraperModule = {
  state: "NY",
  displayName: "New York",
  registryUrl: "https://appext20.dos.ny.gov/lcns_public/chk_load",
  scrape,
};
