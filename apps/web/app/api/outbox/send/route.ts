import { NextResponse } from 'next/server';
import { getSandboxStore } from '@/lib/ghl';
import type { OutboxMessage } from '@/lib/automation';

/**
 * Demo "Approve & send". The pipeline drafts replies and queues them for a
 * human in the loop (status `queued`); this endpoint flips every queued
 * message to `sent`, mimicking the practice manager hitting send in
 * WhatsApp / SMS / email. n8n could call the same endpoint on a schedule.
 */
export async function POST() {
  const store = getSandboxStore();
  const outbox = (await store.getCollection<OutboxMessage>('outbox')) ?? [];
  let sent = 0;
  for (const m of outbox) {
    if (m.status === 'queued') {
      m.status = 'sent';
      sent++;
    }
  }
  await store.putCollection('outbox', outbox);
  return NextResponse.json({ ok: true, sent, queued: outbox.filter((m) => m.status === 'queued').length });
}
