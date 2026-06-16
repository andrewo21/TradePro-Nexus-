// In-feed house ad — appears every 5-6 posts.
// Design: same card language as feed posts, dark navy, clearly labeled.
// Shown until real advertiser inventory is sold.

import { Megaphone } from "lucide-react";

export default function FeedAdCard() {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#cbd5e1] transition-all">
      <div className="px-4 py-2 border-b border-[#e2e8f0] bg-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">TradePro Nexus</span>
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-6 h-6 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-[#0f172a] mb-0.5">Reach Verified Trade Professionals</h3>
          <p className="text-[#64748b] text-sm">Advertising opportunities coming soon</p>
        </div>
        <a
          href="/advertise"
          className="flex-shrink-0 inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Learn More
        </a>
      </div>
    </div>
  );
}
