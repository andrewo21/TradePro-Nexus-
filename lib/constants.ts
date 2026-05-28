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

// ── Trades ───────────────────────────────────────────────────────────────────

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
      "Testing & Inspection",
      "Commissioning",
      "Security Systems",
      "Parking Equipment",
    ],
  },
] as const;

export const ALL_TRADES = TRADE_GROUPS.flatMap((g) => g.trades);

// ── Availability labels ───────────────────────────────────────────────────────

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
