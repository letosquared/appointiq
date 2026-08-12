import { NextResponse } from 'next/server';
import { getSandboxStore } from '@/lib/ghl';
import type { OutboxMessage } from '@/lib/automation';

/**
 * Demo "Approve & send". The pipeline drafts replies and queues them for a
 * human in the loop (status `queued`); this endpoint flips messages to `sent`,
 * mimicking the practice manager hitting send in WhatsApp / SMS / email. n8n
 * could call the same endpoint on a schedule.
 *
 * Body is optional: send no body to approve every queued message, or pass
 * `{ ids: [...] }` to approve a specific set (per-message approve/retry).
 */
export async function POST(req: Request) {
  const store = getSandboxStore();
  const outbox = (await store.getCollection<OutboxMessage>('outbox')) ?? [];

  let ids: string[] | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
    if (body.ids !== undefined) {
      ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    }
  } catch {
    /* treat as approve-all */
  }

  let sent = 0;
  for (const m of outbox) {
    if (m.status !== 'queued' && m.status !== 'failed') continue;
    if (ids && !ids.includes(m.id)) continue;
    m.status = 'sent';
    sent++;
  }
  await store.putCollection('outbox', outbox);
  return NextResponse.json({
    ok: true,
    sent,
    queued: outbox.filter((m) => m.status === 'queued').length,
    failed: outbox.filter((m) => m.status === 'failed').length,
  });
}
