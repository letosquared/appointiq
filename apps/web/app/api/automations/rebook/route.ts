import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGhlClient, getSandboxStore } from '@/lib/ghl';
import { ensureRuntime } from '@/lib/runtime';
import { recordRun, contactName, type OutboxMessage } from '@/lib/automation';
import { safeEqual } from '@/lib/auth';

/**
 * n8n target for the no-show → rebooking flow. Given a no-show appointment,
 * finds the next free slot on the same calendar and books it, then queues a
 * "sorry we missed you" WhatsApp message to the patient.
 */
const bodySchema = z.object({
  appointmentId: z.string().min(1),
});

export async function POST(req: Request) {
  await ensureRuntime();
  const expected = process.env.WEBHOOK_SECRET ?? 'local-demo-secret';
  const provided = req.headers.get('x-api-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }

  const client = getGhlClient();
  const appt = await client.appointments.get(parsed.data.appointmentId).catch(() => null);
  if (!appt) return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });

  const startKey = new Date().toISOString().slice(0, 10);
  const endKey = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const slots = await client.calendars
    .freeSlots(appt.calendarId, { startDate: startKey, endDate: endKey, timezone: 'Africa/Nairobi' })
    .catch(() => null);
  const next = slots ? Object.values(slots)[0]?.slots?.[0] : undefined;
  if (!next) {
    return NextResponse.json({ ok: false, reason: 'no free slot in the next 7 days' }, { status: 409 });
  }

  const created = await client.appointments.create({
    calendarId: appt.calendarId,
    contactId: appt.contactId,
    startTime: next,
    locationId: process.env.GHL_LOCATION_ID ?? '',
    title: appt.title ?? 'Re-booked after no-show',
    assignedUserId: appt.assignedUserId,
  });

  const contact = await client.contacts.get(appt.contactId).catch(() => null);
  const name = contact ? contactName(contact) : 'there';
  const when = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(next));
  const msgBody =
    `Hello ${name}, we noticed you missed your appointment at Mercy Medical Centre. ` +
    `We have rebooked you for ${when}. Reply "change" if you need a different time, or call +254 729 370 022.`;

  const outbox = (await getSandboxStore().getCollection<OutboxMessage>('outbox')) ?? [];
  outbox.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    to: contact?.phone || contact?.email || '',
    name,
    channel: 'whatsapp',
    body: msgBody,
    status: 'queued',
    createdAt: new Date().toISOString(),
  });
  if (outbox.length > 100) outbox.splice(0, outbox.length - 100);
  await getSandboxStore().putCollection('outbox', outbox);

  await recordRun({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'rebook',
    contactId: appt.contactId,
    contactName: name,
    stage: 'Booked',
    appointmentId: created.id,
    calendarId: appt.calendarId,
    message: `No-show rebooked to ${when}.`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, appointment: created });
}
