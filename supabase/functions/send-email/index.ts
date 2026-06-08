import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore nodemailer has no Deno types
import nodemailer from "npm:nodemailer@6.9.14";
import { createHmac } from "node:crypto";

// ── Embedded templates ────────────────────────────────────────────────────────
// All four auth email types. CONFIRMATION_URL is replaced at send time.

const TMPL_SIGNUP = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1e293b;border-radius:10px;padding:8px;text-align:center;vertical-align:middle;">
        <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="52" height="52" rx="10" fill="#0f172a"/>
          <path d="M12 38 L26 14 L40 38" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M17 30 L35 30" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="26" cy="38" r="3.5" fill="#f97316"/>
          <path d="M22 14 L30 14" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:600;color:#f1f5f9;">TradePro</span>
        <span style="font-size:18px;font-weight:600;color:#f97316;"> Nexus</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px 32px 0;">
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Confirm your email</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">You're one step away from building your Digital Trading Card on TradePro Nexus. Click the button below to confirm your email address.</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="CONFIRMATION_URL" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Confirm Email Address</a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;">Or copy this link into your browser:</p>
      <p style="margin:0 0 28px;word-break:break-all;"><a href="CONFIRMATION_URL" style="color:#f97316;font-size:12px;font-family:monospace;">CONFIRMATION_URL</a></p>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">This link expires in 24 hours. If you didn't create a TradePro Nexus account, you can safely ignore this email.</p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">TradePro Nexus &middot; A TradePro Enterprises product<br><span style="color:#334155;">Verified by Paper. Not by Algorithm.</span></p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const TMPL_RECOVERY = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1e293b;border-radius:10px;padding:8px;text-align:center;vertical-align:middle;">
        <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="52" height="52" rx="10" fill="#0f172a"/>
          <path d="M12 38 L26 14 L40 38" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M17 30 L35 30" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="26" cy="38" r="3.5" fill="#f97316"/>
          <path d="M22 14 L30 14" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:600;color:#f1f5f9;">TradePro</span>
        <span style="font-size:18px;font-weight:600;color:#f97316;"> Nexus</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px 32px 0;">
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;">Reset your password</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">We received a request to reset your TradePro Nexus password. Click the button below to choose a new one.</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="CONFIRMATION_URL" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Reset Password</a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;">Or copy this link:</p>
      <p style="margin:0 0 28px;word-break:break-all;"><a href="CONFIRMATION_URL" style="color:#f97316;font-size:12px;font-family:monospace;">CONFIRMATION_URL</a></p>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">This link expires in 1 hour. If you didn't request a password reset, your account is safe.</p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">TradePro Nexus &middot; A TradePro Enterprises product</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const TMPL_MAGIC = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1e293b;border-radius:10px;padding:8px;text-align:center;vertical-align:middle;">
        <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="52" height="52" rx="10" fill="#0f172a"/>
          <path d="M12 38 L26 14 L40 38" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M17 30 L35 30" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="26" cy="38" r="3.5" fill="#f97316"/>
          <path d="M22 14 L30 14" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:600;color:#f1f5f9;">TradePro</span>
        <span style="font-size:18px;font-weight:600;color:#f97316;"> Nexus</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px 32px 0;">
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;">Your sign-in link</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">Click the button below to sign in to TradePro Nexus. This link is single-use and expires in 1 hour.</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="CONFIRMATION_URL" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Sign In to TradePro Nexus</a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;">Or copy this link:</p>
      <p style="margin:0 0 28px;word-break:break-all;"><a href="CONFIRMATION_URL" style="color:#f97316;font-size:12px;font-family:monospace;">CONFIRMATION_URL</a></p>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:12px;">If you didn't request this link, ignore this email.</p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">TradePro Nexus &middot; A TradePro Enterprises product</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const TMPL_EMAIL_CHANGE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:#1e293b;border-radius:10px;padding:8px;text-align:center;vertical-align:middle;">
        <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="52" height="52" rx="10" fill="#0f172a"/>
          <path d="M12 38 L26 14 L40 38" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M17 30 L35 30" stroke="#f1f5f9" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="26" cy="38" r="3.5" fill="#f97316"/>
          <path d="M22 14 L30 14" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:600;color:#f1f5f9;">TradePro</span>
        <span style="font-size:18px;font-weight:600;color:#f97316;"> Nexus</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px 32px 0;">
      <h1 style="margin:0 0 8px;color:#f1f5f9;font-size:22px;font-weight:800;">Confirm your new email</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">You requested an email change on your TradePro Nexus account. Click below to confirm your new email address.</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#f97316;border-radius:12px;">
          <a href="CONFIRMATION_URL" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Confirm New Email</a>
        </td></tr>
      </table>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;">Or copy this link:</p>
      <p style="margin:0 0 28px;word-break:break-all;"><a href="CONFIRMATION_URL" style="color:#f97316;font-size:12px;font-family:monospace;">CONFIRMATION_URL</a></p>
      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:28px;">
        <p style="margin:0;color:#64748b;font-size:12px;">If you didn't request this change, contact us immediately.</p>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">TradePro Nexus &middot; A TradePro Enterprises product</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

