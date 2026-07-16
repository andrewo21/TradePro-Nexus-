// Config for the SEO city/trade and state landing pages at /contractors/**.
//
// Only states and trades where unclaimed_profiles.license_type actually
// carries real trade-level data are included here. Several requested
// combinations were dropped after checking the live data:
// - North Carolina, New Jersey, New York: license_type only records a
//   generic tier/registration (NC: General Contractor license class only;
//   NJ: 100% "Home Improvement Business Contractor"; NY: only "Contractor
//   Registry Certificate" / "Home Improvement Contractor") -- no trade
//   breakdown exists, so those three get one state-level page each instead
//   of five city/trade pages.
// - Illinois: the entire dataset is roofing contractors -- not electricians
//   or general contractors, the two IL pages originally requested. One
//   state-level roofing page instead.

export interface CityTradePage {
  stateSlug: string;
  stateName: string;
  stateAbbr: string;
  citySlug: string;
  cityName: string;
  tradeSlug: string;
  tradeLabel: string;       // plural, e.g. "Electricians"
  searchTradeParam: string; // matches the TRADES list on /search
  licensePatterns: string[]; // ILIKE substrings against license_type
}

export interface StateOnlyPage {
  stateSlug: string;
  stateName: string;
  stateAbbr: string;
  tradeLabel: string;
  searchTradeParam: string;
  licensePatterns: string[]; // empty = no trade filter, count the whole state
}

export const CITY_TRADE_PAGES: CityTradePage[] = [
  // Florida
  { stateSlug: "florida", stateName: "Florida", stateAbbr: "FL", citySlug: "miami", cityName: "Miami",
    tradeSlug: "electricians", tradeLabel: "Electricians", searchTradeParam: "Electrical",
    licensePatterns: ["electrical", "electrician"] },
  { stateSlug: "florida", stateName: "Florida", stateAbbr: "FL", citySlug: "orlando", cityName: "Orlando",
    tradeSlug: "plumbers", tradeLabel: "Plumbers", searchTradeParam: "Plumbing",
    licensePatterns: ["plumb"] },
  { stateSlug: "florida", stateName: "Florida", stateAbbr: "FL", citySlug: "tampa", cityName: "Tampa",
    tradeSlug: "hvac", tradeLabel: "HVAC Contractors", searchTradeParam: "HVAC",
    licensePatterns: ["air cond", "hvac", "refriger", "hydron"] },
  { stateSlug: "florida", stateName: "Florida", stateAbbr: "FL", citySlug: "jacksonville", cityName: "Jacksonville",
    tradeSlug: "general-contractors", tradeLabel: "General Contractors", searchTradeParam: "Civil",
    licensePatterns: ["general"] },
  { stateSlug: "florida", stateName: "Florida", stateAbbr: "FL", citySlug: "fort-lauderdale", cityName: "Fort Lauderdale",
    tradeSlug: "roofing", tradeLabel: "Roofing Contractors", searchTradeParam: "Roofing",
    licensePatterns: ["roof"] },

  // Virginia -- DPOR codes: ELE=Electrical, HVA=HVAC, PLB=Plumbing,
  // RBC/CBC=Residential/Commercial Building Contractor, ROC=Roofing Contractor
  { stateSlug: "virginia", stateName: "Virginia", stateAbbr: "VA", citySlug: "richmond", cityName: "Richmond",
    tradeSlug: "electricians", tradeLabel: "Electricians", searchTradeParam: "Electrical",
    licensePatterns: ["ELE"] },
  { stateSlug: "virginia", stateName: "Virginia", stateAbbr: "VA", citySlug: "virginia-beach", cityName: "Virginia Beach",
    tradeSlug: "general-contractors", tradeLabel: "General Contractors", searchTradeParam: "Civil",
    licensePatterns: ["RBC", "CBC"] },
  { stateSlug: "virginia", stateName: "Virginia", stateAbbr: "VA", citySlug: "northern-virginia", cityName: "Northern Virginia",
    tradeSlug: "hvac", tradeLabel: "HVAC Contractors", searchTradeParam: "HVAC",
    licensePatterns: ["HVA"] },
  { stateSlug: "virginia", stateName: "Virginia", stateAbbr: "VA", citySlug: "norfolk", cityName: "Norfolk",
    tradeSlug: "plumbers", tradeLabel: "Plumbers", searchTradeParam: "Plumbing",
    licensePatterns: ["PLB", "Plumbing"] },
  { stateSlug: "virginia", stateName: "Virginia", stateAbbr: "VA", citySlug: "roanoke", cityName: "Roanoke",
    tradeSlug: "roofing", tradeLabel: "Roofing Contractors", searchTradeParam: "Roofing",
    licensePatterns: ["ROC"] },

  // Connecticut
  { stateSlug: "connecticut", stateName: "Connecticut", stateAbbr: "CT", citySlug: "hartford", cityName: "Hartford",
    tradeSlug: "electricians", tradeLabel: "Electricians", searchTradeParam: "Electrical",
    licensePatterns: ["ELECTRICAL"] },
  { stateSlug: "connecticut", stateName: "Connecticut", stateAbbr: "CT", citySlug: "new-haven", cityName: "New Haven",
    tradeSlug: "general-contractors", tradeLabel: "General Contractors", searchTradeParam: "Civil",
    licensePatterns: ["NEW HOME CONSTRUCTION"] },

  // Pennsylvania
  { stateSlug: "pennsylvania", stateName: "Pennsylvania", stateAbbr: "PA", citySlug: "philadelphia", cityName: "Philadelphia",
    tradeSlug: "electricians", tradeLabel: "Electricians", searchTradeParam: "Electrical",
    licensePatterns: ["electrical"] },
  { stateSlug: "pennsylvania", stateName: "Pennsylvania", stateAbbr: "PA", citySlug: "pittsburgh", cityName: "Pittsburgh",
    tradeSlug: "general-contractors", tradeLabel: "General Contractors", searchTradeParam: "Civil",
    licensePatterns: ["general contractor"] },
];

export const STATE_ONLY_PAGES: StateOnlyPage[] = [
  { stateSlug: "north-carolina", stateName: "North Carolina", stateAbbr: "NC",
    tradeLabel: "General Contractors", searchTradeParam: "Civil", licensePatterns: [] },
  { stateSlug: "new-jersey", stateName: "New Jersey", stateAbbr: "NJ",
    tradeLabel: "Home Improvement Contractors", searchTradeParam: "", licensePatterns: [] },
  { stateSlug: "new-york", stateName: "New York", stateAbbr: "NY",
    tradeLabel: "General Contractors", searchTradeParam: "Civil", licensePatterns: [] },
  { stateSlug: "illinois", stateName: "Illinois", stateAbbr: "IL",
    tradeLabel: "Roofing Contractors", searchTradeParam: "Roofing", licensePatterns: [] },
];

export function buildLicenseTypeOr(patterns: string[]): string | null {
  if (!patterns.length) return null;
  return patterns.map((p) => `license_type.ilike.%${p}%`).join(",");
}

// Related city/trade pages within the same state, for internal linking.
export function relatedCityTradePages(page: CityTradePage): CityTradePage[] {
  return CITY_TRADE_PAGES.filter(
    (p) => p.stateSlug === page.stateSlug && p.tradeSlug !== page.tradeSlug
  );
}

// Same trade, other states.
export function sameTradeOtherStates(page: CityTradePage): CityTradePage[] {
  return CITY_TRADE_PAGES.filter(
    (p) => p.tradeSlug === page.tradeSlug && p.stateSlug !== page.stateSlug
  );
}
