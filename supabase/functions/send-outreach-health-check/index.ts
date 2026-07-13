import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Daily outreach health check.
// Runs once daily via pg_cron. Internal notification to Andrew only, not
// consumer-facing -- no CAN-SPAM unsubscribe footer needed, just the
// standard company address line for consistency with other templates.
//
// Reports both the raw SendGrid click count and Real Human Clicks
// (opened before clicked, and clicked more than 30 seconds after sending --
// filters out bot/scanner clicks) side by side, plus current queue state,
// so a stuck or misleadingly-inflated-looking queue is visible at a glance
// without having to open the admin dashboard.

const SITE_URL         = "https://www.tradepronexus.com";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY_NEXUS") ?? "";
const FROM_EMAIL        = "andrew@tradepronexus.com";
const FROM_NAME         = "TradePro Nexus";
const TO_EMAIL           = "andrew@tradepronexus.com";

type QueuePhase = { state: string; mode: "new" | "resend"; requires_flag?: string };

function statBlock(label: string, value: string, color: string): string {
  return `
    <td style="padding:12px 10px;text-align:center;">
      <p style="margin:0 0 4px;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${label}</p>
      <p style="margin:0;color:${color};font-size:22px;font-weight:900;">${value}</p>
    </td>`;
}

function buildEmailHtml(opts: {
  totalSent: number;
  sentToday: number;
  delivered: number;
  opened: number;
  clicked: number;
  realClicks: number;
  bounced: number;
  unsubscribed: number;
  dailyCap: number;
  queueStatus: string;
  physicalAddress: string;
}): string {
  const realClickPct = opts.clicked > 0 ? Math.round((opts.realClicks / opts.clicked) * 100) : 0;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:560px;">
  <tr><td align="center" style="padding-bottom:24px;">
    <span style="font-size:20px;font-weight:900;color:#f1f5f9;">TradePro <span style="color:#f97316;">Nexus</span></span>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
    <tr><td style="background:#f97316;height:4px;"></td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 4px;color:#f1f5f9;font-size:18px;font-weight:900;">Daily Outreach Health Check</h1>
      <p style="margin:0 0 20px;color:#64748b;font-size:12px;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;margin-bottom:16px;">
        <tr>
          ${statBlock("Sent Today", opts.sentToday.toLocaleString(), "#4ade80")}
          ${statBlock("Total Sent", opts.totalSent.toLocaleString(), "#4ade80")}
          ${statBlock("Delivered", opts.delivered.toLocaleString(), "#4ade80")}
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;margin-bottom:16px;">
        <tr>
          ${statBlock("Opened", opts.opened.toLocaleString(), "#60a5fa")}
          ${statBlock("Clicked (raw)", opts.clicked.toLocaleString(), "#60a5fa")}
          ${statBlock("Real Human Clicks", opts.realClicks.toLocaleString(), "#f97316")}
        </tr>
      </table>

      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          <strong style="color:#f1f5f9;">${realClickPct}%</strong> of raw clicks are real human clicks (opened before clicking, and clicked more than 30 seconds after sending). The rest is corporate email scanners auto-fetching links, which is normal for B2B outreach and not a sign the claim flow is broken.
        </p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;margin-bottom:20px;">
        <tr>
          ${statBlock("Bounced", opts.bounced.toLocaleString(), "#f87171")}
          ${statBlock("Unsubscribed", opts.unsubscribed.toLocaleString(), "#cbd5e1")}
          ${statBlock("Daily Cap", opts.dailyCap.toLocaleString(), "#cbd5e1")}
        </tr>
      </table>

      <div style="background:#0f172a;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Queue Status</p>
        <p style="margin:0;color:#e2e8f0;font-size:13px;">${opts.queueStatus}</p>
      </div>

      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr><td style="background:#f97316;border-radius:12px;text-align:center;">
          <a href="${SITE_URL}/admin/registry" style="display:block;padding:14px 28px;color:#ffffff;font-weight:800;font-size:15px;text-decoration:none;">
            View Full Dashboard
          </a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0 0 4px;color:#475569;font-size:11px;">TradePro Technologies LLC | TradePro Nexus</p>
      <p style="margin:0;color:#475569;font-size:11px;">${opts.physicalAddress}</p>
    </td></tr>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendViaSendGrid(toEmail: string, subject: string, html: string): Promise<{ ok: boolean; error: string | null }> {
  if (!SENDGRID_API_KEY) {
    return { ok: false, error: "SENDGRID_API_KEY_NEXUS not configured" };
  }
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
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

function describeQueue(queue: QueuePhase[], index: number, vaConfirmed: boolean, enabled: boolean): string {
  if (!enabled) return "Outreach is currently disabled (outreach_enabled = false).";
  if (index >= queue.length) return "Queue complete -- every phase has been exhausted.";
  const phase = queue[index];
  const modeLabel = phase.mode === "resend" ? "re-send" : "never-contacted";
  if (phase.requires_flag && !vaConfirmed) {
    return `Waiting on ${phase.state} (${modeLabel}) -- gated behind ${phase.requires_flag}, not yet confirmed.`;
  }
  return `Active phase: ${phase.state} (${modeLabel}).`;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await req.json().catch(() => ({}));
  const forceTest = body.force_test === true;
  const toEmail = forceTest && body.test_email ? body.test_email : TO_EMAIL;

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", [
      "outreach_enabled",
      "outreach_daily_cap",
      "outreach_physical_address",
      "outreach_queue_json",
      "outreach_queue_index",
      "outreach_va_bounce_confirmed",
    ]);
  const sm: Record<string, string> = {};
  for (const r of settings ?? []) sm[r.key] = r.value;

  const physicalAddress = sm["outreach_physical_address"] || "TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982";
  const dailyCap = Math.max(1, parseInt(sm["outreach_daily_cap"] ?? "1000") || 1000);
  const enabled = sm["outreach_enabled"] === "true";
  const vaConfirmed = sm["outreach_va_bounce_confirmed"] === "true";

  let queue: QueuePhase[] = [];
  try { queue = JSON.parse(sm["outreach_queue_json"] || "[]"); } catch { queue = []; }
  const queueIndex = parseInt(sm["outreach_queue_index"] ?? "0") || 0;
  const queueStatus = describeQueue(queue, queueIndex, vaConfirmed, enabled);

  const { data: engagementRows } = await supabase.rpc("outreach_engagement_summary");
  const engagement = engagementRows?.[0] ?? {
    total_sent: 0, delivered: 0, opened: 0, clicked: 0, real_clicks: 0, bounced: 0, unsubscribed: 0, sent_today: 0,
  };

  const html = buildEmailHtml({
    totalSent: Number(engagement.total_sent),
    sentToday: Number(engagement.sent_today),
    delivered: Number(engagement.delivered),
    opened: Number(engagement.opened),
    clicked: Number(engagement.clicked),
    realClicks: Number(engagement.real_clicks ?? 0),
    bounced: Number(engagement.bounced),
    unsubscribed: Number(engagement.unsubscribed),
    dailyCap,
    queueStatus,
    physicalAddress,
  });

  const result = await sendViaSendGrid(toEmail, "Daily Outreach Health Check", html);

  return new Response(
    JSON.stringify({ ok: result.ok, error: result.error, sentTo: toEmail }),
    { headers: { "Content-Type": "application/json" } }
  );
});
