import Navbar from "@/components/Navbar";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

const CREATIVE_REQUIREMENTS = [
  "Dark navy or neutral background — must read on #0f172a",
  "Clean, readable typography — no decorative or script fonts",
  "No animated GIFs or video autoplay",
  "No countdown timers, urgency CTAs, or 'LIMITED TIME' language",
  "No fake notifications, fake verified badges, or mock UI elements",
  "Clearly labeled 'Sponsored' — label must be visible without zooming",
  "Verified Pro badge may never appear in ad creative",
  "No references to specific contractors, sub pricing, or bid amounts",
  "CTA button must be descriptive — no 'Click Here' or 'Learn More' alone",
];

const CONTENT_STANDARDS = [
  "Advertiser must be a natural fit for the construction audience",
  "No competitor platforms (ISNetworld, Avetta, Browz, similar)",
  "No financial services that target contractors in distress",
  "No misleading claims about your product or service",
  "No political content of any kind",
  "No content that implies a supply house is a verified contractor",
];

export default function AdvertiserGuidelinesPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Advertising</p>
        <h1 className="text-2xl font-black text-white mb-2">Advertiser Guidelines</h1>
        <p className="text-slate-400 mb-10">Required reading before any placement purchase. Non-compliant creative is rejected — no exceptions.</p>

        <div className="space-y-8">
          <Section title="The Standard">
            <p className="text-slate-300 text-sm leading-relaxed">TradePro Nexus maintains a single design language across the entire platform — dark navy, clean typography, no noise. Advertising must match this standard. If your creative looks like a banner ad, it will be rejected. If it looks like a natural part of the feed, we'll run it.</p>
            <p className="text-slate-400 text-sm mt-2">The goal is advertising that earns attention — not advertising that demands it.</p>
          </Section>

          <Section title="Creative Requirements">
            <div className="space-y-2">
              {CREATIVE_REQUIREMENTS.map(r => (
                <div key={r} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" /> {r}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Content Standards">
            <div className="space-y-2">
              {CONTENT_STANDARDS.map(r => (
                <div key={r} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" /> {r}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Approval Process">
            <p className="text-slate-300 text-sm leading-relaxed">All creative is reviewed before it runs. Turnaround is 1–2 business days. Rejected creative receives specific feedback — you may resubmit once. Second rejection ends the placement. No refund is issued for rejected creative after two attempts.</p>
          </Section>

          <Section title="Right to Reject">
            <p className="text-slate-300 text-sm leading-relaxed">TradePro Nexus reserves the right to reject any creative at any time for any reason, including creative that technically meets guidelines but feels inconsistent with platform standards. This is a judgment call we make in favor of the user experience.</p>
          </Section>

          <Section title="Placement Rules">
            <ul className="space-y-2 text-sm text-slate-300">
              <li>— Sponsored cards never appear in contractor search results</li>
              <li>— Maximum one placement type per advertiser per 30 days</li>
              <li>— Rate card pricing is flat — no negotiation, no discounts</li>
              <li>— Billing is monthly in advance, no proration</li>
            </ul>
          </Section>
        </div>

        <div className="mt-10 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <p className="text-white font-bold mb-2">Ready to Advertise?</p>
          <p className="text-slate-400 text-sm mb-4">Contact us for rates, audience data, and ad specs. We'll confirm your brand is a natural fit before discussing placements.</p>
          <Link href="/advertise" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors">Contact Sales</Link>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/supply-house" className="hover:text-orange-400 transition-colors">Supply House Policy</Link>
          <Link href="/advertise" className="hover:text-orange-400 transition-colors">View Placements</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-base font-black text-white mb-4">{title}</h2>{children}</div>;
}
