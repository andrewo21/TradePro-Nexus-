import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-2">Terms of Service</h1>
        <p className="text-slate-400 mb-8">Placeholder — full terms will be published before launch.</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="Overview">
            <p>These Terms of Service govern your access to and use of TradePro Nexus. By creating an account or using the platform, you agree to these terms. This page is a placeholder and will be replaced with complete, legally reviewed terms before public launch.</p>
          </Section>

          <Section title="Accounts">
            <p>You are responsible for maintaining the accuracy of your profile or company information and for safeguarding your account credentials.</p>
          </Section>

          <Section title="Acceptable Use">
            <p>You agree not to submit false information, impersonate another person or business, or use the platform for any unlawful purpose.</p>
          </Section>

          <Section title="Verification & Badges">
            <p>Verification badges and engagement badges are subject to the eligibility rules described in our <Link href="/policy/verification" className="text-orange-400 hover:text-orange-300 underline">Verification Process policy</Link>. TradePro Nexus reserves the right to revoke any badge at its discretion.</p>
          </Section>

          <Section title="Changes">
            <p>We may update these terms from time to time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/privacy-policy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
          <Link href="/policy/disclaimer" className="hover:text-orange-400 transition-colors">Platform Disclaimer</Link>
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
