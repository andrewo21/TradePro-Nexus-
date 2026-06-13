import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function MembershipAgreementPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Legal</p>
        <h1 className="text-2xl font-black text-white mb-2">Membership Agreement</h1>
        <p className="text-slate-500 text-xs mb-8">Effective as of June 16, 2026</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <p>
            This Membership Agreement (&quot;Agreement&quot;) is effective as of June 16, 2026 (&quot;Effective Date&quot;) by and
            between Tradepro Nexus, accessed via www.tradepronexus.com with a business address of 17629 Fallen Branch
            Way, Punta Gorda, Florida 33982 (&quot;Community&quot;), and all current and future members of Tradepro Nexus
            (&quot;Member&quot;).
          </p>
          <p>
            By accessing, browsing, or using the www.tradepronexus.com website or by selecting &quot;I accept&quot; during
            membership registration, you represent that you have read, understood, and agree to be bound by the terms
            and conditions of this Agreement.
          </p>

          <Section title="Nature of the Service">
            <p className="mb-3">
              The Community is a social network that facilitates the exchange of personal information between people.
              This socialization shall include reading the profile pages of other members and possibly even
              contacting them. The Community provides its Members with benefits such as, but not exclusive to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Free Trade Card profile — build and showcase your professional identity, trade specialties, certifications, and availability</li>
              <li>Live Feed — post updates, share project work, and connect with other trade professionals</li>
              <li>Directory listing — be discovered by general contractors and project managers searching for qualified crews</li>
              <li>Available for Work toggle — signal to GCs that you are actively seeking new opportunities</li>
              <li>Union profile features — display union affiliation, local number, journeyman status, and prevailing wage eligibility</li>
              <li>Work Opportunities — access to job postings and union opportunities</li>
              <li>Badge and reward system — earn recognition for engagement and profile completion</li>
              <li>Industry news feed — curated construction industry news and updates</li>
              <li>Verified badge — available through the paid verification process for subcontracting businesses</li>
              <li>Cross-platform access — connect your TradePro Tech resume directly to your Nexus profile</li>
            </ul>
            <p>The Community works like an online community of internet users.</p>
          </Section>

          <Section title="User Registration and Information">
            <p>
              The Member shall fill in the correct information requested in the User Registration form on the site.
              The Member shall be required to promptly update the User Information on the site. The Member shall
              select a username and password during the User Registration process. The Member shall be responsible
              for: a) all use of the site made by the Member&apos;s username and password, and b) maintaining the
              confidentiality of the Member&apos;s username and password.
            </p>
          </Section>

          <Section title="Content">
            <p>
              The content includes messages and other materials posted to forums, groups, or other locations on the
              site by the members of the Community. The Members of the Community are deemed to grant the Community the
              nonexclusive right to post, display, copy, and modify the content in connection with the operation of the
              site and the Community&apos;s business. Further, the Member is deemed to grant the Community the
              nonexclusive right to post, display, copy, and sell the content within the limitations set by the Member
              during the online publishing process. Member is also deemed to authorize the Community to disclose their
              personal data when the Member includes such personal data in the content.
            </p>
          </Section>

          <Section title="Privacy">
            <p>
              The Community shall not sell or rent Members&apos; personal information to third parties without Members&apos;
              explicit consent. The Community shall store and process the Members&apos; information on computers located
              in the United States that are protected by physical and technological security devices. However, the
              Community shall be permitted to access and modify the Members&apos; information.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              The Member agrees to indemnify and hold harmless the Community from all claims, losses, expenses, fees,
              including attorney fees, costs, and judgments that may be asserted against the Community that result from
              the acts or omissions of the Member and their employees, agents, or representatives.
            </p>
          </Section>

          <Section title="No Agency">
            <p>
              No agency, partnership, joint venture, employee-employer, or franchiser-franchisee relationship is
              intended or created by this Agreement.
            </p>
          </Section>

          <Section title="Terminating Membership">
            <p>
              The Member may choose to retire or delete the published content from the Community&apos;s site, and it will
              no longer be available or visible to other visitors. Terms regarding the status of the uploaded content
              will remain applicable when the Member chooses to terminate the membership. Contents posted to the site
              other than the published content will not be deleted or retired as a result of the Member&apos;s termination.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              Under no circumstance shall either party be liable to the other party or any third party for indirect,
              incidental, consequential, special or exemplary damages (even if that party has been advised of the
              possibility of such damages), arising from any provision of this Agreement such as, but not limited to,
              loss of revenue or anticipated profit or lost business, cost of delay or failure of delivery, or
              liabilities to third parties arising from any source.
            </p>
          </Section>

          <Section title="Alternative Dispute Resolution">
            <p className="mb-3">
              The parties will attempt to resolve any dispute arising out of or relating to this Agreement through
              friendly negotiations among the parties. If the matter is not resolved by negotiation, the parties will
              resolve the dispute using the below Alternative Dispute Resolution (&quot;ADR&quot;) procedure.
            </p>
            <p>
              If any controversies, claims, or disputes arising out of or relating to this Agreement cannot be resolved
              through negotiation, the parties agree to try in good faith to settle the dispute by mediation in
              accordance with any statutory rules of mediation. If mediation is unavailable or unsuccessful in
              resolving the entire dispute, any outstanding issues will be submitted to final and binding arbitration
              under the rules of the American Arbitration Association. The parties shall select a mutually acceptable
              arbitrator knowledgeable about issues relating to the subject matter of this Agreement. The arbitrator&apos;s
              award will be final, and any court with proper jurisdiction may enter judgment upon it. During the
              continuance of any arbitration proceeding, the parties shall continue to perform their respective
              obligations under this Agreement.
            </p>
          </Section>

          <Section title="Entire Agreement">
            <p>
              This Agreement contains the entire agreement of the parties with respect to the subject matter contained
              herein. No other promises, warranties, representations, agreements, or understandings, whether oral or
              written, exist concerning this subject matter. This Agreement supersedes any previous or simultaneous
              oral or written promises, warranties, representations, agreements, or conditions between the parties.
            </p>
          </Section>

          <Section title="Severability">
            <p>
              If any provision of this Agreement shall be held to be invalid, illegal, or unenforceable for any reason,
              the remaining provisions shall continue to be valid and enforceable. If a court finds that any provision
              of this Agreement is invalid, illegal, or unenforceable, but that by limiting such provision, it will
              become valid, legal, and enforceable, then such provision shall be deemed to be written, construed, and
              enforced as so limited.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>This Agreement shall be governed by the laws of the State of Florida.</p>
          </Section>

          <Section title="Community Information">
            <p>
              Community Name: Tradepro Nexus<br />
              Website: www.tradepronexus.com<br />
              Effective Date: June 16, 2026
            </p>
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
