import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// POST /api/advertise — advertiser contact form submission
// Sends via SendGrid and stores in DB (future: ad_inquiries table)
export async function POST(request: NextRequest) {
  try {
    const { name, email, company, message } = await request.json();
    if (!name?.trim() || !email?.trim() || !company?.trim()) {
      return NextResponse.json({ error: "Name, email, and company are required." }, { status: 400 });
    }

    // Send notification email to andrew@tradeprotech.ai
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: "andrew@tradeprotech.ai" }] }],
          from: { email: "no-reply@tradepronexus.com", name: "TradePro Nexus" },
          subject: `New Ad Inquiry — ${company}`,
          content: [{
            type: "text/plain",
            value: `From: ${name} <${email}>\nCompany: ${company}\n\nMessage:\n${message ?? "(none)"}`,
          }],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ submitted: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
