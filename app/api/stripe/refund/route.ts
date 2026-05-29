import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";
import { stripe, VERIFICATION_REFUND_CENTS } from "@/lib/stripe";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

export async function POST(request: NextRequest) {
  try {
    const authDb = (await getSupabaseServer()) as any;
    const { data: { user } } = await authDb.auth.getUser();
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { profile_id } = await request.json() as { profile_id: string };
    if (!profile_id) return NextResponse.json({ error: "Missing profile_id." }, { status: 400 });

    const db = getSupabaseAdmin() as any;

    // Get the paid verification record
    const { data: payment } = await db
      .from("verification_payments")
      .select("id, stripe_payment_intent_id, status, amount_refunded")
      .eq("profile_id", profile_id)
      .eq("status", "paid")
      .single();

    if (!payment) {
      return NextResponse.json({ error: "No paid verification found." }, { status: 404 });
    }

    if (payment.amount_refunded > 0) {
      return NextResponse.json({ error: "Already refunded." }, { status: 409 });
    }

    // Issue $79 partial refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: VERIFICATION_REFUND_CENTS,
      reason: "requested_by_customer",
    });

    // Update payment record and profile status
    await Promise.all([
      db.from("verification_payments").update({
        status: "denied",
        amount_refunded: VERIFICATION_REFUND_CENTS,
      }).eq("id", payment.id),
      db.from("profiles").update({
        verification_status: "rejected",
      }).eq("id", profile_id),
    ]);

    return NextResponse.json({ refund_id: refund.id, amount_refunded: VERIFICATION_REFUND_CENTS });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
