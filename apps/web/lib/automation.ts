import { draftReply, routeLead, scoreLead } from '@appointiq/engine';
import type { LeadSignal, Tier } from '@appointiq/engine';
import type { Contact } from '@appointiq/ghl';
import { getGhlClient, getSandboxStore } from './ghl';
import { ensureRuntime } from './runtime';

/**
 * The automation orchestrator. This is the same function the webhook receiver
 * calls, so whether an event arrives via the sandbox webhook (authentic path)
 * or via an API route directly (instant demo path), the pipeline is identical:
 *
 *   1. load the contact
 *   2. score + qualify + route with the heuristic engine
 *   3. write score/stage/follow-up custom fields and tags back to GHL
 *   4. draft a reply and enqueue it in the simulated SMS/WhatsApp outbox
 *   5. if the patient explicitly asked to book, book the next free slot on the
 *      suggested doctor's calendar and move the contact to Booked
 *   6. record the run so the dashboard can show the pipeline live
 */

export interface AutomationRun {
  id: string;
  type: 'qualify' | 'booked' | 'reply' | 'reminder' | 'rebook' | 'reset';
  contactId: string;
  contactName?: string;
  score?: number;
  tier?: string;
  stage?: string;
  calendarId?: string;
  appointmentId?: string;
  message?: string;
  reply?: { channel: OutboxMessage['channel']; body: string };
  reasons?: string[];
  createdAt: string;
}

export interface OutboxMessage {
  id: string;
  to: string;
  name: string;
  channel: 'sms' | 'whatsapp' | 'email';
  body: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
}

const FIELD = {
  score: 'cf_lead_score',
  stage: 'cf_lead_stage',
  interest: 'cf_treatment_interest',
  urgency: 'cf_urgency',
  source: 'cf_lead_source',
  insurance: 'cf_insurance_provider',
  whatsapp: 'cf_whatsapp',
  value: 'cf_estimated_value',
  followup: 'cf_followup_due',
} as const;

export function contactField(contact: Contact, id: string): string | number | boolean | string[] | null {
  return contact.customFields?.find((f) => f.id === id)?.value ?? null;
}

export async function runLeadPipeline(contactId: string, opts: { message?: string; force?: boolean } = {}): Promise<AutomationRun | null> {
  const client = getGhlClient();
  const contact = await client.contacts.get(contactId).catch(() => null);
  if (!contact) return null;

  if (!opts.force && contactField(contact, FIELD.score) !== null) return null;

  const signal = buildSignal(contact, opts.message);

  const scored = scoreLead(signal);
  const routed = routeLead(signal, new Date(), scored.tier);
  const reply = draftReply(signal, scored.tier);
  const stage = scored.tier === 'hot' ? 'Qualified' : scored.tier === 'warm' ? 'Contacted' : 'New';

  await client.contacts.updateCustomFields(contact.id, [
    { id: FIELD.score, value: scored.score },
    { id: FIELD.stage, value: stage },
    { id: FIELD.followup, value: routed.suggestedSlotWindow.start },
  ]);
  await client.tags.add(contact.id, [`${scored.tier}-lead`]);

  await enqueueReply(contact, reply.body, reply.channel);

  let appointmentId: string | undefined;
  if (opts.message && /(book|appointment|come in|schedule|reserve|today|tomorrow|when)/i.test(opts.message)) {
    appointmentId = await tryBookNextSlot(contact.id, routed.calendarId, routed.doctorId);
  }

  const run: AutomationRun = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: appointmentId ? 'booked' : 'qualify',
    contactId: contact.id,
    contactName: contactName(contact),
    score: scored.score,
    tier: scored.tier,
    stage: appointmentId ? 'Booked' : stage,
    appointmentId,
    calendarId: routed.calendarId,
    message: appointmentId
      ? `Auto-booked next free slot on ${routed.calendarId}.`
      : `Qualified as ${scored.tier}. Reply queued for approval (${reply.channel}).`,
    reply: { channel: reply.channel, body: reply.body },
    reasons: scored.reasons,
    createdAt: new Date().toISOString(),
  };
  await recordRun(run);
  return run;
}

