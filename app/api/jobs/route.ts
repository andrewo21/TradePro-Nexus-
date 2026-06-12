import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabaseServer";
import { JOB_TYPES, UNION_JOB_REQUIREMENTS } from "@/lib/constants";

const ADMIN_EMAIL = "andrew@tradeprotech.ai";
const MAX_NOTIFICATIONS = 10;

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.SENDGRID_API_KEY_NEXUS;
  if (!apiKey) return;
  try {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "no-reply@tradepronexus.com", name: "TradePro Nexus" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
  } catch (err) {
    console.error("Job email failed:", err instanceof Error ? err.message : String(err));
  }
}

function confirmationEmail({ companyName, trade, location }: { companyName: string; trade: string; location: string }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;">
          <div style="display:inline-block;background:#1d4ed822;border:1px solid #1d4ed855;border-radius:12px;padding:10px 14px;margin-bottom:20px;">
            <span style="color:#3b82f6;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">🏗 TradePro Nexus</span>
          </div>
          <h1 style="color:#f1f5f9;font-size:22px;font-weight:900;margin:0 0 8px;">Job posting received</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;">
            Thanks, ${companyName}. Your <strong style="color:#f1f5f9;">${trade}</strong> opportunity in
            <strong style="color:#f1f5f9;">${location}</strong> is in our review queue.
          </p>
          <p style="color:#64748b;font-size:13px;margin:0;">
            Once approved, it'll appear in the Union Opportunities board at tradepronexus.com/work
            and we'll notify matching trade pros in your area. Posting is free during the launch period.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function matchNotificationEmail({ firstName, trade, location }: { firstName: string; trade: string; location: string }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;">
          <div style="display:inline-block;background:#f9731622;border:1px solid #f9731655;border-radius:12px;padding:10px 14px;margin-bottom:20px;">
            <span style="color:#f97316;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">⚡ TradePro Nexus</span>
          </div>
          <h1 style="color:#f1f5f9;font-size:22px;font-weight:900;margin:0 0 8px;">New opportunity for you, ${firstName}</h1>
          <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
            A new <strong style="color:#f1f5f9;">${trade}</strong> opportunity matching your trade was posted in
            <strong style="color:#f1f5f9;">${location}</strong>.
          </p>
          <a href="https://tradepronexus.com/work" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
            View on tradepronexus.com/work
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function GET(request: NextRequest) {
  const auth = (await getSupabaseServer()) as any;
  const { data: { user } } = await auth.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.from("jobs").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trade, location_city, location_state, job_type, union_requirement,
      prevailing_wage, davis_bacon, description, contact_email, company_name,
    } = body as {
      trade: string;
      location_city?: string;
      location_state: string;
      job_type?: string;
      union_requirement?: string;
      prevailing_wage?: boolean;
      davis_bacon?: boolean;
      description: string;
      contact_email: string;
      company_name: string;
    };

    if (!trade?.trim() || !location_state?.trim() || !description?.trim() || !contact_email?.trim() || !company_name?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (job_type && !(JOB_TYPES as readonly string[]).includes(job_type)) {
      return NextResponse.json({ error: "Invalid job type." }, { status: 400 });
    }
    if (union_requirement && !(UNION_JOB_REQUIREMENTS as readonly string[]).includes(union_requirement)) {
      return NextResponse.json({ error: "Invalid union requirement." }, { status: 400 });
    }

    let posted_by_user_id: string | null = null;
    try {
      const authDb = (await getSupabaseServer()) as any;
      const { data: { user } } = await authDb.auth.getUser();
      posted_by_user_id = user?.id ?? null;
    } catch {
      // Not authenticated — anonymous posting still allowed
    }

    const db = getSupabaseAdmin() as any;
    const { data: job, error } = await db
      .from("jobs")
      .insert({
        trade: trade.trim(),
        location_city: location_city?.trim() || null,
        location_state: location_state.trim().toUpperCase(),
        job_type: job_type || JOB_TYPES[0],
        union_requirement: union_requirement || UNION_JOB_REQUIREMENTS[2],
        prevailing_wage: !!prevailing_wage,
        davis_bacon: !!davis_bacon,
        description: description.trim(),
        contact_email: contact_email.trim().toLowerCase(),
        company_name: company_name.trim(),
        posted_by_user_id,
      })
      .select()
      .single();

    if (error || !job) throw error ?? new Error("Insert failed");

    const location = job.location_city ? `${job.location_city}, ${job.location_state}` : job.location_state;

    try {
      await sendEmail({
        to: job.contact_email,
        subject: "Job posting received — TradePro Nexus",
        html: confirmationEmail({ companyName: job.company_name, trade: job.trade, location }),
      });
    } catch (emailErr) {
      console.error("Job confirmation email failed:", emailErr instanceof Error ? emailErr.message : String(emailErr));
    }

    // Match against available trade pros in the same state/trade
    let matchQuery = db
      .from("profiles")
      .select("first_name, email")
      .eq("trade", job.trade)
      .eq("location_state", job.location_state)
      .eq("availability_status", "available")
      .not("email", "is", null);

    if (job.union_requirement === "Union Only") {
      matchQuery = matchQuery.eq("union_member", true);
    }

    const { data: matches } = await matchQuery.limit(MAX_NOTIFICATIONS);

    for (const pro of matches ?? []) {
      try {
        await sendEmail({
          to: pro.email,
          subject: `New ${job.trade} opportunity in ${location}`,
          html: matchNotificationEmail({ firstName: pro.first_name, trade: job.trade, location }),
        });
      } catch (emailErr) {
        console.error("Job match email failed:", emailErr instanceof Error ? emailErr.message : String(emailErr));
      }
    }

    if (matches?.length) {
      await db.from("jobs").update({ notified_count: matches.length }).eq("id", job.id);
    }

    return NextResponse.json({ success: true, id: job.id });
  } catch (err) {
    console.error("Job posting error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
