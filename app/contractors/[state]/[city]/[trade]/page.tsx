import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Search as SearchIcon, Clock, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  CITY_TRADE_PAGES,
  buildLicenseTypeOr,
  relatedCityTradePages,
  sameTradeOtherStates,
  type CityTradePage,
} from "@/lib/seoContractorPages";

export const revalidate = 3600;

function findPage(state: string, city: string, trade: string): CityTradePage | undefined {
  return CITY_TRADE_PAGES.find(
    (p) => p.stateSlug === state && p.citySlug === city && p.tradeSlug === trade
  );
}

export function generateStaticParams() {
  return CITY_TRADE_PAGES.map((p) => ({
    state: p.stateSlug,
    city: p.citySlug,
    trade: p.tradeSlug,
  }));
}

type Params = { state: string; city: string; trade: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { state, city, trade } = await params;
  const page = findPage(state, city, trade);
  if (!page) return {};

  const { count } = await getCount(page);
  const title = `Licensed ${page.tradeLabel} in ${page.cityName}, ${page.stateAbbr}`;
  const description =
    `Find licensed ${page.tradeLabel.toLowerCase()} in ${page.cityName}, ${page.stateAbbr}. ` +
    `Browse ${count.toLocaleString()} contractors cross-referenced against official state licensing boards. Free to search.`;

  return {
    title,
    description,
    alternates: { canonical: `https://www.tradepronexus.com/contractors/${state}/${city}/${trade}` },
  };
}

async function getCount(page: CityTradePage): Promise<{ count: number; scope: "city" | "state" }> {
  const db = getSupabaseAdmin() as any;
  const orPattern = buildLicenseTypeOr(page.licensePatterns);

  let cityQuery = db
    .from("unclaimed_profiles")
    .select("*", { count: "exact", head: true })
    .eq("visible", true)
    .eq("claimed", false)
    .eq("remove_requested", false)
    .eq("source_state", page.stateAbbr)
    .ilike("city", `%${page.cityName}%`);
  if (orPattern) cityQuery = cityQuery.or(orPattern);
  const { count: cityCount } = await cityQuery;

  if ((cityCount ?? 0) >= 10) {
    return { count: cityCount ?? 0, scope: "city" };
  }

  let stateQuery = db
    .from("unclaimed_profiles")
    .select("*", { count: "exact", head: true })
    .eq("visible", true)
    .eq("claimed", false)
    .eq("remove_requested", false)
    .eq("source_state", page.stateAbbr);
  if (orPattern) stateQuery = stateQuery.or(orPattern);
  const { count: stateCount } = await stateQuery;

  return { count: stateCount ?? 0, scope: "state" };
}

// Core-state count changes only when an admin manually flags a new state
// is_core_state=true (see ROADMAP.md) -- not worth a full-table scan on
// every request just to recompute a number that moves a few times a year.
// Matches the homepage's own "16 States" figure, verified live as of this
// deploy; update alongside it if that ever changes.
const CORE_STATE_COUNT = 16;

async function getDirectoryTotal(): Promise<number> {
  const db = getSupabaseAdmin() as any;
  const { count } = await db
    .from("unclaimed_profiles")
    .select("*", { count: "exact", head: true })
    .eq("visible", true)
    .eq("is_core_state", true);
  return count ?? 0;
}

