import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function PlatformDisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-6">Platform Disclaimer</h1>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="What TradePro Nexus Is">
            <p>TradePro Nexus is a verified marketplace connecting Trade Pros, subcontractors, and General Contractors in the commercial construction industry. We collect documents, run automated checks, conduct reference surveys, and issue eligibility badges.</p>
          </Section>

          <Section title="What TradePro Nexus Is NOT">
            <ul className="space-y-2">
              {[
                "Not ISNetworld, Avetta, Browz, or any other prequalification scoring platform",
                "Not an OCIP, CCIP, or wrap-up insurance program",
                "Not a prequalification scoring system — we do not issue scores",
                "Not a legal background check service",
                "Not a bonding or insurance broker",
                "Not a home services rating platform",
                "Not a pay-to-play ranking system",
              ].map(i => <li key={i} className="flex items-start gap-2"><span className="text-red-400 flex-shrink-0">✗</span><span>{i}</span></li>)}
            </ul>
          </Section>

          <Section title="Verification Scope">
            <p>TradePro Nexus verifies eligibility, not quality. A Verified badge means a contractor met our document and reference eligibility criteria at the time of verification — nothing more. Lack of a badge does not mean a sub is unqualified. Verification status does not constitute an endorsement of any contractor's work product, financial health, or legal standing.</p>
          </Section>

          <Section title="Project History Disclaimer">
            <p>Project information submitted by contractors is reviewed for basic consistency and plausibility. TradePro Nexus does not independently audit contract values, confirm scope claims, or authenticate project completion. We reserve the right to request supporting documentation if submitted information appears inconsistent.</p>
          </Section>

          <Section title="No EMR or Safety Score">
            <p>TradePro Nexus does not issue, calculate, or display Experience Modification Rates (EMR), safety scores, or injury rate statistics. We do not make OCIP or CCIP eligibility determinations.</p>
          </Section>

          <Section title="Fraudulent Submissions">
            <p>Submission of fraudulent documentation — including falsified project values, forged signatures, expired or altered certificates — results in immediate badge revocation and permanent removal from the platform. No refund is issued in cases of documented fraud.</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/no-grades" className="hover:text-orange-400 transition-colors">No-Grade Policy</Link>
          <Link href="/policy/documents" className="hover:text-orange-400 transition-colors">Document Policy</Link>
          <Link href="/policy/web-scan" className="hover:text-orange-400 transition-colors">Web Scan Policy</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-black text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}
