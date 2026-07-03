import type { Metadata } from "next";
import ResourceArticle, { H2, P } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "General Contractor vs. Subcontractor: What Is the Difference?",
  description:
    "A clear breakdown of the differences between a general contractor and a subcontractor, including contracts, licensing, liability, and payment structure.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Industry Basics"
      title="General Contractor vs. Subcontractor: What Is the Difference?"
      intro="The terms general contractor and subcontractor get used loosely on job sites, but they describe two distinct legal and contractual roles. Understanding the difference matters for licensing, liability, and how payment flows on a project."
      ctaHeading="Whichever Side You're On"
      ctaBody="TradePro Nexus helps general contractors find subcontractors, and helps subs get discovered for their next project."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>Who Holds the Contract</H2>
      <P>
        A general contractor holds the prime contract directly with the property owner and is responsible for
        delivering the entire project. A subcontractor holds a contract with the general contractor, not the
        owner, and is responsible for a defined portion of the work, such as electrical, plumbing, or framing.
      </P>

      <H2>Scope of Responsibility</H2>
      <P>
        The general contractor manages the overall project, including scheduling, coordinating between trades,
        securing permits, and ensuring the finished work meets the owner&apos;s contract. A subcontractor is
        focused on their specific trade scope and generally is not responsible for coordinating other trades unless
        the subcontract specifically says so.
      </P>

      <H2>Licensing Requirements Differ by Trade and State</H2>
      <P>
        In most states, a general contractor license covers overall construction management and often a broad
        range of building work, while specialty trades like electrical, plumbing, and HVAC require their own
        separate trade licenses, held either by the subcontractor directly or by a licensed employee on their crew.
        A general contractor cannot legally perform specialty trade work covered by a separate license just because
        they hold a GC license.
      </P>

      <H2>How Payment Flows</H2>
      <P>
        The owner pays the general contractor, who then pays subcontractors out of those funds, typically according
        to a schedule tied to completed work. This is where pay-when-paid and pay-if-paid clauses come into play,
        and where payment disputes most often arise if the subcontract is not written clearly.
      </P>

      <H2>Liability and Insurance</H2>
      <P>
        The general contractor typically carries the primary liability insurance and bonding for the overall
        project, while subcontractors are expected to carry their own insurance for the work they perform. A well
        written subcontract requires the sub to name the GC as an additional insured, protecting the GC from claims
        that arise out of the subcontractor&apos;s work specifically.
      </P>
    </ResourceArticle>
  );
}
