"use client";

import { useState, useEffect, useRef } from "react";
import { X, HardHat } from "lucide-react";
import { Suspense } from "react";
import WaitlistForm from "./WaitlistForm";

export default function WaitlistMobileBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("waitlist_bar_dismissed") === "1") {
      setDismissed(true);
      return;
    }
    // Show bar after user scrolls past 400px
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("waitlist_bar_dismissed", "1");
  }

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Backdrop blur bar */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-700/80 px-4 pt-4 pb-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-600/20 border border-orange-600/40 rounded-md flex items-center justify-center">
              <HardHat className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <span className="text-sm font-bold text-white">Join the Waitlist</span>
            <span className="text-xs text-orange-400 font-semibold">Free</span>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-500 hover:text-slate-300 p-1 -mr-1 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Suspense fallback={null}>
          <WaitlistForm compact />
        </Suspense>
      </div>
    </div>
  );
}
