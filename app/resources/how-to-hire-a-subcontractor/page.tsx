import type { Metadata } from "next";
import ResourceArticle, { H2, P } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "How to Hire a Subcontractor the Right Way",
  description:
    "A practical checklist for general contractors on how to vet, hire, and manage a subcontractor, from license verification to payment terms.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="For General Contractors"
      title="How to Hire a Subcontractor the Right Way"
      intro="Hiring the wrong subcontractor can cost a general contractor far more than a single project's margin. It can mean delays, callbacks, and liability that lands back on the GC's license. Here is a practical process for hiring one the right way."
      ctaHeading="Find Your Next Subcontractor"
      ctaBody="TradePro Nexus connects general contractors with vetted trade professionals and crews ready for their next project."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>Define the Scope Before You Start Looking</H2>
      <P>
        Write down exactly what the subcontractor is responsible for, including materials, cleanup, permits, and
        coordination with other trades. A vague scope is the single most common source of disputes on a job site.
        The more specific the scope, the easier it is to compare bids and hold a sub accountable later.
      </P>

      <H2>Verify License, Insurance, and Bonding</H2>
      <P>
        Confirm the subcontractor holds an active license appropriate to the scope of work, and request a
        certificate of insurance naming your company as an additional insured, sent directly from their insurance
        carrier. If the project requires bonding, confirm the bond is active and covers the value of the work being
        performed.
      </P>

      <H2>Check References From Recent, Similar Projects</H2>
      <P>
        Ask for two or three references from projects completed in the last twelve months that are similar in size
        and scope to yours. A subcontractor who only offers references from years ago, or from projects nothing
        like your own, has not given you a fair picture of their current capability.
      </P>

      <H2>Put Payment Terms in Writing</H2>
      <P>
        A written subcontract should specify the payment schedule, retainage percentage, and the process for
        approving and paying change orders. Ambiguity here is where most subcontractor disputes start. If you plan
        to use a pay-when-paid clause, make sure it is written clearly and that the subcontractor understands and
        agrees to it before work begins.
      </P>

      <H2>Set Expectations for Communication and Schedule</H2>
      <P>
        Include a clear schedule with milestones in the subcontract, along with expectations for daily or weekly
        progress updates. A subcontractor who resists committing to a schedule in writing is telling you something
        about how the project will go before it even starts.
      </P>
    </ResourceArticle>
  );
}
