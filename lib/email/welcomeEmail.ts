const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL        = "andrew@tradepronexus.com";
const FROM_NAME         = "Andrew O'Neill at TradePro Nexus";
const SITE_URL          = "https://www.tradepronexus.com";
const PHYSICAL_ADDRESS  = "17629 Fallen Branch Way, Punta Gorda, FL 33982";

// Extract a greeting name from a business or full name — use the first word if it
// looks like a personal name (alpha only, 2-15 chars), otherwise fall back to "there".
export function extractGreetingName(name: string): string {
  const first = (name || "").split(/\s+/)[0] ?? "";
  const clean = first.replace(/[^a-zA-Z]/g, "");
  if (clean.length >= 2 && clean.length <= 15) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  return "there";
}

function buildWelcomeEmailHtml(opts: {
  greetingName: string;
  introLine: string;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:580px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:36px 36px 28px;">

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">Hi ${opts.greetingName},</p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        My name is Andrew O'Neill and I am a 30 year veteran of the commercial construction industry.
      </p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        I built TradePro Nexus because our industry deserved better than phone calls to buddies
        and gut instinct when finding the right crews or the right work. We needed a professional
        home built specifically for the trades, not adapted from a resume tool or a homeowner app.
      </p>

      <p style="margin:0 0 20px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        ${opts.introLine}
      </p>

      <p style="margin:0 0 12px;color:#f1f5f9;font-size:15px;font-weight:700;">Here is what makes this platform powerful for you:</p>

      <p style="margin:0 0 20px;color:#94a3b8;font-size:15px;line-height:1.7;">
        The more complete your profile the more likely a GC searching for crews in your market
        finds you first. Add your trade, certifications, crew size, availability, and union
        affiliation if applicable. It takes five minutes and it puts you in front of contractors
        who are actively looking for people like you.
      </p>

      <p style="margin:0 0 8px;color:#f1f5f9;font-size:15px;font-weight:700;">A few things worth knowing:</p>
      <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">Your Trade Card is always free</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">The Available for Work toggle lets GCs know you are ready for new opportunities</p>
        <p style="margin:0 0 8px;color:#94a3b8;font-size:14px;line-height:1.6;">The Live Feed is where the community grows, start posting today</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">Refer 3 trade professionals and earn 20% off your verification badge when it launches</p>
      </div>

      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${opts.ctaUrl}" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">
            ${opts.ctaLabel}
          </a>
        </td></tr>
      </table>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        This platform is yours. I built it for us.
      </p>

      <p style="margin:0 0 4px;color:#e2e8f0;font-size:15px;line-height:1.7;">See you around.</p>

      <p style="margin:0 0 4px;color:#f1f5f9;font-size:15px;font-weight:700;line-height:1.7;">Andrew O'Neill</p>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;line-height:1.6;">Founder, TradePro Nexus</p>
      <a href="${SITE_URL}" style="color:#f97316;font-size:13px;text-decoration:none;">${SITE_URL}</a>
      <p style="margin:8px 0 0;color:#475569;font-size:12px;font-style:italic;">Verified by Paper. Not by Algorithm.</p>

    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;line-height:1.6;">
        TradePro Technologies LLC | TradePro Nexus<br>
        ${PHYSICAL_ADDRESS}<br>
        <a href="${SITE_URL}/unsubscribe" style="color:#64748b;">Unsubscribe</a>
      </p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Sends the shared welcome/onboarding email. Returns a result instead of swallowing
// failures, so callers can log and the send is diagnosable rather than silent.
export async function sendWelcomeEmail(opts: {
  to: string;
  subject: string;
  greetingName: string;
  introLine: string;
  ctaUrl: string;
  ctaLabel: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    return { ok: false, error: "SENDGRID_API_KEY_NEXUS is not set" };
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
        subject: opts.subject,
        content: [{
          type: "text/html",
          value: buildWelcomeEmailHtml({
            greetingName: opts.greetingName,
            introLine: opts.introLine,
            ctaUrl: opts.ctaUrl,
            ctaLabel: opts.ctaLabel,
          }),
        }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `SendGrid ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown send error" };
  }
}
