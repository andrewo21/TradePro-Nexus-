import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function DocumentPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-6">Document Collection Policy</h1>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl p-4">
            <p className="text-orange-300 font-semibold">We collect documents. We do not authenticate them.</p>
            <p className="text-slate-400 mt-1">TradePro Nexus uses AI to read and extract data from submitted documents. We check for consistency, expiration dates, and required fields. We do not verify that documents are genuine originals or that all information is accurate.</p>
          </div>

          <Section title="What We Collect">
            <ul className="space-y-2">
              {[
                "W9 — used for EIN validation and tax compliance confirmation",
                "Certificate of Insurance (COI) — expiration date tracked, coverage limits read",
                "Bonding certificate — bonding company and capacity extracted",
                "Executed sub agreement — signatures, dollar amount, and date checked for presence",
                "Project references — contact info used to send our 3-question survey",
              ].map(i => <li key={i} className="flex items-start gap-2"><span className="text-slate-500">—</span><span>{i}</span></li>)}
            </ul>
          </Section>

          <Section title="Document Storage">
            <p>All documents are stored encrypted in a private storage bucket. Documents are only accessible to the contractor who submitted them and verified GC subscribers they explicitly connect with. TradePro Nexus staff access documents only for human review of flagged applications.</p>
          </Section>

          <Section title="Document Retention">
            <p>Documents are retained for the duration of your active account plus 12 months. You may request deletion of your documents at any time by contacting support. Deletion of documents does not result in a refund of verification fees.</p>
          </Section>

          <Section title="Fraudulent Documents">
            <p>Submission of fraudulent documentation is grounds for immediate badge revocation, permanent account termination, and forfeiture of all fees. TradePro Nexus reserves the right to report fraudulent submissions to appropriate authorities.</p>
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
