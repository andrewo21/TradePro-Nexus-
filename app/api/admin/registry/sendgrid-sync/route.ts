// POST /api/admin/registry/sendgrid-sync
// Admin-only. Syncs all outreach_eligible=false emails to SendGrid
// global suppression list. Run once after any bulk suppression changes.
import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const ADMIN_EMAIL      = "andrew@tradeprotech.ai";

export async function POST() {
  const authDb = await getSupabaseServer();
  const { data: { user } } = await (authDb as any).auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SENDGRID_API_KEY) {
    return NextResponse.json({ error: "SENDGRID_API_KEY_NEXUS not configured" }, { status: 500 });
  }

  const db = getSupabaseAdmin() as any;

  // Fetch all suppressed emails
  const { data: suppressed } = await db
    .from("unclaimed_profiles")
    .select("email")
    .eq("outreach_eligible", false)
    .not("email", "is", null);

  const emails = (suppressed ?? []).map((r: any) => r.email).filter(Boolean);
  if (emails.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  // SendGrid suppression API accepts up to 1000 per request
  const CHUNK = 1000;
  let synced = 0;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const batch = emails.slice(i, i + CHUNK);
    const res = await fetch("https://api.sendgrid.com/v3/asm/suppressions/global", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_emails: batch }),
    });
    if (res.ok) synced += batch.length;
  }

  return NextResponse.json({ ok: true, synced, total: emails.length });
}
