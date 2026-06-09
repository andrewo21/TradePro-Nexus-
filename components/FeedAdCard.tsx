// In-feed sponsored card — appears every 5-6 posts.
// Design: same card language as feed posts, dark navy, clearly labeled Sponsored.
// No verified badge, no aggressive CTAs. Roadmap ad standard: elegant only.

interface FeedAdProps {
  headline: string;
  body: string;
  cta: string;
  ctaUrl: string;
  sponsor: string;
  category?: string;
}

// Placeholder ads shown before real advertiser inventory is sold.
// Real ads will come from an ads table; this component accepts the same shape.
const PLACEHOLDER_ADS: FeedAdProps[] = [
  {
    sponsor: "Advertise Here",
    category: "Supply House",
    headline: "Reach Verified Trade Pros & GCs",
    body: "Your brand in front of bonded subs, lead foremen, and GC decision-makers. Flat monthly rate — no bidding, no algorithm.",
    cta: "View Advertising Rates",
    ctaUrl: "/advertise",
  },
  {
    sponsor: "Advertise Here",
    category: "Tool & Equipment",
    headline: "The Crew That Builds Finds Their Tools Here",
    body: "Construction workers trust what other construction workers use. Reach them where they share their work.",
    cta: "Advertise on TradePro Nexus",
    ctaUrl: "/advertise",
  },
];

export default function FeedAdCard({ index }: { index: number }) {
  const ad = PLACEHOLDER_ADS[index % PLACEHOLDER_ADS.length];

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#e2e8f0] bg-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sponsored</span>
        <span className="text-[10px] text-slate-400">{ad.category}</span>
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-400 mb-1 font-semibold">{ad.sponsor}</p>
        <h3 className="text-base font-black text-[#0f172a] mb-2">{ad.headline}</h3>
        <p className="text-[#475569] text-sm mb-4 leading-relaxed">{ad.body}</p>
        <a
          href={ad.ctaUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200"
        >
          {ad.cta}
        </a>
      </div>
    </div>
  );
}
