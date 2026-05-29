import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function NoGradePolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-6">No-Grade Policy</h1>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-8">
          <p className="text-xl font-black text-white leading-relaxed">
            "We will never issue a grade, score, rank, or rating for any contractor on this platform. Ever."
          </p>
        </div>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <p>TradePro Nexus exists because the construction industry has been burned by platforms that turned prequalification into a profit center — charging contractors to maintain a score, penalizing them with opaque algorithms, and creating a grading system that doesn't reflect real-world performance.</p>

          <p>We built something different. Here's what that means in practice:</p>

          <ul className="space-y-3">
            {[
              "No safety scores. No EMR ratings. No quality grades.",
              "No ranking one sub above another based on a proprietary formula.",
              "No scoring system that advertisers or paying subscribers can influence.",
              "No star ratings. No customer reviews. No performance tiers assigned by us.",
              "The match tiers (Prime, Potential, Local Force) in GC search are capacity indicators based on objective data — bonding capacity, payroll type, crew size relative to a specific project. They are not quality grades.",
              "Verified Pro badge = document and reference eligibility confirmed. Not a quality endorsement.",
              "A contractor without a badge is not less qualified. They simply haven't submitted for verification.",
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5 flex-shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 mt-4">
            <p className="text-blue-300 font-semibold text-sm">This policy is permanent.</p>
            <p className="text-slate-400 text-sm mt-1">It is not subject to revision based on revenue pressure, advertiser requests, or platform growth. If this platform ever issues grades, it has violated its core promise.</p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/disclaimer" className="hover:text-orange-400 transition-colors">Platform Disclaimer</Link>
          <Link href="/policy/verification" className="hover:text-orange-400 transition-colors">Verification Process</Link>
        </div>
      </div>
    </div>
  );
}
