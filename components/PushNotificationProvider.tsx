"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

// Registers service worker and subscribes to push notifications.
// Added to layout.tsx — runs once per session.
// Design choice: ask for permission silently after auth,
// no modal prompt yet (add explicit opt-in UI in Phase 6.5 if needed).
export default function PushNotificationProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function setup() {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Check auth
        const supabase = getSupabase();
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return;

        // Check existing permission — only subscribe if already granted or default
        // We don't prompt automatically; user triggers via notification bell (future UI)
        if (Notification.permission === "denied") return;

        // If already subscribed, keep it; if permission granted, subscribe
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Re-register with backend to ensure freshness
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: existing.toJSON(), action: "subscribe" }),
          });
          return;
        }

        // Only subscribe if permission is already granted (not default — respect user agency)
        if (Notification.permission !== "granted") return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast needed: TypeScript is overly strict about SharedArrayBuffer vs ArrayBuffer
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), action: "subscribe" }),
        });
      } catch (err) {
        // Non-fatal — push is progressive enhancement
        console.debug("Push setup:", err);
      }
    }

    setup();
  }, []);

  return null;
}

// Helper: convert VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
