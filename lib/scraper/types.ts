// Shared types for the registry import system

export interface RawRecord {
  businessName?: string;
  licenseType?: string;
  licenseNumber?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  rawData?: Record<string, string>;
}

export interface ScraperResult {
  records: RawRecord[];
  robotsBlocked: boolean;
  error?: string;
  pagesScraped: number;
}

export interface ImportSummary {
  importId: string;
  fetched: number;
  promoted: number;
  duplicate: number;
  errors: number;
  robotsBlocked: boolean;
}

// State registry module interface — every state scraper must implement this
export interface StateScraperModule {
  state: string;           // two-letter code, e.g. "FL"
  displayName: string;     // e.g. "Florida"
  registryUrl: string;
  scrape(importId: string): Promise<ScraperResult>;
}

export type ImportStatus = "running" | "complete" | "failed" | "partial" | "blocked";
export type StagingStatus = "pending" | "promoted" | "duplicate" | "error" | "skipped";
