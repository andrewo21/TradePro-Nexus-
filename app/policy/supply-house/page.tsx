import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function SupplyHousePolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-6">Supply House & Vendor Policy</h1>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-8">
          <p className="text-white font-bold mb-2">The Test: What's on your invoice mostly — materials or labor?</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3">
              <p className="text-red-400 font-semibold text-sm">Materials mostly</p>
              <p className="text-slate-400 text-xs mt-1">= Supply house = paid advertising only</p>
            </div>
            <div className="bg-green-950/30 border border-green-800/40 rounded-lg p-3">
              <p className="text-green-400 font-semibold text-sm">Labor mostly</p>
              <p className="text-slate-400 text-xs mt-1">= Subcontractor = verification path</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="Supply Houses and Material Distributors">
            <p>Pure supply houses are welcome on TradePro Nexus — as advertisers, not verified contractors. Supply houses may purchase in-feed ad cards and desktop rail placements. They do not appear in contractor search results and are not eligible for the Verified Pro badge.</p>
            <p className="mt-2">This includes supply houses with installation programs (e.g., Marjam, Home Depot Pro). If your primary revenue is materials sales, you are a supply house for purposes of this policy.</p>
          </Section>

          <Section title="Detection">
            <p>Our verification system automatically detects supply houses during the application process using website content scanning, Google Business category analysis, and contractor license lookups. Detected supply houses receive an automatic redirect:</p>
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 mt-3 italic text-slate-400">
              "Based on your business profile, TradePro Nexus has determined your primary business may be materials distribution. Verified contractor status is not available for supply houses. Please contact us about advertising opportunities."
            </div>
          </Section>

          <Section title="The Line Is Non-Negotiable">
            <p>No supply house receives a Verified badge regardless of advertising spend. No amount of advertising revenue changes this policy. The line between verified contractor and advertiser is the integrity of the platform — it is never crossed.</p>
          </Section>

          <Section title="Hybrid Businesses">
            <p>If your primary business is labor and crews on the jobsite, but you also supply some materials, you may apply for contractor verification. The determining question is: what's the majority of your revenue? Labor-primary businesses are eligible for verification. Material-primary businesses are not.</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/advertise" className="hover:text-orange-400 transition-colors">Advertise on TradePro Nexus</Link>
          <Link href="/advertise/guidelines" className="hover:text-orange-400 transition-colors">Advertiser Guidelines</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-base font-black text-white mb-3">{title}</h2>{children}</div>;
}
