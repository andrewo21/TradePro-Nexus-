import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// POST /api/sendgrid-webhook
// Receives SendGrid Event Webhooks and writes engagement data back to outreach_log.
//
// Events handled:
//   open           → opened_at
//   click          → clicked_at
//   bounce/blocked → bounced_at + status = 'bounced'
//   unsubscribe / group_unsubscribe → unsubscribed_at + status = 'unsubscribed'
//   spamreport     → spam_reported_at + status = 'unsubscribed'
//
// SendGrid sends the full sg_message_id as "abc123.filterdrecv-xxx".
// We store only the prefix before the first dot, matching how SendGrid
// returns x-message-id in the send response header.
//
// Signature verification: set SENDGRID_WEBHOOK_KEY in Vercel env vars
// (found in SendGrid → Settings → Mail Settings → Event Webhook → Signature).
// If not set, webhook still processes but skips verification (dev mode).

export const runtime = "nodejs";

// SendGrid event type → which outreach_log field to set
const EVENT_MAP: Record<string, { field: string; status?: string }> = {
  open:              { field: "opened_at" },
  click:             { field: "clicked_at" },
  bounce:            { field: "bounced_at",       status: "bounced" },
  blocked:           { field: "bounced_at",       status: "bounced" },
  dropped:           { field: "bounced_at",       status: "bounced" },
  unsubscribe:       { field: "unsubscribed_at",  status: "unsubscribed" },
  group_unsubscribe: { field: "unsubscribed_at",  status: "unsubscribed" },
  spamreport:        { field: "spam_reported_at", status: "unsubscribed" },
};

// sg_message_id arrives as "abc123.filterdrecv-p..." — we stored only "abc123"
function normalizeMessageId(raw: string): string {
  return raw ? raw.split(".")[0] : raw;
}

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const signingKey = process.env.SENDGRID_WEBHOOK_KEY;
  if (!signingKey) return true; // skip in dev if key not configured

  const signature  = req.headers.get("x-twilio-email-event-webhook-signature") ?? "";
  const timestamp  = req.headers.get("x-twilio-email-event-webhook-timestamp") ?? "";
  if (!signature || !timestamp) return false;

  try {
    const { createVerify } = await import("crypto");
    const payload = timestamp + rawBody;
    const verify  = createVerify("SHA256");
    verify.update(payload);
    return verify.verify(
      `-----BEGIN PUBLIC KEY-----\n${signingKey}\n-----END PUBLIC KEY-----`,
      signature,
      "base64"
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifySignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events: Record<string, unknown>[];
  try {
    events = JSON.parse(rawBody);
    if (!Array.isArray(events)) events = [events];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getSupabaseAdmin() as any;
  let processed = 0;

  for (const event of events) {
    const eventType = String(event.event ?? "");
    const mapping   = EVENT_MAP[eventType];
    if (!mapping) continue; // ignore delivered, deferred, etc.

    const rawId    = String(event.sg_message_id ?? event.messageId ?? "");
    const msgId    = normalizeMessageId(rawId);
    if (!msgId) continue;

    const ts = event.timestamp
      ? new Date(Number(event.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    const update: Record<string, string> = { [mapping.field]: ts };
    if (mapping.status) update.status = mapping.status;

    const { error } = await db
      .from("outreach_log")
      .update(update)
      .eq("sendgrid_message_id", msgId)
      .is(mapping.field, null); // only set on first occurrence

    if (!error) processed++;
  }

  return NextResponse.json({ ok: true, processed, total: events.length });
}

// SendGrid will GET the URL to confirm it's reachable during setup
export async function GET() {
  return NextResponse.json({ ok: true, service: "TradePro Nexus SendGrid Webhook" });
}
