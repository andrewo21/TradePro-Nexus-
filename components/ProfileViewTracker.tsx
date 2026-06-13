"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Fires once on mount to record a GC viewing this Trade Card.
// Used to trigger the "A GC viewed your card" push notification (Phase 6).
export default function ProfileViewTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    // Fire-and-forget — don't block UI
    fetch("/api/profile-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    }).catch(() => {});

    trackEvent("trade_card_view", { profile_id: profileId });
  }, [profileId]);

  return null; // renders nothing
}
