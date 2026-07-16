import { redirect } from "next/navigation";

// Superseded by the real, legally reviewed policy at /privacy-policy.
export default function PolicyPrivacyPolicyRedirect() {
  redirect("/privacy-policy");
}
