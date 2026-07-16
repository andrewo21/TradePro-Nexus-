import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function MembershipAgreementPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Legal</p>
        <h1 className="text-2xl font-black text-white mb-2">Membership Agreement</h1>
        <p className="text-slate-500 text-xs mb-8">Last Updated: July 2026 &nbsp;|&nbsp; Effective Date: June 17, 2026</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="1. Agreement to Terms">
            <p className="mb-3">
              This Membership Agreement (&quot;Agreement&quot;) is entered into between TradePro Nexus Inc. (&quot;TradePro
              Nexus,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and you (&quot;Member,&quot; &quot;you,&quot; or &quot;your&quot;) upon your registration on
              tradepronexus.com (the &quot;Platform&quot;).
            </p>
            <p>
              By creating an account or claiming your profile on the Platform you agree to be bound by this
              Agreement and our{" "}
              <Link href="/privacy-policy" className="text-orange-400 hover:text-orange-300 underline">Privacy Policy</Link>.
              If you do not agree to these terms do not create an account.
            </p>
          </Section>

          <Section title="2. Membership and Eligibility">
            <h3 className="font-bold text-slate-200 mb-1">2.1 Eligibility</h3>
            <p className="mb-3">
              To create an account on TradePro Nexus you must be at least 18 years of age, a licensed construction
              trade professional or general contractor, authorized to represent the business you register, and
              located in the United States.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">2.2 Free Membership</h3>
            <p className="mb-3">
              Basic membership on TradePro Nexus is free. Your Trade Card, directory listing, and access to the Live
              Feed are provided at no cost. We reserve the right to introduce paid features in the future with
              advance notice to members.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">2.3 Account Responsibility</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. Notify us immediately at{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>{" "}
              of any unauthorized use of your account.
            </p>
          </Section>

          <Section title="3. Member Content and Conduct">
            <h3 className="font-bold text-slate-200 mb-1">3.1 Accuracy of Information</h3>
            <p className="mb-3">
              You agree to provide accurate, current, and complete information about yourself and your business. You
              agree to maintain and promptly update your information to keep it accurate. TradePro Nexus reserves
              the right to suspend or terminate accounts with inaccurate information.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">3.2 License to Content</h3>
            <p className="mb-3">
              By posting content on the Platform including profile information, photos, and Live Feed posts you
              grant TradePro Nexus a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and
              distribute that content in connection with operating the Platform.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">3.3 Prohibited Conduct</h3>
            <p>
              You agree not to: post false, misleading, or fraudulent information; impersonate another person or
              business; post content that violates any law or regulation; spam or send unsolicited communications to
              other members; attempt to gain unauthorized access to any part of the Platform; use the Platform for
              any illegal purpose.
            </p>
          </Section>

          <Section title="4. Directory Listings">
            <h3 className="font-bold text-slate-200 mb-1">4.1 Public Directory Records</h3>
            <p className="mb-3">
              TradePro Nexus maintains a directory of licensed contractors compiled from public government licensing
              records. These listings may appear in the directory before a contractor claims their profile. Such
              listings contain only publicly available information from official licensing registries.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">4.2 Claimed Profiles</h3>
            <p className="mb-3">
              When you claim your profile you take ownership of your listing and can update, expand, and manage your
              information. Claimed profiles display the information you provide in addition to verified public
              license data.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">4.3 Profile Removal</h3>
            <p>
              You may request removal of your profile at any time by contacting{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>{" "}
              or visiting{" "}
              <a href="/delete-account" className="text-orange-400 hover:text-orange-300 underline">tradepronexus.com/delete-account</a>.
              Removal requests will be processed within 30 days.
            </p>
          </Section>

          <Section title="5. Legacy Member Program">
            <p>
              The first 100 members who create an account and make at least one post on the Live Feed qualify for
              Legacy Member status. Legacy Members receive a verification badge at no cost, which will remain free
              for as long as they maintain an active account in good standing. TradePro Nexus reserves the right to
              modify or discontinue the Legacy Member program with 30 days notice to affected members.
            </p>
          </Section>

          <Section title="6. Verification">
            <p>
              TradePro Nexus may offer verification services in the future that confirm contractor licensing,
              insurance, and bonding information. Verification is separate from free membership. Details of any
              verification program including fees and terms will be disclosed separately before launch. TradePro
              Nexus does not warrant that all information in the directory is accurate or current and verification
              services do not constitute a guarantee of contractor quality or performance.
            </p>
          </Section>

          <Section title="7. Privacy and Member Data">
            <h3 className="font-bold text-slate-200 mb-1">7.1 Privacy Policy</h3>
            <p className="mb-3">
              Your use of the Platform is also governed by our{" "}
              <Link href="/privacy-policy" className="text-orange-400 hover:text-orange-300 underline">Privacy Policy</Link>{" "}
              which is incorporated into this Agreement by reference.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">7.2 Member Data Protection</h3>
            <p className="mb-3">
              TradePro Nexus will not sell or rent your personal information to third party advertisers or data
              brokers without your explicit consent.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">7.3 Business Transfers</h3>
            <p className="mb-3">
              In the event of a merger, acquisition, financing, reorganization, or sale of all or substantially all
              of TradePro Nexus Inc.&apos;s assets, member data may be transferred to the successor entity as part of
              that transaction. Members will be notified by email of any such transfer and provided with choices
              regarding their information. Any successor entity will be bound by the terms of this Agreement with
              respect to member data.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">7.4 Service Providers</h3>
            <p>
              We share member data with third party service providers who assist in operating the Platform including
              email delivery, database hosting, and analytics services. These providers are contractually bound to
              protect member data.
            </p>
          </Section>

          <Section title="8. Intellectual Property">
            <p className="mb-3">
              The Platform and its original content, features, and functionality are owned by TradePro Nexus Inc.
              and are protected by copyright, trademark, and other intellectual property laws. The TradePro Nexus
              name, logo, and tagline are trademarks of TradePro Nexus Inc.
            </p>
            <p>
              Public government licensing data displayed in the directory is not owned by TradePro Nexus and remains
              the property of the respective government agencies.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p className="mb-3">
              THE PLATFORM IS PROVIDED ON AN AS IS AND AS AVAILABLE BASIS WITHOUT WARRANTIES OF ANY KIND. TRADEPRO
              NEXUS DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR FREE, OR FREE OF VIRUSES.
            </p>
            <p className="mb-3">
              TRADEPRO NEXUS DOES NOT VERIFY THE ACCURACY OF CONTRACTOR INFORMATION IN THE DIRECTORY EXCEPT WHERE
              EXPRESSLY STATED AS VERIFIED. GENERAL CONTRACTORS AND OTHER USERS WHO RELY ON DIRECTORY INFORMATION DO
              SO AT THEIR OWN RISK AND ARE RESPONSIBLE FOR CONDUCTING THEIR OWN DUE DILIGENCE.
            </p>
            <p>
              TRADEPRO NEXUS IS NOT A PARTY TO ANY AGREEMENT BETWEEN CONTRACTORS AND GENERAL CONTRACTORS AND IS NOT
              RESPONSIBLE FOR THE QUALITY, SAFETY, OR LEGALITY OF SERVICES PROVIDED BY CONTRACTORS LISTED ON THE
              PLATFORM.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p className="mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TRADEPRO NEXUS INC. SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE
              PLATFORM.
            </p>
            <p>
              IN NO EVENT SHALL TRADEPRO NEXUS&apos;S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO
              THIS AGREEMENT EXCEED THE GREATER OF $100 OR THE AMOUNT YOU PAID TO TRADEPRO NEXUS IN THE 12 MONTHS
              PRECEDING THE CLAIM.
            </p>
          </Section>

          <Section title="11. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless TradePro Nexus Inc. and its officers, directors,
              employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your
              use of the Platform, your violation of this Agreement, or your violation of any rights of another
              party.
            </p>
          </Section>

          <Section title="12. Termination">
            <h3 className="font-bold text-slate-200 mb-1">12.1 By You</h3>
            <p className="mb-3">
              You may terminate your membership at any time by contacting{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>{" "}
              or using the account deletion feature at{" "}
              <a href="/delete-account" className="text-orange-400 hover:text-orange-300 underline">tradepronexus.com/delete-account</a>.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">12.2 By TradePro Nexus</h3>
            <p className="mb-3">
              We reserve the right to suspend or terminate your account at any time for violation of this Agreement,
              fraudulent or illegal activity, or any other reason at our sole discretion with or without notice.
            </p>
            <h3 className="font-bold text-slate-200 mb-1">12.3 Effect of Termination</h3>
            <p>
              Upon termination your right to use the Platform ceases immediately. Provisions of this Agreement that
              by their nature should survive termination will survive.
            </p>
          </Section>

          <Section title="13. Governing Law and Disputes">
            <p>
              This Agreement is governed by the laws of the State of Delaware without regard to its conflict of law
              provisions. Any disputes arising out of or related to this Agreement shall be resolved through binding
              arbitration in accordance with the American Arbitration Association rules. You waive any right to
              participate in class action lawsuits against TradePro Nexus.
            </p>
          </Section>

          <Section title="14. Changes to This Agreement">
            <p>
              We reserve the right to modify this Agreement at any time. We will notify registered members by email
              of any material changes at least 30 days before they take effect. Your continued use of the Platform
              after changes take effect constitutes your acceptance of the revised Agreement.
            </p>
          </Section>

          <Section title="15. Contact">
            <p className="mb-3">For questions about this Agreement contact:</p>
            <p className="text-slate-200">
              TradePro Nexus Inc.
            </p>
            <p className="mt-3">
              Email:{" "}
              <a href="mailto:andrew@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">andrew@tradepronexus.com</a>
            </p>
            <p>tradepronexus.com</p>
            <p>(561) 247-1381</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/privacy-policy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms-of-use" className="hover:text-orange-400 transition-colors">Terms of Use</Link>
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
