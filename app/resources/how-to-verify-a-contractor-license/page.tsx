import type { Metadata } from "next";
import ResourceArticle, { H2, P } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "How to Verify a Contractor's License (Step by Step)",
  description:
    "A step by step guide to verifying any contractor's license, checking their standing with the state board, and confirming insurance before you sign a contract.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Contractor Guides"
      title="How to Verify a Contractor's License, Step by Step"
      intro="Every state that licenses contractors also publishes a way to verify that license for free. The process takes a few minutes and can save you from hiring someone who is unlicensed, lapsed, or has a history of complaints. Here is how to do it properly."
      ctaHeading="Skip the Guesswork"
      ctaBody="TradePro Nexus connects you with contractors and trade professionals who put their credentials front and center."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>Step One, Find the Right State Board</H2>
      <P>
        Contractor licensing is regulated at the state level, and sometimes the county or city level as well, so
        the first step is identifying which agency issued the license. This is usually a department of professional
        regulation, a licensing board, or a state contractors board. A quick search for &quot;[state name]
        contractor license lookup&quot; will typically surface the correct site.
      </P>

      <H2>Step Two, Search by Name and by License Number</H2>
      <P>
        Ask the contractor for their license number directly, then search both the number and the business name
        separately. If the two searches return different results, or the number returns nothing at all, that is
        worth asking about before moving forward. A legitimate contractor will not hesitate to provide their
        license number in writing.
      </P>

      <H2>Step Three, Confirm the Status Is Active</H2>
      <P>
        Look for a status field on the license record. Terms vary by state, but you want to see &quot;Active,&quot;
        &quot;Current,&quot; or &quot;In Good Standing.&quot; Statuses like &quot;Expired,&quot;
        &quot;Suspended,&quot; &quot;Revoked,&quot; or &quot;Delinquent&quot; mean the contractor is not currently
        authorized to perform licensed work, regardless of what their marketing materials claim.
      </P>

      <H2>Step Four, Check the Scope and Classification</H2>
      <P>
        Licenses are often limited to specific trades or project sizes. A license lookup will usually show a
        classification, such as general building, electrical, or plumbing, and sometimes a monetary cap per
        project. Confirm the classification matches the actual work you need done.
      </P>

      <H2>Step Five, Look for Complaints or Disciplinary Actions</H2>
      <P>
        Most state license lookups also display a history of complaints, disciplinary actions, or bond claims filed
        against the license. A clean history is not a guarantee, but a pattern of unresolved complaints is a clear
        warning sign worth investigating further before signing a contract.
      </P>
    </ResourceArticle>
  );
}
