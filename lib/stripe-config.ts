// Safe to import in client components — no Stripe SDK here

export type GCTier = "solo" | "growing" | "full";

export const GC_TIERS = {
  solo: {
    label: "Solo",
    price: 49,
    seatLimit: 3,
    description: "1–3 users",
  },
  growing: {
    label: "Growing Firm",
    price: 149,
    seatLimit: 10,
    description: "Up to 10 users",
  },
  full: {
    label: "Full Team",
    price: 299,
    seatLimit: null as number | null,
    description: "Unlimited users",
  },
} as const satisfies Record<GCTier, { label: string; price: number; seatLimit: number | null; description: string }>;

export const FOUNDER_LIMIT = 50;
export const VERIFICATION_AMOUNT_CENTS = 9900;
export const VERIFICATION_REFUND_CENTS = 7900;
