import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

function buildEmail({
  name,
  position,
  userType,
  referralCode,
  referralLink,
}: {
  name: string;
  position: number;
  userType: "pro" | "gc";
  referralCode: string;
  referralLink: string;
}) {
  const isPro = userType === "pro";
  const accentColor = isPro ? "#ea580c" : "#1d4ed8";
  const roleLabel = isPro ? "Trade Pro" : "General Contractor";
  const launchPerk = isPro
    ? "Early verification — your Trade Card goes live before public launch"
    : "Founder GC rate locked in forever, regardless of team size";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="display:inline-block;background:${accentColor}22;border:1px solid ${accentColor}55;border-radius:12px;padding:10px 14px;margin-bottom:20px;">
            <span style="color:${accentColor};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
              ${isPro ? "⚡" : "🏗"} TradePro Nexus
            </span>
          </div>
          <h1 style="color:#f1f5f9;font-size:24px;font-weight:900;margin:0 0 8px;">
            You're on the list, ${name.split(" ")[0]}.
          </h1>
          <p style="color:#94a3b8;font-size:15px;margin:0 0 28px;">
            Welcome to TradePro Nexus — the verified marketplace for construction.
          </p>
        </td></tr>

        <!-- Position card -->
        <tr><td style="padding:0 32px;">
          <div style="background:#0f172a;border-radius:12px;padding:20px;text-align:center;border:1px solid #334155;">
            <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px;">Your Position</p>
            <p style="color:${accentColor};font-size:42px;font-weight:900;margin:0 0 4px;">#${position}</p>
            <p style="color:#94a3b8;font-size:13px;margin:0;">${roleLabel} on the waitlist</p>
          </div>
        </td></tr>

        <!-- What to expect -->
        <tr><td style="padding:24px 32px 0;">
          <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;">What to expect</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              launchPerk,
              "Invitation email when we open the doors",
              "No spam — one email at launch, that's it",
            ].map(item => `
            <tr><td style="padding:6px 0;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:20px;vertical-align:top;padding-top:2px;">
                  <span style="color:#22c55e;font-size:14px;">✓</span>
                </td>
                <td style="color:#cbd5e1;font-size:14px;padding-left:8px;">${item}</td>
              </tr></table>
            </td></tr>`).join("")}
          </table>
        </td></tr>

        <!-- Referral -->
        <tr><td style="padding:24px 32px;">
          <div style="background:#${isPro ? "431407" : "1e3a5f"};border-radius:12px;padding:20px;border:1px solid #${isPro ? "7c2d12" : "1e40af"};">
            <p style="color:#f1f5f9;font-size:15px;font-weight:700;margin:0 0 6px;">Move up the list</p>
            <p style="color:#94a3b8;font-size:13px;margin:0 0 14px;">
              Invite another ${roleLabel} — every signup with your link moves you up one spot.
            </p>
            <div style="background:#0f172a;border-radius:8px;padding:12px;word-break:break-all;margin-bottom:14px;">
              <span style="color:${accentColor};font-size:12px;font-family:monospace;font-weight:600;">${referralLink}</span>
            </div>
            <div style="background:#0f172a;border-radius:8px;padding:8px 12px;display:inline-block;">
              <span style="color:#64748b;font-size:11px;">Your code: </span>
              <span style="color:#f1f5f9;font-size:12px;font-weight:700;font-family:monospace;">${referralCode}</span>
            </div>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 32px;text-align:center;border-top:1px solid #1e293b;">
          <p style="color:#475569;font-size:12px;margin:24px 0 0;">
            TradePro Nexus · A TradePro Enterprises product<br>
            <span style="color:#334155;">Verified by Paper. Not by Algorithm.</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendConfirmationEmail({
  to,
  name,
  position,
  userType,
  referralCode,
  referralLink,
}: {
  to: string;
  name: string;
  position: number;
  userType: "pro" | "gc";
  referralCode: string;
  referralLink: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY_NEXUS;
  console.log("Email debug — key present:", !!apiKey, "| prefix:", apiKey?.slice(0, 6) ?? "MISSING");
  if (!apiKey) return;

  const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "no-reply@tradepronexus.com", name: "TradePro Nexus" },
      subject: "You're on the list — TradePro Nexus",
      content: [{ type: "text/html", value: buildEmail({ name, position, userType, referralCode, referralLink }) }],
    }),
  });
  console.log("SendGrid response:", sgRes.status, await sgRes.text().catch(() => ""));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, user_type, referred_by, source } = body as {
      name: string;
      email: string;
      user_type: "pro" | "gc";
      referred_by?: string;
      source?: string;
    };

    if (!name?.trim() || !email?.trim() || !["pro", "gc"].includes(user_type)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await (db as any)
      .from("waitlist")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        user_type,
        referred_by: referred_by?.trim() || null,
        source: source?.trim() || null,
      })
      .select("position, referral_code")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That email is already on the list." },
          { status: 409 }
        );
      }
      throw error;
    }

    const { position, referral_code } = data as { position: number; referral_code: string };
    const origin = request.headers.get("origin") ?? "https://tradepronexus.com";
    const referralLink = `${origin}/?ref=${referral_code}`;

    // Await the email before returning — Vercel kills the function once the
    // response is sent, so fire-and-forget never completes in serverless.
    try {
      await sendConfirmationEmail({
        to: email.trim().toLowerCase(),
        name: name.trim(),
        position,
        userType: user_type,
        referralCode: referral_code,
        referralLink,
      });
    } catch (emailErr) {
      // Email failure never blocks signup — log it for debugging
      console.error("Waitlist email failed:", emailErr instanceof Error ? emailErr.message : String(emailErr));
    }

    return NextResponse.json({ position, referral_code });
  } catch (err: unknown) {
    // Log full details so we can diagnose from Vercel logs
    const detail = {
      message: err instanceof Error ? err.message : String(err),
      code: (err as any)?.code,
      details: (err as any)?.details,
      hint: (err as any)?.hint,
      url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT_SET").replace(/\/rest\/v1\/?$/, "").slice(-20),
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    console.error("Waitlist error full:", JSON.stringify(detail));
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
