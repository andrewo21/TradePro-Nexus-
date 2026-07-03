import type { Metadata } from "next";
import ResourceArticle, { H2, P, Ul } from "@/components/ResourceArticle";

export const metadata: Metadata = {
  title: "How to Find a Licensed Contractor in North Carolina",
  description:
    "Learn how to verify a general contractor's license in North Carolina through the NCLBGC, understand license limits, and avoid hiring an unlicensed contractor.",
};

export default function Page() {
  return (
    <ResourceArticle
      eyebrow="Contractor Guides"
      title="How to Find a Licensed Contractor in North Carolina"
      intro="North Carolina requires a general contractor license for any project valued at $40,000 or more. Below that threshold, licensing is not required by the state, which makes verification even more important for larger jobs where an unlicensed contractor has the least accountability."
      ctaHeading="Connect With Verified Pros on TradePro Nexus"
      ctaBody="TradePro Nexus helps general contractors find crews and trade professionals who are ready to work across North Carolina."
      ctaHref="/search"
      ctaLabel="Search TradePro Nexus"
    >
      <H2>Know the License Limitation Tiers</H2>
      <P>
        The North Carolina Licensing Board for General Contractors (NCLBGC) issues licenses in three tiers based on
        the dollar value of a single project: Limited (up to $500,000), Intermediate (up to $1,500,000), and
        Unlimited (no cap). A contractor licensed at the Limited tier cannot legally take on a project priced above
        that threshold, so confirm the tier matches your project&apos;s budget, not just that a license exists.
      </P>

      <H2>Search the NCLBGC License Lookup</H2>
      <P>
        The NCLBGC maintains a free public license search on its website. Enter the contractor&apos;s name or
        license number to confirm the license is active, see the classification (Building, Residential, Highway,
        Public Utilities, or Specialty), and check for any disciplinary history or complaints filed against the
        license.
      </P>

      <H2>Understand What &quot;Unclassified&quot; Means</H2>
      <P>
        Some contractors hold an Unclassified license, which allows them to bid on any type of construction project
        within their tier. Others hold a classification limited to a specific category, such as residential
        building only. If your project falls outside a contractor&apos;s classification, their license does not
        cover the work even if the tier limit is high enough.
      </P>

      <H2>Confirm Local Permitting Requirements</H2>
      <P>
        North Carolina counties and municipalities often require separate building permits in addition to state
        licensing. A properly licensed contractor should be able to pull permits in your jurisdiction without
        issue. If a contractor asks you to pull the permit yourself while they perform licensed work, that is a
        sign they may not be in good standing locally.
      </P>

      <H2>Red Flags to Watch For</H2>
      <Ul
        items={[
          "A license number that returns no results in the NCLBGC search",
          "Reluctance to specify their license tier or classification",
          "Requesting the full contract amount upfront",
          "No written contract for a project over the state's licensing threshold",
          "Business name on invoices that does not match the licensed entity",
        ]}
      />
    </ResourceArticle>
  );
}
