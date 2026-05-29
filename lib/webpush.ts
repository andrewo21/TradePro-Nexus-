// Server-only — web-push setup with VAPID keys
// VAPID keys generated 2026-05-28 for tradepronexus.com
// Lazy init: setVapidDetails only runs when actually sending a notification,
// not at module load time — avoids crashing the build when keys aren't set.
import webpush from "web-push";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return; // graceful no-op when keys not configured
  webpush.setVapidDetails("mailto:andrew@tradeprotech.ai", pub, priv);
  vapidConfigured = true;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

// Send a push notification to all subscriptions for a user
export async function sendPushToUser(
  db: any,
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  ensureVapid();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
      } catch (err: any) {
        // 410 Gone = subscription expired, clean up
        if (err.statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}

// Notification templates
export const Notifications = {
  verificationApproved: (): NotificationPayload => ({
    title: "Verified Pro ✓",
    body: "Your Trade Card has been verified. You're now visible in GC searches.",
    url: "/build",
  }),
  verificationDenied: (): NotificationPayload => ({
    title: "Verification Update",
    body: "Your verification was not approved. $79 has been refunded. Check your email for details.",
    url: "/verify",
  }),
  verificationUnderReview: (): NotificationPayload => ({
    title: "Verification Under Review",
    body: "Your documents are being reviewed by our team. We'll notify you within 24 hours.",
    url: "/build",
  }),
  gcViewedCard: (gcName?: string): NotificationPayload => ({
    title: "A GC Viewed Your Trade Card",
    body: gcName ? `${gcName} just checked out your profile.` : "A General Contractor just viewed your Trade Card.",
    url: "/build",
  }),
  trialEnding: (daysLeft: number): NotificationPayload => ({
    title: "Trial Ending Soon",
    body: `Your 30-day free trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Add a payment method to keep access.`,
    url: "/account",
  }),
  verificationRenewal: (daysLeft: number): NotificationPayload => ({
    title: "Verification Renewal",
    body: `Your Verified badge expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Renew to stay visible in GC searches.`,
    url: "/verify",
  }),
  postLiked: (likerName: string): NotificationPayload => ({
    title: "Someone liked your post",
    body: `${likerName} liked your feed update.`,
    url: "/feed",
  }),
  newFollower: (followerName: string): NotificationPayload => ({
    title: "New Follower",
    body: `${followerName} started following you.`,
    url: "/feed",
  }),
  welcomePro: (firstName: string): NotificationPayload => ({
    title: `Welcome to TradePro Nexus, ${firstName}!`,
    body: "Your account is set up. Build your Digital Trade Card to get seen by GCs.",
    url: "/build",
  }),
  welcomeGC: (name: string): NotificationPayload => ({
    title: `Welcome, ${name}!`,
    body: "Your GC account is ready. Start searching verified crews now.",
    url: "/search",
  }),
};
