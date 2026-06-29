import { NextResponse, type NextRequest } from "next/server";

// POST /api/advertise -- sponsor inquiry form
// Fields: name, company, email, phone, what_you_sell
// Sends to andrew@tradepronexus.com via SendGrid
export async function POST(request: NextRequest) {
  try {
    const { name, company, email, phone, what_you_sell } = await request.json();
    if (!name?.trim() || !email?.trim() || !company?.trim()) {
      return NextResponse.json({ error: "Name, email, and company are required." }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY_NEXUS;
    if (apiKey) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: "andrew@tradepronexus.com" }] }],
          from: { email: "no-reply@tradepronexus.com", name: "TradePro Nexus" },
          reply_to: { email: email.trim(), name: name.trim() },
          subject: `Sponsorship Inquiry: ${company}`,
          content: [{
            type: "text/plain",
            value: [
              `Name: ${name}`,
              `Company: ${company}`,
              `Email: ${email}`,
              `Phone: ${phone ?? "(not provided)"}`,
              `What they sell: ${what_you_sell ?? "(not provided)"}`,
            ].join("\n"),
          }],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ submitted: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
