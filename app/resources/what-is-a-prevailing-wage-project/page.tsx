import type { Metadata } from "next";
import ResourceArticle, { H2, P } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "What Is a Prevailing Wage Project?",
  description:
    "Understand what makes a construction project subject to prevailing wage requirements, how rates are set, and what contractors need to do to stay compliant.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Prevailing Wage"
      title="What Is a Prevailing Wage Project?"
      intro="Prevailing wage rules show up on far more projects than most contractors expect, not just large federal jobs. Here is what actually triggers prevailing wage requirements and what they mean day to day on a job site."
      ctaHeading="Staff Your Next Prevailing Wage Project"
      ctaBody="Find trade professionals on TradePro Nexus who understand certified payroll and prevailing wage requirements."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>What Triggers Prevailing Wage</H2>
      <P>
        A project becomes subject to prevailing wage requirements when it uses public funding, whether federal,
        state, or local, above a defined threshold, and falls under construction, alteration, or repair work.
        Federal projects are governed by the Davis-Bacon Act. Many states also have their own prevailing wage laws,
        sometimes called Little Davis-Bacon Acts, which apply to state and locally funded projects, often with
        different thresholds and rules than the federal law.
      </P>

      <H2>How the Wage Rate Is Determined</H2>
      <P>
        Prevailing wage rates are meant to reflect what is actually being paid to a majority of workers in a given
        trade and locality, based on wage surveys conducted by the Department of Labor at the federal level, or by
        a state labor agency for state prevailing wage projects. Rates typically include both a base hourly wage
        and a fringe benefit component, which can be paid in cash or through actual benefits like health insurance
        and retirement contributions.
      </P>

      <H2>It Applies to Subcontractors Too</H2>
      <P>
        Prevailing wage requirements flow down through the entire chain of contractors on a covered project. A
        general contractor cannot avoid the requirement by having a subcontractor perform the covered work at a
        lower rate. Every laborer and mechanic on site performing covered work must be paid at least the applicable
        prevailing wage, regardless of which tier of the contract they fall under.
      </P>

      <H2>Certified Payroll and Recordkeeping</H2>
      <P>
        Contractors on prevailing wage projects are generally required to submit certified payroll records
        documenting hours, classifications, and wages for every covered worker, usually on a weekly basis. These
        records are the primary tool agencies use to audit compliance, and incomplete or inaccurate records are one
        of the most common findings in prevailing wage audits.
      </P>

      <H2>Why It Matters Beyond Compliance</H2>
      <P>
        Prevailing wage rules exist to prevent public construction dollars from driving down local wage standards.
        For contractors, understanding whether a project is covered, and correctly classifying and paying workers,
        is not optional paperwork. Violations can result in withheld contract payments, penalties, and in serious
        cases, disqualification from bidding on future public projects.
      </P>
    </ResourceArticle>
  );
}
