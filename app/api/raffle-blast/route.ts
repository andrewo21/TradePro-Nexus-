import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// POST /api/admin/raffle/send-reminder-blast
// One-time raffle reminder blast to real, unqualified signups.
// Triggered manually with a shared secret (not part of any recurring flow).
// Excludes seed accounts, admin accounts, internal accounts, and Andrew's
// own known addresses as a safety net on top of the is_internal filter.

const SENDGRID_KEY     = process.env.SENDGRID_API_KEY_NEXUS ?? "";
const FROM_EMAIL       = "andrew@tradepronexus.com";
const FROM_NAME        = "Andrew O'Neill at TradePro Nexus";
const PHYSICAL_ADDRESS = "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";
const SITE_URL         = "https://www.tradepronexus.com";

const OWN_EMAILS = new Set([
  "andrew@tradepronexus.com",
  "andrew@tradeprotech.ai",
  "contato@tradeprotech.ai",
  "oneilldevelopmentgroup@outlook.com",
]);

function buildEmailHtml(firstName: string, referralLink: string): string {
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
      <h1 style="margin:0 0 20px;color:#f1f5f9;font-size:20px;font-weight:900;">You are one post away from winning a Milwaukee M18 Combo Kit</h1>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">Hey ${firstName},</p>

      <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        You signed up for TradePro Nexus but you are not in the raffle yet.
      </p>

      <p style="margin:0 0 8px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        Here is what you need to do:
      </p>

      <ul style="margin:0 0 16px;padding-left:20px;color:#e2e8f0;font-size:15px;line-height:1.8;">
        <li>Make one post on the Live Feed</li>
        <li>Refer 2 friends who sign up using your referral link</li>
      </ul>

      <p style="margin:0 0 24px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        That is it. You are entered to win a Milwaukee M18 Combo Kit valued at $299.99. Drawing August 1st.
      </p>

      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Your referral link:</p>
        <a href="${referralLink}" style="color:#f97316;font-size:13px;font-weight:700;word-break:break-all;">${referralLink}</a>
      </div>

      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${SITE_URL}/feed" style="display:block;padding:14px 28px;color:#fff;font-weight:800;font-size:15px;text-decoration:none;">Head to the Live Feed and Post Now</a>
        </td></tr>
      </table>

      <p style="margin:0 0 4px;color:#f1f5f9;font-size:15px;font-weight:700;">Andrew O'Neill</p>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Founder, TradePro Nexus</p>
      <a href="${SITE_URL}" style="color:#f97316;font-size:13px;">${SITE_URL}</a>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:11px;line-height:1.6;">${PHYSICAL_ADDRESS}</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendViaSendGrid(toEmail: string, html: string): Promise<{ ok: boolean; error: string | null }> {
  if (!SENDGRID_KEY) return { ok: false, error: "SENDGRID_API_KEY_NEXUS not configured" };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: "andrew@tradepronexus.com", name: FROM_NAME },
        subject: "You are one post away from winning a Milwaukee M18 Combo Kit",
        content: [{ type: "text/html", value: html }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `SendGrid ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-blast-secret");
  if (!process.env.RAFFLE_BLAST_SECRET || secret !== process.env.RAFFLE_BLAST_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry_run") === "true";
  const db = getSupabaseAdmin() as any;

  const { data: profiles } = await db
    .from("profiles")
    .select("id, user_id, first_name, last_name, referral_code, is_internal")
    .eq("is_seed_account", false)
    .eq("is_admin", false)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  const { data: entrants } = await db
    .from("raffle_entrants")
    .select("user_id, qualified");
  const qualifiedByUser = new Map<string, boolean>();
  for (const e of entrants ?? []) {
    if (e.qualified) qualifiedByUser.set(e.user_id, true);
  }

  const candidates = (profiles ?? []).filter((p: any) => !qualifiedByUser.get(p.user_id));

  const seenEmails = new Set<string>();
  const results: { email: string; name: string; status: string }[] = [];
  let sent = 0;

  for (const p of candidates) {
    const { data: authUser } = await db.auth.admin.getUserById(p.user_id);
    const email = authUser?.user?.email;
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();

    if (!email) { results.push({ email: "(none)", name, status: "skipped_no_email" }); continue; }
    if (OWN_EMAILS.has(email.toLowerCase())) { results.push({ email, name, status: "skipped_own_address" }); continue; }
    if (seenEmails.has(email.toLowerCase())) { results.push({ email, name, status: "skipped_duplicate_email" }); continue; }
    seenEmails.add(email.toLowerCase());

    if (dryRun) { results.push({ email, name, status: "would_send" }); continue; }

    const referralLink = `${SITE_URL}/signup?ref=${p.referral_code}`;
    const html = buildEmailHtml(p.first_name || "there", referralLink);
    const result = await sendViaSendGrid(email, html);
    if (result.ok) sent++;
    results.push({ email, name, status: result.ok ? "sent" : `failed: ${result.error}` });
  }

  return NextResponse.json({ dryRun, totalCandidates: candidates.length, sent, results });
}
