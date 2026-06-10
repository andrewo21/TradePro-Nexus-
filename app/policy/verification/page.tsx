import Navbar from "@/components/Navbar";
import Link from "next/link";
import { VERIFICATION_INELIGIBLE_MESSAGE } from "@/lib/constants";

export default function VerificationProcessPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20 prose prose-invert prose-sm max-w-none">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-2">The Verification Process</h1>
        <p className="text-slate-400 mb-4">Plain English — exactly what we check and what we don't.</p>

        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 mb-8">
          <p className="text-blue-300 text-sm font-semibold">Who can be verified</p>
          <p className="text-slate-300 text-sm mt-1">{VERIFICATION_INELIGIBLE_MESSAGE}</p>
        </div>

        <div className="space-y-8">
          <Section title="What Verification Costs">
            <p>$99 one-time fee. $79 is refunded if your application is denied. Annual renewal required at the same rate — badges expire after 12 months because COIs expire, bonding changes, and references go stale.</p>
          </Section>

          <Section title="Documents We Collect">
            <ul className="space-y-1.5 text-slate-300">
              {["W9 with valid EIN (sole proprietors: SSN)", "Certificate of Insurance (COI) — must be current", "Bonding certificate", "Executed sub agreement — signed, dated, with dollar amount from any project"].map(i => <li key={i}>{i}</li>)}
            </ul>
          </Section>

          <Section title="What Our Bots Check">
            <ul className="space-y-1.5 text-slate-300">
              {["EIN validity", "COI expiration date", "Bonding certificate present and not expired", "Project history — timeframe, cost, scope plausibility", "Sweet spot alignment with submitted projects", "Executed agreement — signatures present, dollar amount present, date present", "Public web scan: lawsuits, judgments, liens, BBB, OSHA, state license boards", "GC/Owner company name on projects — does the company exist?", "Supply house detection — materials vs. labor primary business"].map(i => <li key={i}>{i}</li>)}
            </ul>
          </Section>

          <Section title="References">
            <p>We send a 3-question survey to your provided references. A minimum of 2 of 3 must respond without a red flag. The 3 questions: Did they complete the work? Would you hire them again? Any unresolved disputes? If a reference doesn't respond after two attempts, their application is flagged for human review.</p>
          </Section>

          <Section title="Possible Outcomes">
            <ul className="space-y-1.5 text-slate-300">
              <li><strong className="text-green-400">Clear</strong> — Badge issued automatically. You appear in GC searches.</li>
              <li><strong className="text-yellow-400">Under Review</strong> — Ambiguous results flagged for a human reviewer. Decision within 24–48 hours.</li>
              <li><strong className="text-red-400">Denied</strong> — $79 refunded. Email with reason sent. You may reapply after 90 days.</li>
            </ul>
          </Section>

          <Section title="What We Do NOT Do">
            <ul className="space-y-1.5 text-slate-300">
              {["Issue grades, scores, rankings, or ratings of any kind", "Authenticate contract values — we review for consistency, not accuracy", "Run a comprehensive legal background check", "Verify union affiliation", "Guarantee any contractor's quality of work"].map(i => <li key={i}>{i}</li>)}
            </ul>
          </Section>

          <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl p-4 mt-8">
            <p className="text-orange-300 text-sm font-semibold">The badge means eligible — not rated.</p>
            <p className="text-slate-400 text-sm mt-1">A Verified badge confirms a contractor met our document and reference eligibility criteria at the time of verification. Nothing more. Lack of a badge does not mean a sub is unqualified.</p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/no-grades" className="hover:text-orange-400 transition-colors">No-Grade Policy</Link>
          <Link href="/policy/documents" className="hover:text-orange-400 transition-colors">Document Policy</Link>
          <Link href="/policy/web-scan" className="hover:text-orange-400 transition-colors">Web Scan Disclaimer</Link>
          <Link href="/verify" className="hover:text-orange-400 transition-colors">Start Verification →</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-black text-white mb-3">{title}</h2>
      <div className="text-slate-300 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}
