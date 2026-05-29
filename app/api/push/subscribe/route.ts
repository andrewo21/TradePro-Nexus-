import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// POST /api/push/subscribe — save or remove a push subscription
export async function POST(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { subscription, action } = await request.json() as {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      action: "subscribe" | "unsubscribe";
    };

    if (!subscription?.endpoint) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

    if (action === "unsubscribe") {
      await db.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", subscription.endpoint);
      return NextResponse.json({ unsubscribed: true });
    }

    // Upsert subscription
    await db.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: "user_id, endpoint" });

    return NextResponse.json({ subscribed: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
