import { redirect } from "next/navigation";

// Superseded by the real, legally reviewed Membership Agreement at /membership-agreement.
export default function PolicyTermsOfServiceRedirect() {
  redirect("/membership-agreement");
}
