import type { WebhookEnvelope } from '@appointiq/ghl';
import type { AutomationRun, OutboxMessage } from './automation';
import { getSandboxStore } from './ghl';
import { ghlMode } from './ghl';

/**
 * Seeds realistic sample pipeline activity so the landing feed and dashboard
 * never open to an empty "Automation" or "Outbox" panel on a fresh store.
 * Only writes when the collections are empty, so real simulations always win.
 */

const isoAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const warmReply =
  'Wanjiku, thank you for reaching out to Mercy Medical Centre.\n\n' +
  'How long have you been trying to conceive, and has any testing been done yet?\n\n' +
  'In the meantime, would you like to book an appointment? We have openings ' +
  'Mon–Fri 09:00–17:00, Sat 09:00–12:00. Just reply with a day that suits you.';

const confirmationReply =
  'Achieng, your Antenatal Care appointment with Dr. Mwangi is confirmed for ' +
  'tomorrow at 09:30. Reply CONFIRM or call +254 729 370 022 to reschedule.';

const reminderReply =
  'Reminder: Faith, thank you for reaching out to Mercy Medical Centre.\n\n' +
  'Would you like to book your antenatal care appointment? We have openings ' +
  'Mon–Fri 09:00–17:00, Sat 09:00–12:00. Reply with a day that suits you.';

const rebookReply =
  'Cynthia, you missed your appointment at Mercy Medical Centre. Reply with a ' +
  'preferred day and we will rebook your gynaecology consult, or call +254 729 370 022.';

const SAMPLE_RUNS: AutomationRun[] = [
  {
    id: 'demo-run-1',
    type: 'qualify',
    contactId: 'c_002',
    contactName: 'Wanjiku Njoroge',
    score: 78,
    tier: 'warm',
    stage: 'Contacted',
    message: 'Qualified as warm. Reply queued for approval (whatsapp).',
    reply: { channel: 'whatsapp', body: warmReply },
    reasons: ['high-value Infertility case', 'shows booking intent', 'came in during clinic hours'],
    createdAt: isoAgo(1),
  },
  {
    id: 'demo-run-2',
    type: 'booked',
    contactId: 'c_001',
    contactName: 'Achieng Otieno',
    score: 92,
    tier: 'hot',
    stage: 'Booked',
    calendarId: 'cal_antenatal_mwangi',
    appointmentId: 'app_001',
    message: 'Auto-booked next free slot on cal_antenatal_mwangi.',
    reply: { channel: 'whatsapp', body: confirmationReply },
    reasons: [
      "urgency is 'Immediate'",
      'high-value Antenatal Care case',
      'strong source: Google Ads',
      'shows booking intent',
      'hot lead — prioritize',
    ],
    createdAt: isoAgo(4),
  },
  {
    id: 'demo-run-3',
    type: 'reminder',
    contactId: 'c_010',
    contactName: 'Faith Gitau',
    score: 71,
    tier: 'warm',
    stage: 'Qualified',
    message: 'Follow-up reminder queued (whatsapp).',
    reply: { channel: 'whatsapp', body: reminderReply },
    createdAt: isoAgo(9),
  },
  {
    id: 'demo-run-4',
    type: 'rebook',
    contactId: 'c_007',
    contactName: 'Cynthia Mwende',
    score: 52,
    tier: 'warm',
    stage: 'No-show',
    message: 'No-show detected — rebooking message queued (sms).',
    reply: { channel: 'sms', body: rebookReply },
    createdAt: isoAgo(22),
  },
  {
    id: 'demo-run-5',
    type: 'booked',
    contactId: 'c_008',
    contactName: 'Ruth Wairimu',
    score: 88,
    tier: 'hot',
    stage: 'Booked',
    calendarId: 'cal_infertility_wahome',
    appointmentId: 'app_003',
    message: 'Auto-booked next free slot on cal_infertility_wahome.',
    reply: {
      channel: 'whatsapp',
      body: 'Ruth, your Infertility Consult with Dr. Wahome Ngare is confirmed. ' +
        'Reply CONFIRM or call +254 729 370 022 to reschedule.',
    },
    reasons: [
      "urgency is 'This week'",
      'high-value Infertility case',
      'strong source: WhatsApp',
      'shows booking intent',
      'hot lead — prioritize',
    ],
    createdAt: isoAgo(50),
  },
];

const SAMPLE_OUTBOX: OutboxMessage[] = [
  {
    id: 'demo-outbox-1',
    to: '+254712345602',
    name: 'Wanjiku Njoroge',
    channel: 'whatsapp',
    body: warmReply,
    status: 'queued',
    createdAt: isoAgo(1),
  },
  {
    id: 'demo-outbox-2',
    to: '+254712345601',
    name: 'Achieng Otieno',
    channel: 'whatsapp',
    body: confirmationReply,
    status: 'sent',
    createdAt: isoAgo(4),
  },
  {
    id: 'demo-outbox-3',
    to: '+254712345607',
    name: 'Cynthia Mwende',
    channel: 'sms',
    body: rebookReply,
    status: 'sent',
    createdAt: isoAgo(22),
  },
];

const event = (e: Pick<WebhookEnvelope, 'type' | 'id' | 'data' | 'createdAt'>): WebhookEnvelope => ({
  locationId: 'demo-location',
  delivered: true,
  deliveryAttempts: 1,
  ...e,
});

const SAMPLE_EVENTS: WebhookEnvelope[] = [
  event({
    type: 'ContactCreated',
    id: 'evt-1',
    data: { contactId: 'c_002' },
    createdAt: isoAgo(1),
  }),
  event({
    type: 'ContactCustomFieldUpdate',
    id: 'evt-2',
    data: { contactId: 'c_002', fields: ['cf_lead_score', 'cf_lead_stage'] },
    createdAt: isoAgo(1),
  }),
  event({
    type: 'ContactTagAdd',
    id: 'evt-3',
    data: { contactId: 'c_002', tags: ['warm-lead'] },
    createdAt: isoAgo(1),
  }),
  event({
    type: 'ContactCreated',
    id: 'evt-4',
    data: { contactId: 'c_001' },
    createdAt: isoAgo(4),
  }),
  event({
    type: 'ContactTagAdd',
    id: 'evt-5',
    data: { contactId: 'c_001', tags: ['hot-lead', 'booked'] },
    createdAt: isoAgo(4),
  }),
  event({
    type: 'AppointmentBooked',
    id: 'evt-6',
    data: { appointmentId: 'app_001', contactId: 'c_001' },
    createdAt: isoAgo(4),
  }),
  event({
    type: 'AppointmentStatusChanged',
    id: 'evt-7',
    data: { appointmentId: 'app_003', status: 'confirmed' },
    createdAt: isoAgo(50),
  }),
];

export async function ensureDemoActivity(): Promise<void> {
  if (ghlMode() !== 'sandbox') return;
  const store = getSandboxStore();

  const runs = (await store.getCollection<AutomationRun>('runs')) ?? [];
  if (runs.length === 0) {
    await store.putCollection('runs', [...SAMPLE_RUNS]);
  }

  const outbox = (await store.getCollection<OutboxMessage>('outbox')) ?? [];
  if (outbox.length === 0) {
    await store.putCollection('outbox', [...SAMPLE_OUTBOX]);
  }

  const events = (await store.getCollection<WebhookEnvelope>('events')) ?? [];
  if (events.length === 0) {
    await store.putCollection('events', [...SAMPLE_EVENTS]);
  }
}
