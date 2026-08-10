import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@appointiq/sandbox';
import { ensureRuntime } from '@/lib/runtime';
import { ghlMode } from '@/lib/ghl';

/**
 * GHL webhook receiver. Real HighLevel (or the sandbox) POSTs events here with
 * an X-GHL-Signature HMAC. In sandbox mode the app subscribes its own URL so the
 * outbox shows real delivery attempts; in live mode this is the same endpoint
 * n8n or GHL's native webhooks hit.
 */
export async function POST(req: Request) {
  await ensureRuntime();
  const raw = await req.text();
  const signature = req.headers.get('X-GHL-Signature');
  const secret = process.env.WEBHOOK_SECRET ?? 'local-demo-secret';

  if (!verifyWebhookSignature(raw, secret, signature)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    /* keep empty payload */
  }

  return NextResponse.json({ received: true, mode: ghlMode(), event: payload }, { status: 200 });
}
