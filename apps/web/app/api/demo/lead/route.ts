import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGhlClient } from '@/lib/ghl';
import { ensureRuntime } from '@/lib/runtime';
import { runLeadPipeline } from '@/lib/automation';

/**
 * Simulate an inbound lead — the demo's "what just happened" button.
 * Creates a contact as if it came from WhatsApp / Google Ads / Facebook / a
 * referral, then runs the qualification pipeline (score, reply, route, and
 * auto-book when the message asks to book).
 */

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(''),
  phone: z.string().optional().default('+254700000000'),
  email: z.string().email().optional().or(z.literal('')),
  channel: z.enum(['whatsapp', 'google', 'facebook', 'referral', 'website', 'call']),
  message: z.string().optional().default(''),
  treatment: z.string().optional().default(''),
  urgency: z.string().optional().default('This month'),
  insurance: z.string().optional().default(''),
});

export async function POST(req: Request) {
  await ensureRuntime();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }
  const { firstName, lastName, phone, email, channel, message, treatment, urgency, insurance } = parsed.data;

  const source = { whatsapp: 'WhatsApp', google: 'Google Ads', facebook: 'Facebook', referral: 'Referral', website: 'Clinic Website', call: 'Phone Call' }[channel];

  const client = getGhlClient();
  const { contact } = await client.contacts.upsert({
    firstName,
    lastName,
    phone,
    email: email || undefined,
    source,
    customFields: [
      { key: 'treatment_interest', value: treatment || null },
      { key: 'urgency', value: urgency },
      { key: 'lead_source', value: source },
      { key: 'insurance_provider', value: insurance || null },
      { key: 'whatsapp', value: phone },
    ],
  });

  const run = await runLeadPipeline(contact.id, { message, force: true });

  return NextResponse.json(
    {
      ok: true,
      contact: { id: contact.id, name: `${firstName} ${lastName}`.trim() },
      run,
    },
    { status: 201 },
  );
}
