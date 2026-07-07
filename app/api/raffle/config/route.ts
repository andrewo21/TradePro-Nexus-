import { NextResponse } from "next/server";

// GET /api/raffle/config
// Single source of truth for whether raffle promo content should render.
// A plain API route (never statically cached) so flipping RAFFLE_ACTIVE in
// Vercel takes effect immediately on the next request, no redeploy needed.
export async function GET() {
  return NextResponse.json({ active: process.env.RAFFLE_ACTIVE === "true" });
}
