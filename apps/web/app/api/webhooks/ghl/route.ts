import { NextResponse } from 'next/server';
import type { WebhookEnvelope } from '@appointiq/ghl';
import { verifyWebhookSignature } from '@appointiq/sandbox';
import { ensureRuntime } from '@/lib/runtime';
import { ghlMode } from '@/lib/ghl';
import { runLeadPipeline } from '@/lib/automation';
import { getGhlClient } from '@/lib/ghl';

/**
 * GHL webhook receiver. Real HighLevel (or the sandbox) POSTs events here with
 * an X-GHL-Signature HMAC. In sandbox mode the app subscribes its own URL so the
 * webhook outbox shows real delivery attempts; in live mode this is the same
 * endpoint n8n or GHL's native webhooks hit.
 *
 * On ContactCreated we run the same lead pipeline the /api/demo/lead route uses
 * (score → draft → route → auto-book), so a real inbound contact — created by
 * n8n, the live API, or a form — is qualified end-to-end from the webhook alone.
 * Contacts created through the demo simulator carry an `origin=demo-api` custom
 * field and are skipped here: that route already ran the pipeline with the full
 * inbound message, and the pipeline itself is idempotent per contact.
 */
export async function POST(req: Request) {
  await ensureRuntime();
  const raw = await req.text();
  const signature = req.headers.get('X-GHL-Signature');
  const secret = process.env.WEBHOOK_SECRET ?? 'local-demo-secret';

  if (!verifyWebhookSignature(raw, secret, signature)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  let payload: WebhookEnvelope | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as WebhookEnvelope) : null;
  } catch {
    /* keep null payload */
  }

  const contactId = payload?.type === 'ContactCreated' ? String(payload.data?.contactId ?? payload.id ?? '') : '';

  if (contactId) {
    try {
      const client = getGhlClient();
      const contact = await client.contacts.get(contactId).catch(() => null);
      const origin = contact?.customFields?.find((f) => f.id === 'cf_origin')?.value;
      if (origin !== 'demo-api') {
        await runLeadPipeline(contactId);
      }
    } catch {
      /* a webhook that fails to process must still return 200 — GHL retries otherwise */
    }
  }

  return NextResponse.json({ received: true, mode: ghlMode(), event: payload }, { status: 200 });
}