function buildSignal(contact: Contact, message?: string): LeadSignal {
  const cf: Record<string, string | number | boolean | string[] | null> = {};
  for (const f of contact.customFields ?? []) {
    cf[f.id] = f.value;
    const short = f.id.replace(/^cf_/, '');
    cf[short] = f.value;
  }
  const stage = String(contactField(contact, FIELD.stage) ?? '');
  const source = String(contactField(contact, FIELD.source) ?? contact.source ?? 'Website');
  return {
    contact: {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      timezone: contact.timezone,
    },
    customFields: cf,
    message: message ?? '',
    channel: channelFromSource(source),
    source,
    receivedAt: contact.dateAdded ?? new Date().toISOString(),
  };
}

function channelFromSource(source: string): 'whatsapp' | 'sms' | 'email' | 'web' | 'call' | 'facebook' {
  const s = source.toLowerCase();
  if (s.includes('whatsapp')) return 'whatsapp';
  if (s.includes('facebook')) return 'facebook';
  if (s.includes('call') || s.includes('phone')) return 'call';
  if (s.includes('email')) return 'email';
  return 'web';
}

async function tryBookNextSlot(contactId: string, calendarId: string | undefined, doctorId: string | undefined): Promise<string | undefined> {
  if (!calendarId) return undefined;
  const client = getGhlClient();
  const startKey = new Date().toISOString().slice(0, 10);
  const endKey = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const slots = await client.calendars
    .freeSlots(calendarId, { startDate: startKey, endDate: endKey, timezone: 'Africa/Nairobi' })
    .catch(() => null);
  const first = slots ? Object.values(slots)[0]?.slots?.[0] : undefined;
  if (!first) return undefined;
  const created = await client.appointments
    .create({
      calendarId,
      contactId,
      startTime: first,
      assignedUserId: doctorId,
      locationId: process.env.GHL_LOCATION_ID ?? '',
      title: 'AppointIQ auto-booking',
    })
    .catch(() => null);
  if (!created) return undefined;
  await client.contacts.updateCustomFields(contactId, [{ id: FIELD.stage, value: 'Booked' }]);
  await client.tags.add(contactId, ['booked']);
  return created.id;
}

async function enqueueReply(contact: Contact, body: string, channel: OutboxMessage['channel']): Promise<void> {
  const outbox = (await getSandboxStore().getCollection<OutboxMessage>('outbox')) ?? [];
  const msg: OutboxMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    to: contact.phone || contact.email || '',
    name: contactName(contact),
    channel,
    body,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  outbox.push(msg);
  if (outbox.length > 100) outbox.splice(0, outbox.length - 100);
  await getSandboxStore().putCollection('outbox', outbox);
}

export async function recordRun(run: AutomationRun): Promise<void> {
  const runs = (await getSandboxStore().getCollection<AutomationRun>('runs')) ?? [];
  runs.unshift(run);
  if (runs.length > 200) runs.splice(200);
  await getSandboxStore().putCollection('runs', runs);
}

export async function listRuns(): Promise<AutomationRun[]> {
  return (await getSandboxStore().getCollection<AutomationRun>('runs')) ?? [];
}

export async function listOutbox(): Promise<OutboxMessage[]> {
  return (await getSandboxStore().getCollection<OutboxMessage>('outbox')) ?? [];
}

export async function listWebhookEvents(): Promise<unknown[]> {
  return (await getSandboxStore().getCollection('events')) ?? [];
}

export async function runFollowUpReminders(): Promise<number> {
  const client = getGhlClient();
  await ensureRuntime();
  const all = await client.contacts.list({ pageLimit: 500 });
  const now = Date.now();
  let sent = 0;
  for (const contact of all.contacts) {
    const stage = String(contactField(contact, FIELD.stage) ?? '');
    const due = contactField(contact, FIELD.followup);
    if (!due || typeof due !== 'string') continue;
    if (!['New', 'Contacted', 'Qualified'].includes(stage)) continue;
    if (new Date(due).getTime() > now) continue;
    const signal = buildSignal(contact);
    const tier = stage === 'Qualified' ? ('warm' as Tier) : ('cold' as Tier);
    const reply = draftReply(signal, tier);
    await enqueueReply(contact, `Reminder: ${reply.body}`, reply.channel);
    await client.contacts.updateCustomFields(contact.id, [
      { id: FIELD.followup, value: new Date(now + 86400_000).toISOString() },
    ]);
    await recordRun({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'reminder',
      contactId: contact.id,
      contactName: contactName(contact),
      stage,
      message: `Follow-up reminder queued (${reply.channel}).`,
      createdAt: new Date().toISOString(),
    });
    sent++;
  }
  return sent;
}

export function contactName(contact: Contact): string {
  return (contact.name ?? ([contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || contact.phone)) || 'Unknown';
}

export { FIELD };
