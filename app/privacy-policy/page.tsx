import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Legal</p>
        <h1 className="text-2xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-xs mb-8">Effective as of June 16, 2026</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <p>
            This Privacy Policy (&quot;Policy&quot;) applies to www.tradepronexus.com, and Tradepro Technologies LLC
            (&quot;Company&quot;) and governs data collection and usage. For the purposes of this Policy, unless otherwise
            noted, all references to the Company include www.tradepronexus.com, TradePro Technologies LLC,
            www.tradeprotech.ai, and www.tradepronexus.com. The Company website is a social media site. By using
            the Company website, you consent to the data practices described in this statement.
          </p>

          <Section title="I. Collection of Your Personal Information">
            <p className="mb-3">
              In order to better provide you with products and services offered, the Company may collect personally
              identifiable information, such as your:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>First and last name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Employer</li>
              <li>Job title</li>
            </ul>
            <p className="mb-3">
              If you purchase the Company&apos;s products and services, we collect billing and credit card information.
              This information is used to complete the purchase transaction.
            </p>
            <p className="mb-3">
              Please keep in mind that if you directly disclose personally identifiable information or personally
              sensitive data through the Company&apos;s public message boards, this information may be collected and
              used by others.
            </p>
            <p>
              We do not collect any personal information about you unless you voluntarily provide it to us. However,
              you may be required to provide certain personal information to us when you elect to use certain
              products or services. These may include: (a) registering for an account; (b) entering a sweepstakes or
              contest sponsored by us or one of our partners; (c) signing up for special offers from selected third
              parties; (d) sending us an email message; (e) submitting your credit card or other payment information
              when ordering and purchasing products and services. To wit, we will use your information for, but not
              limited to, communicating with you in relation to services and/or products you have requested from us.
              We may also gather additional personal or non-personal information in the future.
            </p>
          </Section>

          <Section title="II. Use of Your Personal Information">
            <p className="mb-3">The Company collects and uses your personal information in the following ways:</p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>to operate and deliver the services you have requested.</li>
              <li>to provide you with information, products, or services that you request from us.</li>
              <li>to provide you with notices about your account.</li>
              <li>
                to carry out the Company&apos;s obligations and enforce our rights arising from any contracts entered
                into between you and us, including for billing and collection.
              </li>
              <li>
                to notify you about changes to our www.tradepronexus.com or any products or services we offer or
                provide through it.
              </li>
              <li>to maintain the security of the Company&apos;s services and prevent fraud or misuse.</li>
              <li>to comply with applicable laws, regulations, legal processes, or governmental requests.</li>
              <li>to support our core purpose of connecting businesses — not for internal use or sale of your information.</li>
              <li>in any other way we may describe when you provide the information.</li>
              <li>for any other purpose with your consent.</li>
            </ul>
            <p>
              The Company may also use your personally identifiable information to inform you of other products or
              services available from the Company and its affiliates.
            </p>
          </Section>

          <Section title="III. Sharing Information with Third Parties">
            <p className="mb-3">The Company does not sell, rent, or lease its customer lists to third parties.</p>
            <p className="mb-3">
              The Company may, from time to time, contact you on behalf of external business partners about a
              particular offering that may be of interest to you. In those cases, your unique personally identifiable
              information (email, name, address, phone number) is not transferred to the third party.
            </p>
            <p className="mb-3">The Company does not sell biometric data to third parties.</p>
            <p className="mb-3">
              The Company may share data with trusted partners to help perform statistical analysis, send you email
              or postal mail, provide customer support, or arrange for deliveries. All such third parties are
              prohibited from using your personal information except to provide these services to the Company, and
              they are required to maintain the confidentiality of your information.
            </p>
            <p>
              The Company may disclose your personal information, without notice, if required to do so by law or in
              the good faith belief that such action is necessary to: (a) conform to the edicts of the law or comply
              with legal process served on the Company or the site; (b) protect and defend the rights or property of
              the Company; and/or (c) act under exigent circumstances to protect the personal safety of users of the
              Company, or the public.
            </p>
          </Section>

          <Section title="IV. Opt-Out of Sale or Disclosure of Personal Information">
            <p>
              You have the right under the California Consumer Privacy Act of 2018 (CCPA) and certain other privacy
              and data protection laws, as applicable, to opt out of the sale or disclosure of your personal
              information. If you exercise your right to opt out of the sale or disclosure of your personal
              information, we will refrain from selling or disclosing your personal information, unless you
              subsequently provide express authorization for the sale or disclosure of your personal information. To
              opt out of the sale or disclosure of your personal information, contact us at{" "}
              <a href="mailto:support@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">
                support@tradepronexus.com
              </a>.
            </p>
          </Section>

          <Section title="V. Tracking User Behavior">
            <p>
              The Company may keep track of the websites and pages our users visit within the Company, in order to
              determine which of the Company&apos;s services are the most popular. This data is used to deliver
              customized content and advertising within the Company to customers whose behavior indicates that they
              are interested in a particular subject area.
            </p>
          </Section>

          <Section title="VI. Automatically Collected Information">
            <p>
              The Company may automatically collect information about your computer hardware and software. This
              information can include your IP address, browser type, domain names, access times, and referring
              website addresses. This information is used for the operation of the service, to maintain the quality
              of the service, and to provide general statistics regarding the use of the Company website.
            </p>
          </Section>

          <Section title="VII. Links">
            <p>
              This website contains links to other sites. Please be aware that we are not responsible for the content
              or privacy practices of such other sites. We encourage our users to be aware when they leave our site
              and to read the privacy statements of any other site that collects personally identifiable information.
            </p>
          </Section>

          <Section title="VIII. Security of Your Personal Information">
            <p className="mb-3">
              The Company secures your personal information from unauthorized access, use, or disclosure. The
              Company uses the following methods for this purpose:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>SSL Protocol</li>
            </ul>
            <p className="mb-3">
              When personal information (such as a credit card number) is transmitted to other websites, it is
              protected through the use of encryption, such as the Secure Sockets Layer (SSL) protocol.
            </p>
            <p>
              We strive to take appropriate security measures to protect against unauthorized access to or alteration
              of your personal information. Unfortunately, no data transmission over the Internet or any wireless
              network can be guaranteed to be 100 percent secure. As a result, while we strive to protect your
              personal information, you acknowledge that: (a) there are security and privacy limitations inherent to
              the Internet that are beyond our control; and (b) the security, integrity, and privacy of any and all
              information and data exchanged between you and us through this site cannot be guaranteed.
            </p>
          </Section>

          <Section title="IX. Right to Deletion">
            <p className="mb-3">
              Subject to certain exceptions set out below, on receipt of a verifiable request from you, we will:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Delete your personal information from our records; and</li>
              <li>Direct any service providers to delete your personal information from their records.</li>
            </ul>
            <p className="mb-3">
              Please note that we may not be able to comply with requests to delete your personal information if it
              is necessary to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Complete the transaction for which the personal information was collected, fulfill the terms of a
                written warranty or product recall conducted in accordance with federal law, and provide a good or
                service requested by you, or reasonably anticipated within the context of our ongoing business
                relationship with you, or otherwise perform a contract between you and us;
              </li>
              <li>
                Detect security incidents, protect against malicious, deceptive, fraudulent, or illegal activity; or
                prosecute those responsible for that activity;
              </li>
              <li>Debug to identify and repair errors that impair existing intended functionality;</li>
              <li>
                Exercise free speech, ensure the right of another consumer to exercise his or her right of free
                speech, or exercise another right provided for by law;
              </li>
              <li>Comply with the California Electronic Communications Privacy Act;</li>
              <li>
                Engage in public or peer-reviewed scientific, historical, or statistical research in the public
                interest that adheres to all other applicable ethics and privacy laws, when our deletion of the
                information is likely to render impossible or seriously impair the achievement of such research,
                provided we have obtained your informed consent;
              </li>
              <li>Enable solely internal uses that are reasonably aligned with your expectations based on your relationship with us;</li>
              <li>Comply with an existing legal obligation; or</li>
              <li>Otherwise, use your personal information internally in a lawful manner that is compatible with the context in which you provided the information.</li>
            </ul>
          </Section>

          <Section title="X. Children Under 13">
            <p>
              The Company does not knowingly collect personally identifiable information from children under the age
              of thirteen. If you are under the age of 13, you must ask your parent or guardian for permission to use
              this platform.
            </p>
          </Section>

          <Section title="XI. Email Communications">
            <p className="mb-3">
              From time to time, the Company may contact you via email for the purpose of providing announcements,
              promotional offers, alerts, confirmations, surveys, and/or other general communication. In order to
              improve our services, we may receive a notification when you open an email from the Company or click on
              a link therein.
            </p>
            <p>
              If you would like to stop receiving marketing or promotional communications via email from the Company,
              you may opt out of such communications by clicking unsubscribe.
            </p>
          </Section>

          <Section title="XII. External Data Storage Sites">
            <p>We may store your data on servers provided by third-party hosting vendors with whom we have contracted.</p>
          </Section>

          <Section title="XIII. Changes to This Statement">
            <p>
              The Company reserves the right to change this Policy from time to time. For example, when there are
              changes in our services, changes in our data protection practices, or changes in the law. When changes
              to this Policy are significant, we will inform you. You may receive a notice by sending an email to the
              primary email address specified in your account, by placing a prominent notice on our website, and/or
              by updating any privacy information. Your continued use of the website and/or services available after
              such modifications will constitute your: (a) acknowledgment of the modification of this Policy; and (b)
              agreement to abide and be bound by this modified Policy.
            </p>
          </Section>

          <Section title="XIV. Annual Update">
            <p>
              The Company shall review and update its Policy at least annually to ensure that it remains accurate,
              complete, and consistent with applicable law and the Company&apos;s current personal data processing
              practices, in accordance with Fla. Stat. § 501.711(1).
            </p>
          </Section>

          <Section title="XV. Contact Information">
            <p className="mb-3">
              The Company welcomes your questions or comments regarding this Statement of Privacy. If you believe that
              the Company has not adhered to this Statement, please contact the Company at:
            </p>
            <p className="text-slate-200">
              Tradepro Technologies LLC<br />
              17629 Fallen Branch Way<br />
              Punta Gorda, Florida 33982
            </p>
            <p className="mt-3">
              Email Address:{" "}
              <a href="mailto:support@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">
                support@tradepronexus.com
              </a>
            </p>
            <p>Phone number: 561-247-1381</p>
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
