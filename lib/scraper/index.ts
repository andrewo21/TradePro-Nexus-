// Registry scraper module registry.
// Add each new state here as it's implemented.
// Session 1: Florida only.
// Sessions 2-4: Additional states added here.
// Session 5: Southeast cluster — VA, SC, NC, AL.

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
import { VirginiaScraper } from "./virginia";
import { SouthCarolinaScraper } from "./southcarolina";
import { NorthCarolinaScraper } from "./northcarolina";
import { AlabamaScraper } from "./alabama";
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
  VA: VirginiaScraper,       // Session 5
  SC: SouthCarolinaScraper,  // Session 5
  NC: NorthCarolinaScraper,  // Session 5
  AL: AlabamaScraper,        // Session 5
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
  VirginiaScraper,
  SouthCarolinaScraper,
  NorthCarolinaScraper,
  AlabamaScraper,
};
export * from "./types";
export * from "./utils";
