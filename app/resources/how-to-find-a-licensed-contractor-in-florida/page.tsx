import type { Metadata } from "next";
import ResourceArticle, { H2, P, Ul } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "How to Find a Licensed Contractor in Florida",
  description:
    "A practical guide to finding and verifying a licensed contractor in Florida, including how to check DBPR license status and avoid unlicensed contracting scams.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Contractor Guides"
      title="How to Find a Licensed Contractor in Florida"
      intro="Florida requires contractors to hold a state license for most construction work above $500 in cost. Hiring an unlicensed contractor is not just risky, it is often illegal for the contractor and can void your insurance claim if something goes wrong. Here is how to find one who is properly licensed."
      ctaHeading="Find Licensed Contractors Already on TradePro Nexus"
      ctaBody="TradePro Nexus is built for verified construction professionals. Search the platform to connect with contractors and crews who are ready to work in Florida."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>Understand the Two License Types</H2>
      <P>
        Florida issues two main categories of contractor license. A Certified contractor has passed a state exam
        and can work anywhere in Florida. A Registered contractor has passed a local competency exam and can only
        work in the county or municipality where that exam was administered. Both are legitimate, but a Registered
        contractor working outside their approved jurisdiction is operating illegally, so confirm the license type
        matches the county where your project is located.
      </P>

      <H2>Verify the License Before You Sign Anything</H2>
      <P>
        Every Florida contractor license can be checked through the Department of Business and Professional
        Regulation (DBPR) online license search. Search by the contractor&apos;s name or license number and confirm
        the status reads &quot;Current, Active.&quot; A status of &quot;Delinquent,&quot; &quot;Suspended,&quot; or
        &quot;Revoked&quot; means the contractor is not legally permitted to take on new work, regardless of what
        they tell you in person.
      </P>

      <H2>Match the License to the Scope of Work</H2>
      <P>
        Florida licenses are trade specific. A licensed electrician is not automatically licensed to install a
        roof, and a general contractor license does not cover specialty trades like fire suppression or pool
        construction in every jurisdiction. Ask what license category covers your specific project and confirm
        that classification on the DBPR record.
      </P>

      <H2>Check Insurance and Bonding Separately From the License</H2>
      <P>
        A license confirms the contractor passed an exam and background check. It does not confirm they carry
        active insurance today. Ask for a current certificate of insurance directly from the carrier, not just a
        photocopy the contractor provides, and confirm workers compensation coverage if they will have a crew on
        site.
      </P>

      <H2>Watch for Common Red Flags</H2>
      <Ul
        items={[
          "Asking for full payment before any work begins",
          "No permanent business address or a P.O. box only",
          "Pressure to sign a contract the same day",
          "A license number that does not match the business name on the contract",
          "Reluctance to provide references from recent Florida projects",
        ]}
      />
    </ResourceArticle>
  );
}
