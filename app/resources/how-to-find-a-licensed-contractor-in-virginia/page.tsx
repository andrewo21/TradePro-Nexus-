import type { Metadata } from "next";
import ResourceArticle, { H2, P, Ul } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "How to Find a Licensed Contractor in Virginia",
  description:
    "A guide to Virginia contractor licensing through DPOR, including Class A, B, and C license limits and how to verify a license before hiring.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Contractor Guides"
      title="How to Find a Licensed Contractor in Virginia"
      intro="Virginia's Department of Professional and Occupational Regulation, known as DPOR, licenses contractors in three classes based on project size and annual revenue. Understanding these classes helps you confirm a contractor is legally allowed to take on your project before you sign a contract."
      ctaHeading="Find Licensed Pros on TradePro Nexus"
      ctaBody="Search verified contractors and trade professionals ready to work on projects across Virginia."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>Class A, B, and C Licenses Explained</H2>
      <P>
        A Class C license covers individual projects up to $10,000 and total annual volume up to $150,000. Class B
        covers projects up to $120,000 and annual volume up to $750,000. Class A has no project or annual revenue
        cap. A contractor operating above their class limit is doing so without proper authorization, even if their
        license is otherwise active and in good standing.
      </P>

      <H2>Use the DPOR License Lookup</H2>
      <P>
        DPOR provides a free online license lookup where you can search by contractor name, business name, or
        license number. The record will show the license class, specialty designations, expiration date, and any
        board actions taken against the license. Confirm the license has not expired and matches the exact business
        name on your contract.
      </P>

      <H2>Check for the Correct Specialty Designation</H2>
      <P>
        Virginia contractor licenses include specialty designations such as electrical, plumbing, HVAC, and general
        building. A Class A general contractor license does not automatically authorize electrical or plumbing work
        unless that specialty is listed on the license record. Cross check the specialty against the actual scope
        of your project.
      </P>

      <H2>Ask About the Class A Financial Statement Requirement</H2>
      <P>
        To hold a Class A license, a contractor must submit a financial statement demonstrating sufficient working
        capital, reviewed periodically by DPOR. This requirement exists specifically to protect owners on large
        projects from a contractor who cannot financially complete the job, so it is worth confirming for any
        project above the Class B threshold.
      </P>

      <H2>Red Flags to Watch For</H2>
      <Ul
        items={[
          "A license class that does not cover your project's budget",
          "No specialty designation matching your scope of work",
          "An expired or suspended license status on the DPOR record",
          "Refusal to provide a written, itemized contract",
          "Demanding cash payment with no invoice or receipt",
        ]}
      />
    </ResourceArticle>
  );
}
