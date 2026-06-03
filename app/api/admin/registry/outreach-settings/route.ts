// PATCH /api/admin/registry/outreach-settings
// Updates admin_settings key/value pairs.
// The outreach master switch lives here.
// Admin-only. Every change logged.

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";

// Keys that are allowed to be changed via this endpoint
const ALLOWED_KEYS = [
  "outreach_enabled",
  "outreach_test_mode",
  "outreach_test_email",
  "outreach_batch_size",
];

export async function PATCH(request: NextRequest) {
  const authDb = (await getSupabaseServer()) as any;
  const { data: { user } } = await authDb.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { key, value } = await request.json() as { key: string; value: string };

  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: `Key "${key}" is not allowed.` }, { status: 400 });
  }

  // Safety: outreach_enabled can only be set to "false" or "true"
  if (key === "outreach_enabled" && !["true", "false"].includes(value)) {
    return NextResponse.json({ error: "outreach_enabled must be 'true' or 'false'." }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;

  await db.from("admin_settings").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: "key" });

  console.log(`Admin setting updated: ${key} = ${value} by ${user.email}`);

  return NextResponse.json({ key, value, updated: true });
}
