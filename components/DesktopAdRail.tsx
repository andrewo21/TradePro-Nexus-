// Desktop left/right ad rail — hidden on mobile per roadmap.
// Position: fixed on desktop, positioned relative to main content area.
// Shows a TradePro Nexus house ad until real advertiser inventory is sold.

import { Megaphone } from "lucide-react";

interface RailProps {
  side: "left" | "right";
}

export default function DesktopAdRail({ side }: RailProps) {
  return (
    <div
      className={`hidden xl:block fixed top-24 w-48 ${
        side === "left" ? "left-4 2xl:left-8" : "right-4 2xl:right-8"
      } space-y-4 z-10`}
      aria-label="Advertisement"
    >
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 hover:border-orange-600/40 transition-colors">
        <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center mb-3">
          <Megaphone className="w-5 h-5 text-orange-400" />
        </div>
        <h3 className="text-sm font-black text-white mb-1.5 leading-snug">Reach Verified Trade Professionals</h3>
        <p className="text-xs text-slate-500 mb-4 leading-snug">Advertising opportunities coming soon</p>
        <a
          href="/advertise"
          className="block w-full text-center px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Learn More
        </a>
      </div>
    </div>
  );
}
