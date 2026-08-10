import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGhlClient } from '@/lib/ghl';
import { ensureRuntime } from '@/lib/runtime';
import { contactName, recordRun } from '@/lib/automation';

/**
 * Patient booking. GET  → free slots for a calendar (drives the booking widget)
 * POST → upserts the contact, creates the appointment, marks the lead Booked.
 */

const bookSchema = z.object({
  calendarId: z.string().min(1),
  startTime: z.string().datetime(),
  firstName: z.string().min(1),
  lastName: z.string().optional().default(''),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional().default(''),
  source: z.string().optional().default('Clinic Website'),
});

export async function GET(req: Request) {
  await ensureRuntime();
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get('calendarId');
  if (!calendarId) return NextResponse.json({ message: 'calendarId is required' }, { status: 400 });

  const client = getGhlClient();
  const startKey = new Date().toISOString().slice(0, 10);
  const endKey = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const slots = await client.calendars
    .freeSlots(calendarId, { startDate: startKey, endDate: endKey, timezone: 'Africa/Nairobi' })
    .catch(() => null);
  return NextResponse.json({ slots: slots ?? {} });
}

export async function POST(req: Request) {
  await ensureRuntime();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }
  const { calendarId, startTime, firstName, lastName, phone, email, notes, source } = parsed.data;

  const client = getGhlClient();
  const { contact } = await client.contacts.upsert({
    firstName,
    lastName,
    phone,
    email: email || undefined,
    source,
  });

  const appointment = await client.appointments.create({
    calendarId,
    contactId: contact.id,
    startTime,
    locationId: process.env.GHL_LOCATION_ID ?? '',
    title: `${firstName} ${lastName}`.trim(),
    notes,
  });

  await client.contacts.updateCustomFields(contact.id, [
    { id: 'cf_lead_stage', value: 'Booked' },
  ]);
  await client.tags.add(contact.id, ['booked', 'clinic-website']);

  await recordRun({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'booked',
    contactId: contact.id,
    contactName: contactName(contact),
    stage: 'Booked',
    appointmentId: appointment.id,
    calendarId,
    message: `Booked ${appointment.startTime} via clinic website.`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: true,
      contact: { id: contact.id, name: contactName(contact) },
      appointment,
    },
    { status: 201 },
  );
}
