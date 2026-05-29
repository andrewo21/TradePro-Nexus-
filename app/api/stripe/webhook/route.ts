import { NextResponse, type NextRequest } from "next/server";
import { stripe, GC_TIERS_WITH_PRICES } from "@/lib/stripe";
import type { GCTier } from "@/lib/stripe-config";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import type Stripe from "stripe";

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = "force-dynamic";

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const db = getSupabaseAdmin() as any;
  const { type, company_id, tier, is_founder } = session.metadata ?? {};

  if (type === "verification") {
    const { profile_id } = session.metadata ?? {};
    if (!profile_id) return;

    await db.from("verification_payments").update({
      stripe_payment_intent_id: session.payment_intent as string,
      status: "paid",
    }).eq("stripe_session_id", session.id);

    // Move profile to pending review (human verifies docs)
    await db.from("profiles").update({
      verification_status: "pending",
    }).eq("id", profile_id);
  }

  if (type === "gc_subscription") {
    if (!company_id || !tier) return;
    const tierConfig = GC_TIERS_WITH_PRICES[tier as GCTier];
    const isFounder = is_founder === "true";

    // Subscription record created by customer.subscription.created event
    // Just ensure it exists with correct metadata
    await db.from("gc_subscriptions").upsert({
      company_id,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      stripe_price_id: tierConfig.priceId(),
      tier,
      status: "trialing",
      is_founder: isFounder,
      seat_limit: tierConfig.seatLimit,
      trial_ends_at: session.subscription
        ? (await stripe.subscriptions.retrieve(session.subscription as string)).trial_end
          ? new Date(((await stripe.subscriptions.retrieve(session.subscription as string)).trial_end!) * 1000).toISOString()
          : null
        : null,
    }, { onConflict: "stripe_subscription_id" });
  }
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const db = getSupabaseAdmin() as any;
  const { company_id, tier, is_founder } = sub.metadata ?? {};
  if (!company_id) return;

  const tierConfig = tier ? GC_TIERS_WITH_PRICES[tier as GCTier] : null;
  const status = sub.status === "trialing" ? "trialing"
    : sub.status === "active" ? "active"
    : sub.status === "past_due" ? "past_due"
    : sub.status === "canceled" ? "canceled"
    : "incomplete";

  await db.from("gc_subscriptions").upsert({
    company_id,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: sub.items.data[0]?.price.id,
    tier: tier ?? "solo",
    status,
    is_founder: is_founder === "true",
    seat_limit: tierConfig?.seatLimit ?? 3,
    trial_ends_at: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
    current_period_end: (sub as any).current_period_end
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null,
    canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
  }, { onConflict: "stripe_subscription_id" });
}

async function handleSubscriptionDelete(sub: Stripe.Subscription) {
  const db = getSupabaseAdmin() as any;
  await db.from("gc_subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const db = getSupabaseAdmin() as any;
  // In Stripe v22 the subscription reference is on invoice.parent or via cast
  const subscriptionId = (invoice as any).subscription ?? (invoice as any).parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  await db.from("gc_subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDelete(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Return 200 so Stripe doesn't retry — log and investigate
  }

  return NextResponse.json({ received: true });
}
