// GET /api/admin/email-test?to=your@email.com
// Returns the raw SendGrid API response so we can see exactly what's happening.
// Remove this file after debugging is complete.

import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") ?? "andrew@tradeprotech.ai";
  const apiKey = process.env.SENDGRID_API_KEY_NEXUS;

  if (!apiKey) {
    return NextResponse.json({ error: "SENDGRID_API_KEY_NEXUS not set" }, { status: 500 });
  }

  try {
    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "no-reply@tradepronexus.com", name: "TradePro Nexus" },
        subject: "Email test — TradePro Nexus",
        content: [{ type: "text/plain", value: "This is a test email from the debug endpoint." }],
      }),
    });

    const responseBody = await sgRes.text();

    return NextResponse.json({
      status: sgRes.status,
      statusText: sgRes.statusText,
      keyPrefix: apiKey.slice(0, 8),
      to,
      from: "no-reply@tradepronexus.com",
      sendgridResponse: responseBody || "(empty — 202 means success)",
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      keyPrefix: apiKey.slice(0, 8),
    }, { status: 500 });
  }
}
