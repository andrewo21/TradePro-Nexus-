import Navbar from "@/components/Navbar";
import { ShieldCheck, HardHat, Building2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">How It Works</p>
        <h1 className="text-2xl font-black text-white mb-2">TradePro Nexus — How Verification Works</h1>
        <p className="text-slate-400 mb-10">A transparent look at what happens from signup to badge.</p>

        <div className="space-y-6 mb-12">
          {[
            { num: "01", icon: HardHat, title: "Build Your Digital Trade Card", body: "Create your free profile — trade, experience, location, crew size, and availability. This is your public capability statement, visible to GCs browsing the platform. Free forever, no subscription." },
            { num: "02", icon: ShieldCheck, title: "Submit for Verification ($99)", body: "Upload your W9, COI, bonding certificate, and an executed sub agreement. Our AI reads and extracts key data. You also provide 3 project references — we survey them directly." },
            { num: "03", icon: CheckCircle, title: "Automated Checks Run", body: "Our system checks EIN validity, COI expiration, bonding status, project history consistency, and runs a public web scan (lawsuits, liens, BBB, OSHA, state license boards). Supply houses are detected and redirected to advertising." },
            { num: "04", icon: CheckCircle, title: "Human Review (if flagged)", body: "Ambiguous results go to a human reviewer — not an algorithm. You get a decision within 24–48 hours. Clear results are approved automatically." },
            { num: "05", icon: ShieldCheck, title: "Badge Issued or Application Denied", body: "Clear applications receive the Verified Pro badge immediately. Denied applications receive a $79 refund (we keep $20 for processing). You may reapply after 90 days with updated documents." },
            { num: "06", icon: Building2, title: "Appear in GC Searches", body: "Verified contractors appear in GC Find Crews searches. Unverified contractors can still post to the feed and have a public Trade Card — they just don't appear in paid GC search results." },
          ].map(step => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-600/20 border border-orange-600/40 rounded-lg flex items-center justify-center">
                  <span className="text-orange-400 text-xs font-black">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-black text-white mb-1">{step.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-8">
          <h2 className="font-black text-white mb-3">Annual Renewal</h2>
          <p className="text-slate-300 text-sm">Verification expires after 12 months. COIs expire, bonding changes, and references go stale. Annual renewal ensures the badge reflects current status. You'll receive reminders 30 days, 7 days, and the day of expiration.</p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-8 border-t border-slate-800">
          <Link href="/policy/verification" className="hover:text-orange-400 transition-colors">Full Verification Policy</Link>
          <Link href="/policy/no-grades" className="hover:text-orange-400 transition-colors">No-Grade Policy</Link>
          <Link href="/verify" className="hover:text-green-400 transition-colors">Start Verification →</Link>
        </div>
      </div>
    </div>
  );
}
