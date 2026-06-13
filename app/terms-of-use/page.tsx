import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2">Legal</p>
        <h1 className="text-2xl font-black text-white mb-2">Website Terms of Use</h1>
        <p className="text-slate-500 text-xs mb-8">Effective as of June 17, 2026</p>

        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <Section title="Agreement Between User and www.tradepronexus.com">
            <p className="mb-3">
              Welcome to www.tradepronexus.com. The www.tradepronexus.com website (the &quot;Site&quot;) is comprised of
              various web pages operated by Tradepro Technologies LLC (&quot;Tradepro Nexus&quot;). www.tradepronexus.com is
              offered to you conditioned on your acceptance without modification of the terms, conditions, and
              notices contained herein (the &quot;Terms&quot;). Your use of www.tradepronexus.com constitutes your agreement
              to all such Terms. Please read these terms carefully, and keep a copy of them for your reference.
            </p>
            <p className="mb-3">www.tradepronexus.com is a Social Networking Site.</p>
            <p>It connects professionals — a social network and marketplace for the construction trades.</p>
          </Section>

          <Section title="Electronic Communications">
            <p>
              Visiting www.tradepronexus.com or sending emails to Tradepro Nexus constitutes electronic
              communications. You consent to receive electronic communications and you agree that all agreements,
              notices, disclosures and other communications that we provide to you electronically, via email and on
              the Site, satisfy any legal requirement that such communications be in writing.
            </p>
          </Section>

          <Section title="Your Account">
            <p>
              If you use this site, you are responsible for maintaining the confidentiality of your account and
              password and for restricting access to your computer, and you agree to accept responsibility for all
              activities that occur under your account or password. You may not assign or otherwise transfer your
              account to any other person or entity. You acknowledge that Tradepro Nexus is not responsible for third
              party access to your account that results from theft or misappropriation of your account. Tradepro
              Nexus and its associates reserve the right to refuse or cancel service, terminate accounts, or remove or
              edit content in our sole discretion.
            </p>
          </Section>

          <Section title="Children Under Thirteen">
            <p>
              Tradepro Nexus does not knowingly collect, either online or offline, personal information from persons
              under the age of thirteen. If you are under 18, you may use www.tradepronexus.com only with permission
              of a parent or guardian.
            </p>
          </Section>

          <Section title="Links to Third Party Sites / Third Party Services">
            <p className="mb-3">
              www.tradepronexus.com may contain links to other websites (&quot;Linked Sites&quot;). The Linked Sites are not
              under the control of Tradepro Nexus and Tradepro Nexus is not responsible for the contents of any Linked
              Site, including without limitation any link contained in a Linked Site, or any changes or updates to a
              Linked Site. Tradepro Nexus is providing these links to you only as a convenience, and the inclusion of
              any link does not imply endorsement by Tradepro Nexus of the site or any association with its operators.
            </p>
            <p>
              Certain services made available via www.tradepronexus.com are delivered by third party sites and
              organizations. By using any product, service or functionality originating from the www.tradepronexus.com
              domain, you hereby acknowledge and consent that Tradepro Nexus may share such information and data with
              any third party with whom Tradepro Nexus has a contractual relationship to provide the requested
              product, service or functionality on behalf of www.tradepronexus.com users and customers.
            </p>
          </Section>

          <Section title="No Unlawful or Prohibited Use / Intellectual Property">
            <p className="mb-3">
              You are granted a non-exclusive, non-transferable, revocable license to access and use
              www.tradepronexus.com strictly in accordance with these terms of use. As a condition of your use of the
              Site, you warrant to Tradepro Nexus that you will not use the Site for any purpose that is unlawful or
              prohibited by these Terms. You may not use the Site in any manner which could damage, disable,
              overburden, or impair the Site or interfere with any other party&apos;s use and enjoyment of the Site. You
              may not obtain or attempt to obtain any materials or information through any means not intentionally
              made available or provided for through the Site.
            </p>
            <p className="mb-3">
              All content included as part of the Service, such as text, graphics, logos, images, as well as the
              compilation thereof, and any software used on the Site, is the property of Tradepro Nexus or its
              suppliers and protected by copyright and other laws that protect intellectual property and proprietary
              rights. You agree to observe and abide by all copyright and other proprietary notices, legends or other
              restrictions contained in any such content and will not make any changes thereto.
            </p>
            <p>
              You will not modify, publish, transmit, reverse engineer, participate in the transfer or sale, create
              derivative works, or in any way exploit any of the content, in whole or in part, found on the Site.
              Tradepro Nexus content is not for resale. Your use of the Site does not entitle you to make any
              unauthorized use of any protected content, and in particular you will not delete or alter any
              proprietary rights or attribution notices in any content. You will use protected content solely for
              your personal use, and will make no other use of the content without the express written permission of
              Tradepro Nexus and the copyright owner. You agree that you do not acquire any ownership rights in any
              protected content. We do not grant you any licenses, express or implied, to the intellectual property of
              Tradepro Nexus or our licensors except as expressly authorized by these Terms.
            </p>
          </Section>

          <Section title="Use of Communication Services">
            <p className="mb-3">
              The Site may contain bulletin board services, chat areas, news groups, forums, communities, personal web
              pages, calendars, and/or other message or communication facilities designed to enable you to communicate
              with the public at large or with a group (collectively, &quot;Communication Services&quot;). You agree to use
              the Communication Services only to post, send and receive messages and material that are proper and
              related to the particular Communication Service.
            </p>
            <p className="mb-3">
              By way of example, and not as a limitation, you agree that when using a Communication Service, you will
              not: defame, abuse, harass, stalk, threaten or otherwise violate the legal rights (such as rights of
              privacy and publicity) of others; publish, post, upload, distribute or disseminate any inappropriate,
              profane, defamatory, infringing, obscene, indecent or unlawful topic, name, material or information;
              upload files that contain software or other material protected by intellectual property laws (or by
              rights of privacy of publicity) unless you own or control the rights thereto or have received all
              necessary consents; upload files that contain viruses, corrupted files, or any other similar software or
              programs that may damage the operation of another&apos;s computer; advertise or offer to sell or buy any
              goods or services for any business purpose, unless such Communication Service specifically allows such
              messages; conduct or forward surveys, contests, pyramid schemes or chain letters; download any file
              posted by another user of a Communication Service that you know, or reasonably should know, cannot be
              legally distributed in such manner; falsify or delete any author attributions, legal or other proper
              notices or proprietary designations or labels of the origin or source of software or other material
              contained in a file that is uploaded; restrict or inhibit any other user from using and enjoying the
              Communication Services; violate any code of conduct or other guidelines which may be applicable for any
              particular Communication Service; harvest or otherwise collect information about others, including
              e-mail addresses, without their consent; violate any applicable laws or regulations.
            </p>
            <p className="mb-3">
              Tradepro Nexus has no obligation to monitor the Communication Services. However, Tradepro Nexus reserves
              the right to review materials posted to a Communication Service and to remove any materials in its sole
              discretion. Tradepro Nexus reserves the right to terminate your access to any or all of the
              Communication Services at any time without notice for any reason whatsoever.
            </p>
            <p className="mb-3">
              Tradepro Nexus reserves the right at all times to disclose any information as necessary to satisfy any
              applicable law, regulation, legal process or governmental request, or to edit, refuse to post or to
              remove any information or materials, in whole or in part, in Tradepro Nexus&apos;s sole discretion.
            </p>
            <p>
              Always use caution when giving out any personally identifying information about yourself or your
              children in any Communication Service. Tradepro Nexus does not control or endorse the content, messages
              or information found in any Communication Service and, therefore, Tradepro Nexus specifically disclaims
              any liability with regard to the Communication Services and any actions resulting from your
              participation in any Communication Service. Managers and hosts are not authorized Tradepro Nexus
              spokespersons, and their views do not necessarily reflect those of Tradepro Nexus.
            </p>
          </Section>

          <Section title="Materials Provided to www.tradepronexus.com or Posted on Any Tradepro Nexus Web Page">
            <p className="mb-3">
              Tradepro Nexus does not claim ownership of the materials you provide to www.tradepronexus.com (including
              feedback and suggestions) or post, upload, input or submit to any Tradepro Nexus Site or our associated
              services (collectively &quot;Submissions&quot;). However, by posting, uploading, inputting, providing or
              submitting your Submission you are granting Tradepro Nexus, our affiliated companies and necessary
              sublicensees permission to use your Submission in connection with the operation of their Internet
              businesses including, without limitation, the rights to: copy, distribute, transmit, publicly display,
              publicly perform, reproduce, edit, translate and reformat your Submission; and to publish your name in
              connection with your Submission.
            </p>
            <p className="mb-3">No compensation will be paid with respect to the use of your Submission, as provided herein.</p>
            <p className="mb-3">
              Tradepro Nexus is under no obligation to post or use any Submission you may provide and may remove any
              Submission at any time in Tradepro Nexus&apos;s sole discretion.
            </p>
            <p>
              By posting, uploading, inputting, providing or submitting your Submission you warrant and represent that
              you own or otherwise control all of the rights to your Submission as described in this section
              including, without limitation, all the rights necessary for you to provide, post, upload, input or
              submit the Submissions.
            </p>
          </Section>

          <Section title="International Users">
            <p>
              The Service is controlled, operated and administered by Tradepro Nexus from our offices within the USA.
              If you access the Service from a location outside the USA, you are responsible for compliance with all
              local laws. You agree that you will not use the Tradepro Nexus Content accessed through
              www.tradepronexus.com in any country or in any manner prohibited by any applicable laws, restrictions or
              regulations.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify, defend and hold harmless Tradepro Nexus, its officers, directors, employees,
              agents and third parties, for any losses, costs, liabilities and expenses (including reasonable
              attorney&apos;s fees) relating to or arising out of your use of or inability to use the Site or services,
              any user postings made by you, your violation of any terms of this Agreement or your violation of any
              rights of a third party, or your violation of any applicable laws, rules or regulations. Tradepro Nexus
              reserves the right, at its own cost, to assume the exclusive defense and control of any matter otherwise
              subject to indemnification by you, in which event you will fully cooperate with Tradepro Nexus in
              asserting any available defenses.
            </p>
          </Section>

          <Section title="Arbitration">
            <p>
              In the event the parties are not able to resolve any dispute between them arising out of or concerning
              these Terms and Conditions, or any provisions hereof, whether in contract, tort, or otherwise at law or
              in equity for damages or any other relief, then such dispute shall be resolved only by final and binding
              arbitration pursuant to the Federal Arbitration Act, conducted by a single neutral arbitrator and
              administered by the American Arbitration Association, or a similar arbitration service selected by the
              parties, in a location mutually agreed upon by the parties. The arbitrator&apos;s award shall be final, and
              judgment may be entered upon it in any court having jurisdiction. In the event that any legal or
              equitable action, proceeding or arbitration arises out of or concerns these Terms and Conditions, the
              prevailing party shall be entitled to recover its costs and reasonable attorney&apos;s fees. The parties
              agree to arbitrate all disputes and claims in regards to these Terms and Conditions or any disputes
              arising as a result of these Terms and Conditions, whether directly or indirectly, including Tort claims
              that are a result of these Terms and Conditions. The parties agree that the Federal Arbitration Act
              governs the interpretation and enforcement of this provision. The entire dispute, including the scope
              and enforceability of this arbitration provision shall be determined by the Arbitrator. This arbitration
              provision shall survive the termination of these Terms and Conditions.
            </p>
          </Section>

          <Section title="Class Action Waiver">
            <p>
              Any arbitration under these Terms and Conditions will take place on an individual basis; class
              arbitrations and class/representative/collective actions are not permitted. THE PARTIES AGREE THAT A
              PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY IN EACH&apos;S INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR
              CLASS MEMBER IN ANY PUTATIVE CLASS, COLLECTIVE AND/OR REPRESENTATIVE PROCEEDING, SUCH AS IN THE FORM OF A
              PRIVATE ATTORNEY GENERAL ACTION AGAINST THE OTHER. Further, unless both you and Tradepro Nexus agree
              otherwise, the arbitrator may not consolidate more than one person&apos;s claims, and may not otherwise
              preside over any form of a representative or class proceeding.
            </p>
          </Section>

          <Section title="Liability Disclaimer">
            <p className="mb-3">
              THE INFORMATION, SOFTWARE, PRODUCTS, AND SERVICES INCLUDED IN OR AVAILABLE THROUGH THE SITE MAY INCLUDE
              INACCURACIES OR TYPOGRAPHICAL ERRORS. CHANGES ARE PERIODICALLY ADDED TO THE INFORMATION HEREIN. TRADEPRO
              TECHNOLOGIES LLC AND/OR ITS SUPPLIERS MAY MAKE IMPROVEMENTS AND/OR CHANGES IN THE SITE AT ANY TIME.
            </p>
            <p className="mb-3">
              TRADEPRO TECHNOLOGIES LLC AND/OR ITS SUPPLIERS MAKE NO REPRESENTATIONS ABOUT THE SUITABILITY,
              RELIABILITY, AVAILABILITY, TIMELINESS, AND ACCURACY OF THE INFORMATION, SOFTWARE, PRODUCTS, SERVICES AND
              RELATED GRAPHICS CONTAINED ON THE SITE FOR ANY PURPOSE. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW,
              ALL SUCH INFORMATION, SOFTWARE, PRODUCTS, SERVICES AND RELATED GRAPHICS ARE PROVIDED &quot;AS IS&quot; WITHOUT
              WARRANTY OR CONDITION OF ANY KIND. TRADEPRO TECHNOLOGIES LLC AND/OR ITS SUPPLIERS HEREBY DISCLAIM ALL
              WARRANTIES AND CONDITIONS WITH REGARD TO THIS INFORMATION, SOFTWARE, PRODUCTS, SERVICES AND RELATED
              GRAPHICS, INCLUDING ALL IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, TITLE AND NON-INFRINGEMENT.
            </p>
            <p className="mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TRADEPRO TECHNOLOGIES LLC AND/OR ITS
              SUPPLIERS BE LIABLE FOR ANY DIRECT, INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL DAMAGES OR ANY
              DAMAGES WHATSOEVER INCLUDING, WITHOUT LIMITATION, DAMAGES FOR LOSS OF USE, DATA OR PROFITS, ARISING OUT OF
              OR IN ANY WAY CONNECTED WITH THE USE OR PERFORMANCE OF THE SITE, WITH THE DELAY OR INABILITY TO USE THE
              SITE OR RELATED SERVICES, THE PROVISION OF OR FAILURE TO PROVIDE SERVICES, OR FOR ANY INFORMATION,
              SOFTWARE, PRODUCTS, SERVICES AND RELATED GRAPHICS OBTAINED THROUGH THE SITE, OR OTHERWISE ARISING OUT OF
              THE USE OF THE SITE, WHETHER BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY OR OTHERWISE, EVEN IF
              TRADEPRO TECHNOLOGIES LLC OR ANY OF ITS SUPPLIERS HAS BEEN ADVISED OF THE POSSIBILITY OF DAMAGES. BECAUSE
              SOME STATES/JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY FOR CONSEQUENTIAL OR
              INCIDENTAL DAMAGES, THE ABOVE LIMITATION MAY NOT APPLY TO YOU.
            </p>
            <p>
              IF YOU ARE DISSATISFIED WITH ANY PORTION OF THE SITE, OR WITH ANY OF THESE TERMS OF USE, YOUR SOLE AND
              EXCLUSIVE REMEDY IS TO DISCONTINUE USING THE SITE.
            </p>
          </Section>

          <Section title="Termination / Access Restriction">
            <p className="mb-3">
              Tradepro Nexus reserves the right, in its sole discretion, to terminate your access to the Site and the
              related services or any portion thereof at any time, without notice. To the maximum extent permitted by
              law, this agreement is governed by the laws of the State of Florida and you hereby consent to the
              exclusive jurisdiction and venue of courts in Florida in all disputes arising out of or relating to the
              use of the Site. Use of the Site is unauthorized in any jurisdiction that does not give effect to all
              provisions of these Terms, including, without limitation, this section.
            </p>
            <p className="mb-3">
              You agree that no joint venture, partnership, employment, or agency relationship exists between you and
              Tradepro Nexus as a result of this agreement or use of the Site. Tradepro Nexus&apos;s performance of this
              agreement is subject to existing laws and legal process, and nothing contained in this agreement is in
              derogation of Tradepro Nexus&apos;s right to comply with governmental, court and law enforcement requests or
              requirements relating to your use of the Site or information provided to or gathered by Tradepro Nexus
              with respect to such use. If any part of this agreement is determined to be invalid or unenforceable
              pursuant to applicable law including, but not limited to, the warranty disclaimers and liability
              limitations set forth above, then the invalid or unenforceable provision will be deemed superseded by a
              valid, enforceable provision that most closely matches the intent of the original provision and the
              remainder of the agreement shall continue in effect.
            </p>
            <p>
              Unless otherwise specified herein, this agreement constitutes the entire agreement between the user and
              Tradepro Nexus with respect to the Site and it supersedes all prior or contemporaneous communications and
              proposals, whether electronic, oral or written, between the user and Tradepro Nexus with respect to the
              Site. A printed version of this agreement and of any notice given in electronic form shall be admissible
              in judicial or administrative proceedings based upon or relating to this agreement to the same extent and
              subject to the same conditions as other business documents and records originally generated and
              maintained in printed form. It is the express wish to the parties that this agreement and all related
              documents be written in English.
            </p>
          </Section>

          <Section title="Changes to Terms">
            <p>
              Tradepro Nexus reserves the right, in its sole discretion, to change the Terms under which
              www.tradepronexus.com is offered. The most current version of the Terms will supersede all previous
              versions. Tradepro Nexus encourages you to periodically review the Terms to stay informed of our updates.
            </p>
          </Section>

          <Section title="Contact Us">
            <p className="mb-3">Tradepro Nexus welcomes your questions or comments regarding the Terms:</p>
            <p className="text-slate-200 mb-3">
              Tradepro Technologies LLC<br />
              17629 Fallen Branch Way<br />
              Punta Gorda, Florida 33982
            </p>
            <p className="mb-1">
              Email Address:{" "}
              <a href="mailto:support@tradepronexus.com" className="text-orange-400 hover:text-orange-300 underline">
                support@tradepronexus.com
              </a>
            </p>
            <p>Telephone number: (561) 247-1381</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
          <Link href="/privacy-policy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
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
