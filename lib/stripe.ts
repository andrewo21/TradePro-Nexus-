// Server-only — never import this in client components
import Stripe from "stripe";
import { GC_TIERS, type GCTier, FOUNDER_LIMIT, VERIFICATION_AMOUNT_CENTS, VERIFICATION_REFUND_CENTS } from "./stripe-config";

export { GC_TIERS, type GCTier, FOUNDER_LIMIT, VERIFICATION_AMOUNT_CENTS, VERIFICATION_REFUND_CENTS };

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2026-05-27.dahlia",
});

export const STRIPE_PRICES = {
  verification: process.env.STRIPE_PRICE_VERIFICATION!,
  solo:         process.env.STRIPE_PRICE_SOLO!,
  growing:      process.env.STRIPE_PRICE_GROWING!,
  full:         process.env.STRIPE_PRICE_FULL!,
} as const;

// Merge price IDs into tier config for server-side use
export const GC_TIERS_WITH_PRICES = {
  solo:    { ...GC_TIERS.solo,    priceId: () => STRIPE_PRICES.solo },
  growing: { ...GC_TIERS.growing, priceId: () => STRIPE_PRICES.growing },
  full:    { ...GC_TIERS.full,    priceId: () => STRIPE_PRICES.full },
} as const;
