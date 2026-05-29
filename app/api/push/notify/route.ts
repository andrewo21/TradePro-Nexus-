import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { sendPushToUser, Notifications, type NotificationPayload } from "@/lib/webpush";

// Internal endpoint for triggering push notifications
// Called from other API routes (webhook, profile-view, etc.)
// Protected by ADMIN_NOTIFY_SECRET to prevent abuse

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-notify-secret");
  if (secret !== process.env.ADMIN_NOTIFY_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { user_id, type, data } = await request.json() as {
      user_id: string;
      type: keyof typeof Notifications;
      data?: Record<string, unknown>;
    };

    if (!user_id || !type) return NextResponse.json({ error: "user_id and type required." }, { status: 400 });

    const db = getSupabaseAdmin() as any;

    // Build payload from notification type
    let payload: NotificationPayload;
    switch (type) {
      case "verificationApproved":   payload = Notifications.verificationApproved(); break;
      case "verificationDenied":     payload = Notifications.verificationDenied(); break;
      case "verificationUnderReview": payload = Notifications.verificationUnderReview(); break;
      case "gcViewedCard":           payload = Notifications.gcViewedCard(data?.gcName as string); break;
      case "trialEnding":            payload = Notifications.trialEnding(data?.daysLeft as number ?? 3); break;
      case "verificationRenewal":    payload = Notifications.verificationRenewal(data?.daysLeft as number ?? 7); break;
      case "postLiked":              payload = Notifications.postLiked(data?.likerName as string ?? "Someone"); break;
      case "newFollower":            payload = Notifications.newFollower(data?.followerName as string ?? "Someone"); break;
      case "welcomePro":             payload = Notifications.welcomePro(data?.firstName as string ?? ""); break;
      case "welcomeGC":              payload = Notifications.welcomeGC(data?.name as string ?? ""); break;
      default: return NextResponse.json({ error: "Unknown notification type." }, { status: 400 });
    }

    await sendPushToUser(db, user_id, payload);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Push notify error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
