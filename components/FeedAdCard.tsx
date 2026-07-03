// In-feed sponsor card -- appears every 5 posts in the Live Feed.
// House ad runs until first paying sponsor.

import { Megaphone } from "lucide-react";

export default function FeedAdCard() {
  return (
    <a
      href="/advertise"
      className="block bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-300 transition-all group"
      aria-label="Advertise on TradePro Nexus"
    >
      <div className="px-4 py-1.5 border-b border-[#e2e8f0] bg-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sponsored</span>
        <span className="text-[10px] text-slate-400">tradepronexus.com/advertise</span>
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-6 h-6 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-[#0f172a] mb-0.5 group-hover:text-orange-600 transition-colors">
            Reach 828,487 Licensed Contractors
          </h3>
          <p className="text-[#64748b] text-sm">
            Founding sponsor slots available. Reserve your placement today.
          </p>
        </div>
        <span className="flex-shrink-0 inline-flex items-center px-4 py-2 bg-orange-600 group-hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors">
          Learn More
        </span>
      </div>
    </a>
  );
}
