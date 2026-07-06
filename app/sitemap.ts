import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

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
  "/policy/terms-of-service",
  "/policy/privacy-policy",
  "/policy/documents",
  "/policy/web-scan",
  "/terms-of-use",
  "/privacy-policy",
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

  return [...staticEntries, ...profileEntries];
}
