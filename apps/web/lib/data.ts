import type { Appointment, Calendar, Contact } from '@appointiq/ghl';
import type { User } from '@appointiq/sandbox';
import { getGhlClient, getSandboxServer, ghlMode } from './ghl';
import { ensureRuntime } from './runtime';
import { listOutbox, listRuns, listWebhookEvents } from './automation';

/**
 * Aggregates everything the dashboard renders in a few parallel calls.
 * All data comes from the GHL API (real or sandbox) plus app-level bookkeeping
 * (runs, outbox, webhook events) stored in the sandbox KV.
 */

export interface DashboardData {
  mode: 'sandbox' | 'live';
  counts: {
    contacts: number;
    newLeads: number;
    booked: number;
    visited: number;
    noShows: number;
    appointmentsToday: number;
    followupsDue: number;
    potentialRevenue: number;
  };
  pipeline: { stage: string; count: number }[];
  calendars: Calendar[];
  users: User[];
  appointments: Appointment[];
  contacts: Contact[];
  runs: Awaited<ReturnType<typeof listRuns>>;
  outbox: Awaited<ReturnType<typeof listOutbox>>;
  events: Awaited<ReturnType<typeof listWebhookEvents>>;
  sources: { source: string; count: number }[];
}

const STAGE_ORDER = ['New', 'Contacted', 'Qualified', 'Booked', 'Visited', 'No-show', 'Disqualified'];

export async function getDashboardData(): Promise<DashboardData> {
  await ensureRuntime();
  const client = getGhlClient();

  const [contactsRes, apptsRes, cals, users, runs, outbox, events, serverRes] = await Promise.all([
    client.contacts.list({ pageLimit: 500 }),
    client.appointments.list({ pageLimit: 500 }),
    client.transport.request({ method: 'GET', path: '/calendars' }),
    client.transport.request({ method: 'GET', path: '/users' }),
    listRuns(),
    listOutbox(),
    listWebhookEvents(),
    getSandboxServer().handle({ method: 'GET', path: '/contacts', query: { limit: '500' }, headers: {} }),
  ]);

  const contacts: Contact[] = contactsRes.contacts;
  const appointments: Appointment[] = apptsRes.events;

  const field = (c: Contact, id: string) => c.customFields?.find((f) => f.id === id)?.value ?? null;
  const stage = (c: Contact) => String(field(c, 'cf_lead_stage') ?? 'New');

  const todayKey = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  const pipeline = STAGE_ORDER.map((stageName) => ({
    stage: stageName,
    count: contacts.filter((c) => stage(c) === stageName).length,
  }));

  const counts = {
    contacts: contacts.length,
    newLeads: pipeline.find((p) => p.stage === 'New')?.count ?? 0,
    booked: pipeline.find((p) => p.stage === 'Booked')?.count ?? 0,
    visited: pipeline.find((p) => p.stage === 'Visited')?.count ?? 0,
    noShows: pipeline.find((p) => p.stage === 'No-show')?.count ?? 0,
    appointmentsToday: appointments.filter((a) => a.startTime.startsWith(todayKey)).length,
    followupsDue: contacts.filter((c) => {
      const due = field(c, 'cf_followup_due');
      return due && typeof due === 'string' && new Date(due).getTime() <= nowMs && !['Visited', 'No-show', 'Disqualified', 'Booked'].includes(stage(c));
    }).length,
    potentialRevenue: contacts.reduce((sum, c) => sum + (Number(field(c, 'cf_estimated_value')) || 0), 0),
  };

  const sourceCounts = new Map<string, number>();
  for (const c of contacts) {
    const src = String(field(c, 'cf_lead_source') ?? c.source ?? 'Website');
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

  void serverRes;

  return {
    mode: ghlMode(),
    counts,
    pipeline,
    calendars: (cals.body as { calendars: Calendar[] }).calendars,
    users: (users.body as { users: User[] }).users,
    appointments,
    contacts,
    runs,
    outbox,
    events,
    sources,
  };
}
