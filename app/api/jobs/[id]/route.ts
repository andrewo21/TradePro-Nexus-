import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabaseServer";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";
const VALID_STATUSES = ["pending", "approved", "removed"];

// PATCH /api/jobs/[id] — admin: approve / unapprove / remove a job posting
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { status } = await request.json() as { status: string };
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const adminDb = getSupabaseAdmin() as any;
  const { error } = await adminDb.from("jobs").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ updated: true, status });
}

// DELETE /api/jobs/[id] — admin: permanently delete a job posting
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getSupabaseServer()) as any;
  const { data: { user } } = await db.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const adminDb = getSupabaseAdmin() as any;
  const { error } = await adminDb.from("jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
