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

function diagLog(msg: string) {
  console.error(`[sendgrid-webhook][diag] ${msg}`);
}

async function verifySignature(req: NextRequest, rawBody: Buffer): Promise<boolean> {
  const signingKey = process.env.SENDGRID_WEBHOOK_KEY;
  if (!signingKey) {
    diagLog("SENDGRID_WEBHOOK_KEY not set — skipping verification (dev mode)");
    return true;
  }

  const signature = req.headers.get("x-twilio-email-event-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-twilio-email-event-webhook-timestamp") ?? "";
  if (!signature || !timestamp) {
    diagLog(`missing header(s) — signature present=${!!signature} timestamp present=${!!timestamp}`);
    return false;
  }

  try {
    const { createVerify } = await import("crypto");

    // Strip PEM headers/whitespace if the stored key already includes them,
    // then re-wrap so it parses regardless of how the value was pasted in.
    const rawKey = signingKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, "")
      .replace(/-----END PUBLIC KEY-----/g, "")
      .replace(/\s+/g, "");
    const pem = `-----BEGIN PUBLIC KEY-----\n${rawKey}\n-----END PUBLIC KEY-----`;

    // Sign over the raw bytes exactly as SendGrid sent them — string
    // concatenation risks an encoding mismatch, Buffer concatenation does not.
    const payload = Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]);
    const verify  = createVerify("SHA256");
    verify.update(payload);

    // SendGrid signs with ECDSA P-256; signature arrives in IEEE P1363 encoding
    // (raw r+s), not DER. Node requires dsaEncoding to be set explicitly.
    const result = verify.verify(
      { key: pem, dsaEncoding: "ieee-p1363" } as Parameters<typeof verify.verify>[0],
      signature,
      "base64"
    );
    if (!result) {
      diagLog(
        `verify() returned false — keyLen=${rawKey.length} sigLen=${signature.length} ts=${timestamp} bodyLen=${rawBody.length} keyPrefix=${rawKey.slice(0, 12)}`
      );
    }
    return result;
  } catch (err) {
    diagLog(`verify() threw — ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBodyBuf = Buffer.from(await req.arrayBuffer());

  const valid = await verifySignature(req, rawBodyBuf);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let events: Record<string, unknown>[];
  try {
    events = JSON.parse(rawBodyBuf.toString("utf8"));
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
