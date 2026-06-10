import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Policy</p>
        <h1 className="text-2xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Placeholder — full privacy policy will be published before launch.</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="Overview">
            <p>This Privacy Policy describes how TradePro Nexus collects, uses, and protects information submitted by Trade Pros, subcontractors, and General Contractors. This page is a placeholder and will be replaced with a complete, legally reviewed policy before public launch.</p>
          </Section>

          <Section title="Information We Collect">
            <p>Account information (name, email, phone), Trade Card and company profile details, uploaded documents (such as W9, COI, bonding, and license records) for verification purposes, and usage data such as posts and connections made on the platform.</p>
          </Section>

          <Section title="How We Use Information">
            <p>We use collected information to operate the platform, process verification applications, connect Trade Pros with General Contractors, and communicate important account and policy updates.</p>
          </Section>

          <Section title="Document Handling">
            <p>Verification documents are stored securely and accessible only to TradePro Nexus and the document owner. See our <Link href="/policy/documents" className="text-orange-400 hover:text-orange-300 underline">Document Policy</Link> for details.</p>
          </Section>

          <Section title="Your Choices">
            <p>You may update or delete your profile information at any time from your account settings. Contact us to request deletion of your account and associated data.</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/policy/terms-of-service" className="hover:text-orange-400 transition-colors">Terms of Service</Link>
          <Link href="/policy/documents" className="hover:text-orange-400 transition-colors">Document Policy</Link>
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
