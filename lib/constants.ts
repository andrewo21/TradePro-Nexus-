// ── Profile Types ─────────────────────────────────────────────────────────────

export type ProfileType = "tradepro" | "sub" | "inspector" | "architect" | "engineer";

export const PROFILE_TYPES = {
  tradepro: {
    label: "Trade Pro / Worker",
    description: "Individual tradeworker or laborer",
    color: "orange",
    short: "Trade Pro",
  },
  sub: {
    label: "Sub / Contractor",
    description: "Subcontracting company or contractor",
    color: "orange",
    short: "Sub",
  },
  inspector: {
    label: "Inspector / Testing Agency",
    description: "Special inspector, threshold inspector, testing lab, or firm",
    color: "green",
    short: "Inspector",
  },
  architect: {
    label: "Architect",
    description: "Design, interior, landscape architect, or code consultant",
    color: "blue",
    short: "Architect",
  },
  engineer: {
    label: "Engineer",
    description: "Structural, civil, MEP, geotechnical, or other discipline",
    color: "purple",
    short: "Engineer",
  },
} as const satisfies Record<ProfileType, { label: string; description: string; color: string; short: string }>;

// ── Verification eligibility ─────────────────────────────────────────────────
// Only business / licensed-professional profile types (and companies) can ever
// carry a VERIFIED badge. Individual trade workers ("tradepro") are never
// verified — they earn engagement badges instead.

export const VERIFIABLE_PROFILE_TYPES: ProfileType[] = ["sub", "inspector", "architect", "engineer"];

export function canBeVerified(profileType: string | null | undefined): boolean {
  return !!profileType && (VERIFIABLE_PROFILE_TYPES as string[]).includes(profileType);
}

export const VERIFICATION_INELIGIBLE_MESSAGE =
  "Verification is available for subcontracting businesses and licensed professional entities. Individual trade worker profiles are not eligible for verification.";

// ── Sectors ──────────────────────────────────────────────────────────────────

export const SECTORS = [
  "Senior Living",
  "Healthcare",
  "Federal / Gov't",
  "Multifamily",
  "Industrial",
  "K-12 Education",
  "Mixed-Use",
  "Data Centers",
  "Hospitality",
];

// ── Trade + Discipline Groups ─────────────────────────────────────────────────

export const TRADE_GROUPS = [
  {
    label: "Primary Trades",
    trades: [
      "Electrical",
      "Plumbing",
      "HVAC",
      "Carpentry",
      "Mechanical",
      "Civil / Site",
      "Structural Steel",
      "Fire Suppression",
    ],
  },
  {
    label: "Secondary Trades",
    trades: [
      "Masonry",
      "Concrete",
      "Roofing",
      "Waterproofing",
      "Insulation",
      "Drywall / Framing",
      "Flooring",
      "Painting",
      "Glazing / Windows & Doors",
      "Elevators",
      "Landscaping / Site Improvements",
    ],
  },
  {
    label: "Specialty Trades",
    trades: [
      "Millwork",
      "Casework",
      "Ornamental Metals",
      "Signage",
      "Window Treatments",
      "Loading Dock Equipment",
      "Overhead Doors",
      "Access Control",
      "Low Voltage / AV",
      "Food Service Equipment",
      "Lab Equipment",
      "Medical Equipment Installation",
      "Fencing",
      "Pavers",
      "Irrigation",
      "Tree Service",
    ],
  },
  {
    label: "Critical Support",
    trades: [
      "Demolition",
      "Abatement",
      "Temp Power",
      "Scaffolding",
      "Crane / Rigging",
      "Survey",
      "Commissioning",
      "Security Systems",
      "Parking Equipment",
    ],
  },
  {
    label: "Testing & Inspection",
    trades: [
      "Threshold Inspector (Florida)",
      "Special Inspector — Structural",
      "Special Inspector — Concrete",
      "Special Inspector — Fireproofing",
      "Special Inspector — Welding",
      "Geotechnical / Soils Testing",
      "Environmental Testing",
      "Air Barrier Testing",
      "Waterproofing Inspection",
      "Building Envelope Consultant",
      "Third Party Testing Lab",
      "Materials Testing",
      "Special Inspection Firm",
    ],
  },
  {
    label: "Architecture",
    trades: [
      "Design Architect",
      "Interior Architect",
      "Landscape Architect",
      "Historic Preservation",
      "Code Consultant",
      "BIM / VDC Specialist",
    ],
  },
  {
    label: "Engineering",
    trades: [
      "Structural Engineer",
      "Civil Engineer",
      "MEP Engineer",
      "Geotechnical Engineer",
      "Environmental Engineer",
      "Commissioning Engineer",
      "Facade / Envelope Engineer",
      "Fire Protection Engineer",
      "Acoustical Engineer",
      "Technology / Low Voltage Engineer",
      "Cost Estimator",
      "Owner's Rep",
    ],
  },
] as const;

