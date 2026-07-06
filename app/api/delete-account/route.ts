import { NextResponse, type NextRequest } from "next/server";

// POST /api/delete-account -- account deletion request form
// Fields: email
// Sends to andrew@tradepronexus.com via SendGrid
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const trimmed = (email ?? "").trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY_NEXUS;
    if (apiKey) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: "andrew@tradepronexus.com" }] }],
          from: { email: "no-reply@tradepronexus.com", name: "TradePro Nexus" },
          reply_to: { email: trimmed },
          subject: "Account Deletion Request",
          content: [
            {
              type: "text/plain",
              value: `Account deletion request submitted.\n\nEmail: ${trimmed}`,
            },
          ],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ submitted: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
