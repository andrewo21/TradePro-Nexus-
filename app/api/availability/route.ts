import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const VALID_STATUSES = ["available", "available_soon", "booked"];

export async function PATCH(request: NextRequest) {
  try {
    const db = (await getSupabaseServer()) as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { status } = await request.json() as { status: string };
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    // Update profile if exists
    const { data: profile } = await db.from("profiles").select("id").eq("user_id", user.id).single();
    if (profile) {
      await db.from("profiles").update({ availability_status: status }).eq("user_id", user.id);
      return NextResponse.json({ updated: "profile", status });
    }

    // Fall back to company
    const { data: company } = await db.from("companies").select("id").eq("user_id", user.id).single();
    if (company) {
      await db.from("companies").update({ availability_status: status }).eq("user_id", user.id);
      return NextResponse.json({ updated: "company", status });
    }

    return NextResponse.json({ error: "No profile found." }, { status: 404 });
  } catch (err) {
    console.error("Availability update error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
