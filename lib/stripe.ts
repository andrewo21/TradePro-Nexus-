import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

// ── Price IDs ──────────────────────────────────────────────────────────────────

export const STRIPE_PRICES = {
  verification: process.env.STRIPE_PRICE_VERIFICATION!,
  solo:         process.env.STRIPE_PRICE_SOLO!,
  growing:      process.env.STRIPE_PRICE_GROWING!,
  full:         process.env.STRIPE_PRICE_FULL!,
} as const;

export type GCTier = "solo" | "growing" | "full";

// ── Tier config ────────────────────────────────────────────────────────────────

export const GC_TIERS = {
  solo: {
    label: "Solo",
    price: 49,
    priceId: () => STRIPE_PRICES.solo,
    seatLimit: 3,
    description: "1–3 users",
  },
  growing: {
    label: "Growing Firm",
    price: 149,
    priceId: () => STRIPE_PRICES.growing,
    seatLimit: 10,
    description: "Up to 10 users",
  },
  full: {
    label: "Full Team",
    price: 299,
    priceId: () => STRIPE_PRICES.full,
    seatLimit: null,
    description: "Unlimited users",
  },
} as const satisfies Record<GCTier, { label: string; price: number; priceId: () => string; seatLimit: number | null; description: string }>;

export const FOUNDER_LIMIT = 50;
export const VERIFICATION_AMOUNT_CENTS = 9900;
export const VERIFICATION_REFUND_CENTS = 7900; // $79 back on denial