export default async function ContractorCityTradePage({ params }: { params: Promise<Params> }) {
  const { state, city, trade } = await params;
  const page = findPage(state, city, trade);
  if (!page) notFound();

  const [{ count, scope }, directoryTotal] = await Promise.all([
    getCount(page),
    getDirectoryTotal(),
  ]);

  const locationLabel = scope === "city" ? `${page.cityName}, ${page.stateAbbr}` : page.stateName;
  const searchHref = `/search?state=${page.stateAbbr}&county=${encodeURIComponent(page.cityName)}&trade=${encodeURIComponent(page.searchTradeParam)}`;
  const related = relatedCityTradePages(page);
  const sameTrade = sameTradeOtherStates(page);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `TradePro Nexus — ${page.tradeLabel} in ${page.cityName}, ${page.stateAbbr}`,
    description: `Directory of licensed ${page.tradeLabel.toLowerCase()} in ${page.cityName}, ${page.stateAbbr}, cross-referenced against official state licensing boards.`,
    url: `https://www.tradepronexus.com/contractors/${state}/${city}/${trade}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: page.cityName,
      addressRegion: page.stateAbbr,
      addressCountry: "US",
    },
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Directory</p>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
          Licensed {page.tradeLabel} in {page.cityName}, {page.stateAbbr}
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed mb-8">
          TradePro Nexus lists {count.toLocaleString()} licensed {page.tradeLabel.toLowerCase()} in {locationLabel}.
          Every listing is cross-referenced against official state licensing board records.
          Search free and connect with licensed trade professionals in your area.
        </p>

        {/* Search widget */}
        <Link
          href={searchHref}
          className="flex items-center justify-between gap-3 bg-slate-800/60 border border-slate-700/60 hover:border-orange-600/60 rounded-2xl px-5 py-4 mb-8 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/15 flex items-center justify-center flex-shrink-0">
              <SearchIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Search {page.tradeLabel} in {page.cityName}</p>
              <p className="text-slate-500 text-xs">Filter by availability, license type, and more</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors flex-shrink-0" />
        </Link>

        {/* Why TradePro Nexus */}
        <h2 className="text-lg font-black text-white mb-3">Why TradePro Nexus</h2>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <ShieldCheck className="w-4 h-4 text-orange-400 mb-2" />
            <p className="text-white text-sm font-bold mb-0.5">Official Licensing Data</p>
            <p className="text-slate-500 text-xs">Sourced directly from state licensing boards</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <SearchIcon className="w-4 h-4 text-orange-400 mb-2" />
            <p className="text-white text-sm font-bold mb-0.5">Free to Search</p>
            <p className="text-slate-500 text-xs">No account needed to browse the directory</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <Clock className="w-4 h-4 text-orange-400 mb-2" />
            <p className="text-white text-sm font-bold mb-0.5">Real Time Availability</p>
            <p className="text-slate-500 text-xs">Claimed profiles show current availability</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <MapPin className="w-4 h-4 text-orange-400 mb-2" />
            <p className="text-white text-sm font-bold mb-0.5">{directoryTotal.toLocaleString()} Contractors</p>
            <p className="text-slate-500 text-xs">Nationwide, across {CORE_STATE_COUNT} states</p>
          </div>
        </div>

        {/* Claim CTA */}
        <div className="bg-gradient-to-br from-orange-950/30 to-slate-900 border border-orange-900/40 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-black text-white mb-2">
            Are you a {page.tradeLabel.toLowerCase()} contractor in {page.cityName}?
          </h2>
          <p className="text-slate-300 text-sm mb-4">
            Claim your free Trade Card to show up first when general contractors search {page.cityName}.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Claim Your Free Trade Card <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related searches */}
        {(related.length > 0 || sameTrade.length > 0) && (
          <div>
            <h2 className="text-lg font-black text-white mb-3">Related Searches</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={`${r.citySlug}-${r.tradeSlug}`}
                  href={`/contractors/${r.stateSlug}/${r.citySlug}/${r.tradeSlug}`}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 hover:border-orange-600/60 text-slate-300 hover:text-orange-400 text-xs font-semibold rounded-full transition-colors"
                >
                  {r.tradeLabel} in {r.cityName}, {r.stateAbbr}
                </Link>
              ))}
              {sameTrade.map((r) => (
                <Link
                  key={`${r.stateSlug}-${r.citySlug}`}
                  href={`/contractors/${r.stateSlug}/${r.citySlug}/${r.tradeSlug}`}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 hover:border-orange-600/60 text-slate-300 hover:text-orange-400 text-xs font-semibold rounded-full transition-colors"
                >
                  {r.tradeLabel} in {r.cityName}, {r.stateAbbr}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
