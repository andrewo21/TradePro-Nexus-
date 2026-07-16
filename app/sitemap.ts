import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { CITY_TRADE_PAGES, STATE_ONLY_PAGES } from "@/lib/seoContractorPages";

export const revalidate = 3600;

const BASE_URL = "https://www.tradepronexus.com";

const STATIC_PATHS = [
  "/",
  "/search",
  "/work",
  "/advertise",
  "/pricing",
  "/join",
  "/build",
  "/verify",
  "/post-job",
  "/delete-account",
  "/resources",
  "/resources/how-to-find-a-licensed-contractor-in-florida",
  "/resources/how-to-find-a-licensed-contractor-in-north-carolina",
  "/resources/how-to-find-a-licensed-contractor-in-virginia",
  "/resources/how-to-verify-a-contractor-license",
  "/resources/what-is-a-davis-bacon-wage-determination",
  "/resources/what-is-a-prevailing-wage-project",
  "/resources/how-to-hire-a-subcontractor",
  "/resources/general-contractor-vs-subcontractor",
  "/policy/how-it-works",
  "/policy/verification",
  "/policy/no-grades",
  "/policy/supply-house",
  "/policy/disclaimer",
  "/policy/documents",
  "/policy/web-scan",
  "/terms-of-use",
  "/privacy-policy",
  "/membership-agreement",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data: profiles } = await db
    .from("profiles")
    .select("slug, updated_at")
    .not("slug", "is", null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileEntries: MetadataRoute.Sitemap = (profiles ?? []).map((p: any) => ({
    url: `${BASE_URL}/pro/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const contractorCityTradeEntries: MetadataRoute.Sitemap = CITY_TRADE_PAGES.map((p) => ({
    url: `${BASE_URL}/contractors/${p.stateSlug}/${p.citySlug}/${p.tradeSlug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const contractorStateEntries: MetadataRoute.Sitemap = STATE_ONLY_PAGES.map((p) => ({
    url: `${BASE_URL}/contractors/${p.stateSlug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...profileEntries, ...contractorCityTradeEntries, ...contractorStateEntries];
}
