import type { Metadata } from "next";
import ResourceArticle, { H2, P } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "What Is a Davis-Bacon Wage Determination?",
  description:
    "A plain language explanation of Davis-Bacon wage determinations, how the Department of Labor sets them, and what they mean for contractors on federal construction projects.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Prevailing Wage"
      title="What Is a Davis-Bacon Wage Determination?"
      intro="If you have bid on a federal construction contract, you have likely seen the term wage determination in the bid documents. It is one of the most important, and most misunderstood, parts of complying with the Davis-Bacon Act. Here is what it actually means."
      ctaHeading="Find Crews Ready for Prevailing Wage Work"
      ctaBody="TradePro Nexus lists contractors and trade professionals, including those with prevailing wage and Davis-Bacon project experience."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>The Davis-Bacon Act, Briefly</H2>
      <P>
        Passed in 1931, the Davis-Bacon Act requires contractors and subcontractors on federal construction
        contracts over $2,000 to pay laborers and mechanics no less than the locally prevailing wage and fringe
        benefits for the type of work performed. It applies to construction, alteration, and repair of public
        buildings and public works.
      </P>

      <H2>What a Wage Determination Actually Contains</H2>
      <P>
        A wage determination is a document published by the Department of Labor that lists the minimum wage and
        fringe benefit rate for each labor classification, such as electrician, laborer, or operating engineer, in
        a specific county for a specific type of construction, whether building, residential, highway, or heavy. It
        is not a single national number. Rates vary significantly by location and project type.
      </P>

      <H2>How Contractors Find the Right Determination</H2>
      <P>
        Wage determinations are published and searchable through the System for Award Management, known as
        SAM.gov. The contracting officer is required to include the applicable wage determination in the
        solicitation, but contractors should independently confirm they are looking at the correct one for their
        county and construction type, since using the wrong determination can lead to underpayment and compliance
        penalties.
      </P>

      <H2>Why Classification Matters</H2>
      <P>
        A worker must be paid according to the classification of work they actually perform, not their job title.
        Someone classified as a laborer who performs electrical work during part of the day must be paid the
        electrician rate for that portion of their time. This is one of the most common sources of Davis-Bacon
        compliance errors.
      </P>

      <H2>Certified Payroll and Compliance</H2>
      <P>
        Contractors on Davis-Bacon covered projects must submit weekly certified payroll reports, typically on
        form WH-347, documenting each worker&apos;s classification, hours, and wages paid. This is not simply an
        administrative formality. It is the primary mechanism the Department of Labor uses to verify compliance,
        and errors can result in withheld payments or debarment from future federal contracts. This overview is
        general information, not legal advice. Always confirm current requirements directly with the Department of
        Labor or a qualified compliance professional.
      </P>
    </ResourceArticle>
  );
}
