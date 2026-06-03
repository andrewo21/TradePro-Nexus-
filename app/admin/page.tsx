import { redirect } from "next/navigation";

// /admin with no path redirects to waitlist — the primary admin view.
// All admin pages: /admin/waitlist and /admin/registry
export default function AdminIndex() {
  redirect("/admin/waitlist");
}
