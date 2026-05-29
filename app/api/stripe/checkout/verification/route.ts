import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { stripe, STRIPE_PRICES, VERIFICATION_AMOUNT_CENTS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    // Must have a profile first
    const { data: profile } = await db
      .from("profiles")
      .select("id, email, stripe_customer_id, verification_status")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Build your Trade Card first." }, { status: 404 });
    }

    if (profile.verification_status === "verified") {
      return NextResponse.json({ error: "Already verified." }, { status: 409 });
    }

    // Check for existing unpaid session
    const { data: existing } = await db
      .from("verification_payments")
      .select("id, status, stripe_session_id")
      .eq("profile_id", profile.id)
      .eq("status", "pending")
      .maybeSingle();

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile.email,
        metadata: { user_id: user.id, profile_id: profile.id },
      });
      customerId = customer.id;
      await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", profile.id);
    }

    const origin = request.headers.get("origin") ?? "https://tradepronexus.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: STRIPE_PRICES.verification, quantity: 1 }],
      success_url: `${origin}/build?verification=pending&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/verify`,
      metadata: {
        type: "verification",
        user_id: user.id,
        profile_id: profile.id,
      },
    });

    // Record the pending payment
    if (!existing) {
      await db.from("verification_payments").insert({
        profile_id: profile.id,
        stripe_customer_id: customerId,
        stripe_session_id: session.id,
        amount_paid: VERIFICATION_AMOUNT_CENTS,
        status: "pending",
      });
    } else {
      await db.from("verification_payments").update({
        stripe_session_id: session.id,
      }).eq("id", existing.id);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Verification checkout error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
