import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Legal</p>
        <h1 className="text-2xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-xs mb-8">Last Updated: July 2026 &nbsp;|&nbsp; Effective Date: June 17, 2026</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="1. Introduction">
            <p className="mb-3">
              TradePro Nexus Inc. (&quot;TradePro Nexus,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates tradepronexus.com and
              related services (the &quot;Platform&quot;). This Privacy Policy explains how we collect, use, disclose, and
              protect information about you when you use our Platform.
            </p>
            <p className="mb-3">
              By using the Platform you agree to the collection and use of information in accordance with this
              policy. If you do not agree with this policy please do not use the Platform.
            </p>
            <p>
              This Privacy Policy applies to all users of the Platform including visitors, registered members, and
              general contractors who search the directory.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="font-bold text-slate-200 mb-1">2.1 Information You Provide</h3>
            <p className="mb-3">
              When you create an account or claim your profile we collect: your name, business name, email address,
              phone number (optional), trade type, city and state, crew size, years of experience, certifications,
              union affiliation, and profile photo if uploaded.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">2.2 Information From Public Records</h3>
            <p className="mb-3">
              TradePro Nexus maintains a directory of licensed contractors compiled from official state and municipal
              government licensing boards, open data portals, and public records requests. This information includes
              business name, license number, license type, license status, city, and state. This data is public
              record and was filed voluntarily by contractors with government licensing authorities.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">2.3 Information Collected Automatically</h3>
            <p className="mb-3">
              When you use the Platform we automatically collect: IP address, browser type, device type, pages
              visited, time spent on pages, referring URLs, and general geographic location derived from IP address.
              We use Google Analytics 4 to collect anonymized usage data.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">2.4 Communications</h3>
            <p>
              We collect email addresses for outreach purposes to notify contractors that their public license
              information is listed in our directory. We also collect email addresses when you create an account or
              contact us.
            </p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>operate and improve the Platform</li>
              <li>display your contractor profile in the directory</li>
              <li>send outreach emails notifying contractors of their free listing</li>
              <li>send transactional and onboarding emails</li>
              <li>respond to your inquiries</li>
              <li>analyze usage patterns to improve the Platform</li>
              <li>comply with legal obligations</li>
              <li>prevent fraud and abuse</li>
            </ul>
            <p className="font-semibold text-slate-200">We do not sell your personal information to third party advertisers or data brokers.</p>
          </Section>

          <Section title="4. How We Share Your Information">
            <h3 className="font-bold text-slate-200 mb-1">4.1 Service Providers</h3>
            <p className="mb-3">
              We share information with third party service providers who assist us in operating the Platform
              including: SendGrid (email delivery), Supabase (database hosting), Vercel (platform hosting), and
              Google Analytics (usage analytics). These providers are contractually obligated to protect your
              information and use it only for the services they provide to us.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">4.2 Public Directory</h3>
            <p className="mb-3">
              Your claimed profile information including business name, trade type, location, certifications, and
              availability status is displayed publicly on the Platform and may be indexed by search engines. You
              control what information appears on your profile.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">4.3 Legal Requirements</h3>
            <p className="mb-3">
              We may disclose your information if required to do so by law or in response to valid requests by
              public authorities including courts and government agencies.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">4.4 Business Transfers</h3>
            <p className="mb-3">
              If TradePro Nexus Inc. is involved in a merger, acquisition, asset sale, financing, reorganization, or
              sale of all or substantially all of our assets, your information may be transferred as part of that
              transaction. We will notify you via email and a prominent notice on the Platform of any such change in
              ownership or use of your personal information, and of any choices you may have regarding your
              information. This business transfer provision applies to both public directory records and registered
              member data.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">4.5 Consent</h3>
            <p>We may share your information with third parties when you have given us your explicit consent to do so.</p>
          </Section>

          <Section title="5. California Privacy Rights (CCPA)">
            <p className="mb-3">
              If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with
              specific rights regarding your personal information.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">5.1 Right to Know</h3>
            <p className="mb-3">
              You have the right to request that we disclose what personal information we collect, use, disclose,
              and sell about you.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">5.2 Right to Delete</h3>
            <p className="mb-3">
              You have the right to request that we delete personal information we have collected from you, subject
              to certain exceptions.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">5.3 Right to Opt-Out</h3>
            <p className="mb-3">
              TradePro Nexus does not sell personal information as defined under CCPA. We do not sell your personal
              data to third parties for monetary consideration.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">5.4 Right to Non-Discrimination</h3>
            <p className="mb-3">We will not discriminate against you for exercising any of your CCPA rights.</p>
            <h3 className="font-bold text-slate-200 mb-1">5.5 How to Submit a Request</h3>
            <p className="mb-3">
              To exercise your California privacy rights contact us at:{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>{" "}
              or submit a request through{" "}
              <a href="/delete-account" className="text-orange-400 hover:text-orange-300 underline">tradepronexus.com/delete-account</a>.
              We will respond to verifiable consumer requests within 45 days.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">5.6 Public Records Data</h3>
            <p>
              Please note that contractor information compiled from government licensing registries constitutes
              public record information. CCPA provides limited protections for information that is lawfully made
              available from government records.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p className="mb-3">
              We retain your personal information for as long as your account is active or as needed to provide you
              services. If you request deletion of your account we will delete your personal information within 30
              days except where we are required to retain it by law.
            </p>
            <p>
              Public directory records compiled from government licensing boards are retained as long as the
              underlying license information remains a matter of public record.
            </p>
          </Section>

          <Section title="7. Data Security">
            <p className="mb-3">
              We implement industry standard security measures to protect your information including: HTTPS
              encryption for all data in transit, AES-256 encryption for data at rest through our hosting provider,
              password hashing using bcrypt, and regular security audits of our database access controls.
            </p>
            <p>
              No method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee
              absolute security of your information.
            </p>
          </Section>

          <Section title="8. Your Rights and Choices">
            <h3 className="font-bold text-slate-200 mb-1">8.1 Account Information</h3>
            <p className="mb-3">
              You may update or correct your profile information at any time by logging into your account at
              tradepronexus.com.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">8.2 Unsubscribe</h3>
            <p className="mb-3">
              You may opt out of outreach emails at any time by clicking the unsubscribe link in any email we send.
              You may also opt out by emailing{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">8.3 Profile Removal</h3>
            <p className="mb-3">
              If your business information appears in our public directory and you wish to have it removed contact
              us at{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>.
              We will remove your listing within 30 days. Note that underlying license information is public record
              and may appear in other directories.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">8.4 Account Deletion</h3>
            <p>
              You may request deletion of your account at{" "}
              <a href="/delete-account" className="text-orange-400 hover:text-orange-300 underline">tradepronexus.com/delete-account</a>.
              We will process deletion requests within 30 days.
            </p>
          </Section>

          <Section title="9. Cookies and Tracking">
            <p className="mb-3">
              We use cookies and similar tracking technologies to track activity on our Platform and hold certain
              information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being
              sent.
            </p>
            <p>
              We use Google Analytics 4 which uses cookies to collect anonymized usage data. You can opt out of
              Google Analytics by installing the Google Analytics opt-out browser add-on.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              The Platform is not directed to children under the age of 18. We do not knowingly collect personal
              information from children under 18. If you become aware that a child has provided us with personal
              information please contact us at{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>.
            </p>
          </Section>

          <Section title="11. Changes to This Privacy Policy">
            <p className="mb-3">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the
              new Privacy Policy on this page and updating the Last Updated date. We will notify registered members
              by email of any material changes.
            </p>
            <p>
              Your continued use of the Platform after any changes constitutes your acceptance of the new Privacy
              Policy.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p className="mb-3">If you have any questions about this Privacy Policy please contact us:</p>
            <p className="text-slate-200">
              TradePro Nexus Inc.<br />
              Babcock Ranch, FL
            </p>
            <p className="mt-3">
              Email:{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>
            </p>
            <p>Phone: (561) 247-1381</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/terms-of-use" className="hover:text-orange-400 transition-colors">Terms of Use</Link>
          <Link href="/membership-agreement" className="hover:text-orange-400 transition-colors">Membership Agreement</Link>
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
