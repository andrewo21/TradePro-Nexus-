// Desktop left/right ad rail — hidden on mobile per roadmap.
// Position: fixed on desktop, positioned relative to main content area.
// Shows placeholder "Advertise Here" until real inventory is sold.

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
      {/* Primary rail ad */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Sponsored</p>
        <div className="w-full aspect-square bg-slate-700/30 rounded-xl flex flex-col items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
            <span className="text-orange-400 text-lg font-black">$</span>
          </div>
          <p className="text-xs text-slate-500 text-center font-semibold">Advertise Here</p>
        </div>
        <p className="text-xs text-slate-500 text-center mb-3 leading-snug">
          Reach verified Trade Pros &amp; GC decision-makers.
        </p>
        <a
          href="/advertise"
          className="block w-full text-center px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors"
        >
          View Rates
        </a>
      </div>

      {/* Secondary rail ad */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Sponsored</p>
        <p className="text-xs text-slate-500 text-center leading-snug mb-3">
          Flat monthly rate. No bidding. No algorithm.
        </p>
        <a
          href="/advertise"
          className="block w-full text-center px-3 py-2 border border-slate-600 hover:border-orange-600 text-slate-400 hover:text-orange-400 text-xs font-semibold rounded-xl transition-colors"
        >
          Advertise on Nexus
        </a>
      </div>
    </div>
  );
}
