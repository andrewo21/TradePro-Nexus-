// Desktop ad rail -- fixed sidebar shown outside the main content column.
// Hidden on mobile. House ad until first paying sponsor.

import { Megaphone } from "lucide-react";

interface RailProps {
  side: "left" | "right";
}

export default function DesktopAdRail({ side }: RailProps) {
  return (
    <div
      className={`hidden xl:block fixed top-24 w-48 ${
        side === "left" ? "left-4 2xl:left-8" : "right-4 2xl:right-8"
      } z-10`}
      aria-label="Advertisement"
    >
      <a
        href="/advertise"
        className="block bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-orange-500/60 transition-colors group"
      >
        <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center mb-3">
          <Megaphone className="w-5 h-5 text-orange-400" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Sponsored</p>
        <h3 className="text-sm font-black text-white mb-1.5 leading-snug group-hover:text-orange-400 transition-colors">
          Reach 738,756 Licensed Contractors
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-snug">
          Founding sponsor slots available.
        </p>
        <span className="block w-full text-center px-3 py-2 bg-orange-600 group-hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors">
          Reserve a Slot
        </span>
      </a>
    </div>
  );
}