export const ALL_TRADES = TRADE_GROUPS.flatMap((g) => g.trades);

// ── Certifications by profile type ───────────────────────────────────────────

export const INSPECTOR_CERTS = [
  "ICC — Building Inspector",
  "ICC — Structural Steel & Bolting Inspector",
  "ICC — Concrete Inspector",
  "ICC — Reinforced Concrete Inspector",
  "ICC — Spray-Applied Fireproofing Inspector",
  "ACI — Concrete Field Testing Technician Grade I",
  "ACI — Concrete Strength Testing Technician",
  "AWS — Certified Welding Inspector (CWI)",
  "NICET — Level I / II / III",
  "PE — Professional Engineer",
  "AIA — Associate / Member",
  "ICBO Certification",
  "Florida Threshold Inspector License",
  "Geotechnical Testing Certification",
  "Air Barrier QC Inspector",
];

export const ARCHITECT_CERTS = [
  "AIA Member",
  "LEED AP",
  "NCARB Certified",
  "Historic Preservation Specialist",
  "Passive House Designer",
  "WELL AP",
];

export const ARCHITECT_SOFTWARE = [
  "Revit",
  "AutoCAD",
  "SketchUp",
  "Rhino",
  "ArchiCAD",
  "Bluebeam",
  "Navisworks",
];

export const ENGINEER_DISCIPLINES = [
  "Structural",
  "Civil",
  "MEP — Mechanical",
  "MEP — Electrical",
  "MEP — Plumbing",
  "Geotechnical",
  "Environmental",
  "Commissioning",
  "Facade / Envelope",
  "Fire Protection",
  "Acoustical",
  "Technology / Low Voltage",
  "Cost Estimating",
  "Owner's Rep",
];

export const ENGINEER_SOFTWARE = [
  "ETABS",
  "SAP2000",
  "Revit Structure",
  "Revit MEP",
  "AutoCAD Civil 3D",
  "RAM Structural System",
  "SAFE",
  "STAAD.Pro",
  "Bluebeam",
  "Navisworks",
];

export const OSHA_CERTS = [
  "OSHA 10 — Construction",
  "OSHA 30 — Construction",
  "OSHA 10 — General Industry",
  "OSHA 30 — General Industry",
  "Fall Protection",
  "Confined Space",
  "Forklift / Equipment Operator",
  "First Aid / CPR",
];

// ── Availability labels ───────────────────────────────────────────────────────

// ── Union ─────────────────────────────────────────────────────────────────────

export const UNION_NAMES = [
  "IBEW",
  "UA",
  "Carpenters",
  "Ironworkers",
  "IUJAT",
  "Laborers",
  "Operating Engineers",
  "Sheet Metal Workers",
  "Painters",
  "Roofers",
  "Other",
];

export const UNION_MEMBER_STATUSES = [
  "Journeyman",
  "Apprentice",
  "Master",
  "Foreman",
  "Superintendent",
];

// Union Member badge — self-reported only, styled distinctly from VerificationBadge
export const UNION_BADGE_CONFIG = {
  label: "Union Member",
  color: "text-slate-300",
  bg: "bg-slate-700/40",
  border: "border-slate-500/50",
} as const;

// ── Job postings (Union Opportunities / Job Placement) ───────────────────────

export const UNION_JOB_REQUIREMENTS = ["Union Only", "Union Preferred", "Open to All"] as const;

export const JOB_TYPES = ["Direct Hire", "Sub-Contract", "Temporary / Short-Term"] as const;

export const AVAILABILITY_CONFIG = {
  available: {
    label: "Available Now",
    color: "text-green-400",
    bg: "bg-green-900/30",
    border: "border-green-800/50",
    dot: "bg-green-400",
  },
  available_soon: {
    label: "Available Soon",
    color: "text-yellow-400",
    bg: "bg-yellow-900/30",
    border: "border-yellow-800/50",
    dot: "bg-yellow-400",
  },
  booked: {
    label: "Booked",
    color: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-800/40",
    dot: "bg-red-400",
  },
} as const;

// Emails allowed into /admin/* pages -- keep in sync with ADMIN_ALLOWED_EMAILS
// in proxy.ts, which gates the /api/admin/* routes those pages call.
export const ADMIN_EMAILS: string[] = ["andrew@tradepronexus.com", "andrew@tradeprotech.ai"];
