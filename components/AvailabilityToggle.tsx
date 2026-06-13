"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface Props {
  initialStatus: string;
}

export default function AvailabilityToggle({ initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  const isAvailable = status === "available";

  async function toggle() {
    const next = isAvailable ? "booked" : "available";
    setSaving(true);
    try {
      await fetch("/api/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (next === "available") trackEvent("available_toggle");
      setStatus(next);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
      <div>
        <p className="text-white font-bold text-sm">Available for Work</p>
        <p className="text-slate-400 text-xs mt-0.5">
          {isAvailable
            ? "Your profile shows as Available — GCs can find you"
            : "Shown as unavailable — toggle on to get discovered"}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`relative flex-shrink-0 w-12 h-6 rounded-full border-2 transition-all duration-200 ${
          isAvailable ? "bg-green-500 border-green-400" : "bg-slate-700 border-slate-600"
        } disabled:opacity-50`}
        aria-label={isAvailable ? "Turn off availability" : "Turn on availability"}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white absolute top-0.5 right-0.5" />
        ) : (
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
              isAvailable ? "left-6" : "left-0.5"
            }`}
          />
        )}
      </button>
    </div>
  );
}
