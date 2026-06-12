// Registry scraper module registry.
// Add each new state here as it's implemented.
// Session 1: Florida only.
// Sessions 2-4: Additional states added here.

import { FloridaScraper } from "./florida";
import { GeorgiaScraper } from "./georgia";
import { TexasScraper } from "./texas";
import { TennesseeScraper } from "./tennessee";
import { NewYorkScraper } from "./newyork";
import { PennsylvaniaScraper } from "./pennsylvania";
import { OhioScraper } from "./ohio";
import { IllinoisScraper } from "./illinois";
import { CaliforniaScraper } from "./california";
import { ArizonaScraper } from "./arizona";
import { NevadaScraper } from "./nevada";
import { WashingtonScraper } from "./washington";
import type { StateScraperModule } from "./types";

export const STATE_SCRAPERS: Record<string, StateScraperModule> = {
  FL: FloridaScraper,
  GA: GeorgiaScraper,        // Session 2
  TX: TexasScraper,          // Session 2
  TN: TennesseeScraper,      // Session 2
  NY: NewYorkScraper,        // Session 3
  PA: PennsylvaniaScraper,   // Session 3
  OH: OhioScraper,           // Session 3
  IL: IllinoisScraper,       // Session 3
  CA: CaliforniaScraper,     // Session 4
  AZ: ArizonaScraper,        // Session 4
  NV: NevadaScraper,         // Session 4
  WA: WashingtonScraper,     // Session 4
};

export {
  FloridaScraper,
  GeorgiaScraper,
  TexasScraper,
  TennesseeScraper,
  NewYorkScraper,
  PennsylvaniaScraper,
  OhioScraper,
  IllinoisScraper,
  CaliforniaScraper,
  ArizonaScraper,
  NevadaScraper,
  WashingtonScraper,
};
export * from "./types";
export * from "./utils";
