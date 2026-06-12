// Union partner landing page config — drives /partners/[slug].
// Each entry maps a URL slug to the union's display name and brand color
// for the co-branded header. Promo codes follow the `{SLUG}10` pattern
// (10% off TradePro Tech via tradeprotech.ai).

export interface PartnerConfig {
  slug: string;
  name: string;
  fullName: string;
  color: string;
}

export const PARTNER_CONFIGS: Record<string, PartnerConfig> = {
  iujat: {
    slug: "iujat",
    name: "IUJAT",
    fullName: "International Union of Journeymen and Allied Trades",
    color: "#1d4ed8",
  },
  ibew: {
    slug: "ibew",
    name: "IBEW",
    fullName: "International Brotherhood of Electrical Workers",
    color: "#dc2626",
  },
  ua: {
    slug: "ua",
    name: "UA",
    fullName: "United Association of Plumbers, Fitters, Welders & HVAC Techs",
    color: "#0891b2",
  },
  carpenters: {
    slug: "carpenters",
    name: "Carpenters",
    fullName: "United Brotherhood of Carpenters and Joiners",
    color: "#b45309",
  },
  ironworkers: {
    slug: "ironworkers",
    name: "Ironworkers",
    fullName: "International Association of Bridge, Structural, Ornamental and Reinforcing Iron Workers",
    color: "#475569",
  },
  laborers: {
    slug: "laborers",
    name: "Laborers",
    fullName: "Laborers' International Union of North America",
    color: "#15803d",
  },
  "operating-engineers": {
    slug: "operating-engineers",
    name: "Operating Engineers",
    fullName: "International Union of Operating Engineers",
    color: "#ca8a04",
  },
  "sheet-metal-workers": {
    slug: "sheet-metal-workers",
    name: "Sheet Metal Workers",
    fullName: "International Association of Sheet Metal, Air, Rail and Transportation Workers",
    color: "#64748b",
  },
  painters: {
    slug: "painters",
    name: "Painters",
    fullName: "International Union of Painters and Allied Trades",
    color: "#7c3aed",
  },
  roofers: {
    slug: "roofers",
    name: "Roofers",
    fullName: "United Union of Roofers, Waterproofers and Allied Workers",
    color: "#9f1239",
  },
};

export function getPartnerConfig(slug: string): PartnerConfig | null {
  return PARTNER_CONFIGS[slug.toLowerCase()] ?? null;
}

export function getPromoCode(config: PartnerConfig): string {
  return `${config.name.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}10`;
}
