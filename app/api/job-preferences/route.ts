import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// PATCH /api/job-preferences — trade pro: update job matching preferences
export async function PATCH(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = await request.json() as {
      open_to_union_jobs_only?: boolean;
      seeking_prevailing_wage_work?: boolean;
    };

    const updates: Record<string, boolean> = {};
    if (typeof body.open_to_union_jobs_only === "boolean") updates.open_to_union_jobs_only = body.open_to_union_jobs_only;
    if (typeof body.seeking_prevailing_wage_work === "boolean") updates.seeking_prevailing_wage_work = body.seeking_prevailing_wage_work;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const { error } = await db.from("profiles").update(updates).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });

    return NextResponse.json({ updated: true });
  } catch (err) {
    console.error("Job preferences update error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
