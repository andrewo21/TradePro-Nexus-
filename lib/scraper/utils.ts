// Shared scraper utilities: robots.txt checker, rate limiter, retry, CSV parser

// ── robots.txt checker ────────────────────────────────────────────────────────

interface RobotsRule {
  userAgent: string;
  disallowed: string[];
  allowed: string[];
}

function parseRobotsTxt(text: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let current: RobotsRule | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();

    if (key.toLowerCase() === "user-agent") {
      current = { userAgent: value.toLowerCase(), disallowed: [], allowed: [] };
      rules.push(current);
    } else if (current && key.toLowerCase() === "disallow" && value) {
      current.disallowed.push(value);
    } else if (current && key.toLowerCase() === "allow" && value) {
      current.allowed.push(value);
    }
  }
  return rules;
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  // Simple prefix matching — covers the vast majority of robots.txt rules
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}`).test(path);
}

/**
 * Returns true if the given URL path is allowed for our user agent.
 * Defaults to ALLOWED if robots.txt cannot be fetched (fail open — scraping
 * public government data is permitted; robots.txt is a convention, not law,
 * but we respect it as policy).
 */
export async function isScrapingAllowed(siteUrl: string, pathToCheck: string): Promise<boolean> {
  try {
    const base = new URL(siteUrl);
    const robotsUrl = `${base.protocol}//${base.host}/robots.txt`;

    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": "TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return true; // No robots.txt → allowed

    const text = await res.text();
    const rules = parseRobotsTxt(text);

    // Find rules for our bot or wildcard
    const ourRules = rules.filter(r => r.userAgent === "tradenexus-bot" || r.userAgent === "*");
    if (ourRules.length === 0) return true;

    for (const rule of ourRules) {
      // Check specific allows first (allow overrides disallow if more specific)
      for (const allow of rule.allowed) {
        if (pathMatchesPattern(pathToCheck, allow)) return true;
      }
      for (const disallow of rule.disallowed) {
        if (pathMatchesPattern(pathToCheck, disallow)) return false;
      }
    }
    return true;
  } catch {
    // Cannot reach robots.txt — assume allowed (government public data)
    return true;
  }
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

/**
 * Simple per-domain rate limiter. Enforces minimum delay between requests.
 * Default: 1 request per 2 seconds (as required by session rules).
 */
const lastRequestTime: Record<string, number> = {};

export async function rateLimitedFetch(
  url: string,
  options: RequestInit = {},
  minDelayMs = 2000
): Promise<Response> {
  const domain = new URL(url).hostname;
  const now = Date.now();
  const last = lastRequestTime[domain] ?? 0;
  const wait = Math.max(0, minDelayMs - (now - last));

  if (wait > 0) {
    await delay(wait);
  }

  lastRequestTime[domain] = Date.now();

  return fetch(url, {
    ...options,
    headers: {
      "User-Agent": "TradePro-Nexus-Bot/1.0 (+https://tradepronexus.com/bot)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(30000),
  });
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await delay(baseDelayMs * attempt); // exponential back-off
      }
    }
  }
  throw lastError;
}

// ── CSV parser ────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects keyed by header row.
 * Handles quoted fields with commas. Used for the CSV upload fallback.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    results.push(row);
  }
  return results;
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Map common CSV column name variations to our standard fields.
 * Each state CSV export uses different column names — this normalises them.
 */
export function normalizeCsvRecord(row: Record<string, string>): Partial<{
  businessName: string;
  licenseType: string;
  licenseNumber: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}> {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.replace(/_/g, " ")] ?? row[k.replace(/_/g, "")];
      if (v) return v.trim();
    }
    return undefined;
  };

  return {
    businessName:  get("business_name", "name", "company_name", "dba", "licensee_name", "contractor_name"),
    licenseType:   get("license_type", "profession", "type", "license_category", "trade"),
    licenseNumber: get("license_number", "license_no", "lic_num", "number", "certificate_number"),
    city:          get("city", "mailing_city", "business_city"),
    state:         get("state", "mailing_state", "business_state"),
    phone:         get("phone", "telephone", "phone_number", "business_phone"),
    email:         get("email", "email_address", "contact_email"),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return raw.trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidLicenseNumber(s: string): boolean {
  return s.trim().length >= 3;
}
