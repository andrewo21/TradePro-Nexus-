import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function WebScanPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-6">Web Scan Disclaimer</h1>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-8">
          <p className="text-slate-300 text-sm">Our web scan is a basic public records search — not a comprehensive legal background check. It searches publicly available information. It does not access sealed records, criminal databases, credit reports, or any non-public data source.</p>
        </div>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="What the Scan Covers">
            <ul className="space-y-2">
              {["Public court records — lawsuits and judgments in public search results", "Mechanics liens — publicly filed", "BBB complaint summaries", "OSHA violation history (OSHA public data portal)", "State contractor license board disciplinary actions", "Basic fraud-related news and press coverage", "Supply house vs. contractor detection — website content, business category"].map(i => <li key={i} className="flex items-start gap-2"><span className="text-slate-500">—</span><span>{i}</span></li>)}
            </ul>
          </Section>

          <Section title="What the Scan Does NOT Cover">
            <ul className="space-y-2">
              {["Criminal background checks", "Credit history or financial records", "Sealed or expunged court records", "Private business records", "Comprehensive lien search across all jurisdictions", "Employment verification"].map(i => <li key={i} className="flex items-start gap-2"><span className="text-red-400 flex-shrink-0">✗</span><span>{i}</span></li>)}
            </ul>
          </Section>

          <Section title="Scan Limitations">
            <p>Public records are incomplete and vary by jurisdiction. A clean web scan result does not guarantee absence of legal history — it means our basic public search found no flags. GCs should conduct their own due diligence before awarding contracts.</p>
          </Section>

          <Section title="How Results Affect Verification">
            <p>Significant flags — active lawsuits, multiple filed liens, OSHA willful violations, license board suspensions — trigger human review rather than automatic denial. A single minor finding typically does not prevent verification. Our reviewers use judgment, not automated scoring.</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/verification" className="hover:text-orange-400 transition-colors">Verification Process</Link>
          <Link href="/policy/disclaimer" className="hover:text-orange-400 transition-colors">Platform Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-base font-black text-white mb-3">{title}</h2>{children}</div>;
}