// ── Config (from edge function secrets) ──────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SMTP_HOST    = Deno.env.get("SMTP_HOST")!;
const SMTP_PORT    = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
const SMTP_USER    = Deno.env.get("SMTP_USER")!;
const SMTP_PASS    = Deno.env.get("SMTP_PASS")!;
const SMTP_FROM    = Deno.env.get("SMTP_FROM") ?? "TradePro Nexus <no-reply@tradepronexus.com>";
const HOOK_SECRET  = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: string, sigHeader: string): boolean {
  if (!HOOK_SECRET) return true; // no secret = skip verification
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) parts[k] = v;
  }
  const { t, v1 } = parts;
  if (!t || !v1) return false;
  const expected = createHmac("sha256", HOOK_SECRET)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

// ── Per-action helpers ────────────────────────────────────────────────────────

function getSubject(actionType: string): string {
  switch (actionType) {
    case "recovery":             return "Reset your TradePro Nexus password";
    case "magiclink":            return "Your TradePro Nexus sign-in link";
    case "email_change_new":
    case "email_change_current": return "Confirm your new email — TradePro Nexus";
    default:                     return "Confirm your TradePro Nexus account";
  }
}

function getTemplate(actionType: string): string {
  switch (actionType) {
    case "recovery":             return TMPL_RECOVERY;
    case "magiclink":            return TMPL_MAGIC;
    case "email_change_new":
    case "email_change_current": return TMPL_EMAIL_CHANGE;
    default:                     return TMPL_SIGNUP;
  }
}

function getVerifyType(actionType: string): string {
  switch (actionType) {
    case "recovery":             return "recovery";
    case "magiclink":            return "magiclink";
    case "email_change_new":
    case "email_change_current": return "email_change";
    default:                     return "signup";
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get("x-supabase-signature") ?? "")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: { user: { email: string }; email_data: Record<string, string> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user, email_data } = payload;
  if (!user?.email || !email_data) {
    return new Response(JSON.stringify({ error: "Missing payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const actionType     = email_data.email_action_type ?? "signup";
  const tokenHash      = actionType === "email_change_new" && email_data.token_hash_new
    ? email_data.token_hash_new
    : email_data.token_hash;
  const redirectTo     = email_data.redirect_to
    ?? `${email_data.site_url ?? "https://www.tradepronexus.com"}/auth/callback`;
  const confirmationURL =
    `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${getVerifyType(actionType)}&redirect_to=${encodeURIComponent(redirectTo)}`;

  const html = getTemplate(actionType).replaceAll("CONFIRMATION_URL", confirmationURL);

  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from:    SMTP_FROM,
    to:      user.email,
    subject: getSubject(actionType),
    html,
  });

  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
});
