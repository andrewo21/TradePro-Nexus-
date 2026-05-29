import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { stripe, GC_TIERS_WITH_PRICES, FOUNDER_LIMIT } from "@/lib/stripe";
import type { GCTier } from "@/lib/stripe-config";

export async function POST(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    // Must be a GC with a company profile
    const { data: company } = await db
      .from("companies")
      .select("id, name, email, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: "Create a company profile first." },
        { status: 404 }
      );
    }

    const { tier } = (await request.json()) as { tier: GCTier };
    if (!["solo", "growing", "full"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
    }

    // Check for existing active/trialing subscription
    const { data: existing } = await db
      .from("gc_subscriptions")
      .select("id, status")
      .eq("company_id", company.id)
      .in("status", ["trialing", "active"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Already subscribed. Manage your plan from your account page." },
        { status: 409 }
      );
    }

    // Check founder eligibility (first 50 GC subscriptions ever)
    const { count: subCount } = await db
      .from("gc_subscriptions")
      .select("*", { count: "exact", head: true });
    const isFounder = (subCount ?? 0) < FOUNDER_LIMIT;

    const tierConfig = GC_TIERS_WITH_PRICES[tier];

    // Get or create Stripe customer
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? company.email,
        name: company.name,
        metadata: { user_id: user.id, company_id: company.id },
      });
      customerId = customer.id;
      await db.from("companies").update({ stripe_customer_id: customerId }).eq("id", company.id);
    }

    const origin = request.headers.get("origin") ?? "https://tradepronexus.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: tierConfig.priceId(), quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: {
          company_id: company.id,
          tier,
          is_founder: isFounder ? "true" : "false",
        },
      },
      payment_method_collection: "if_required",
      success_url: `${origin}/account?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        type: "gc_subscription",
        user_id: user.id,
        company_id: company.id,
        tier,
        is_founder: isFounder ? "true" : "false",
      },
    });

    return NextResponse.json({ url: session.url, is_founder: isFounder });
  } catch (err) {
    console.error("Subscription checkout error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
