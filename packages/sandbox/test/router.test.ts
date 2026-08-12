import { describe, expect, it, vi } from 'vitest';
import { GhlApiError } from '@appointiq/ghl';
import { MemoryStore } from '../src/store';
import { SandboxServer } from '../src/router';
import { SandboxTransport } from '../src/index';
import type { Contact, WebhookSubscription } from '../src/domain';

const DEMO_NOW = () => new Date('2026-01-05T00:00:00.000Z');

function makeServer(fetchImpl: typeof fetch = fetch) {
  const store = new MemoryStore();
  const server = new SandboxServer({ store, autoSeed: true, fetchImpl, now: DEMO_NOW });
  return { store, server };
}

const get = (server: SandboxServer, path: string, query: Record<string, string> = {}) =>
  server.handle({ method: 'GET', path, query, headers: {} });

const post = (server: SandboxServer, path: string, body: unknown) =>
  server.handle({ method: 'POST', path, query: {}, body, headers: {} });

describe('contacts', () => {
  it('seeds the demo location on first request', async () => {
    const { server } = makeServer();
    const res = await get(server, '/contacts');
    expect(res.status).toBe(200);
    const body = res.body as { contacts: Contact[]; count: number };
    expect(body.count).toBeGreaterThan(10);
    expect(body.contacts[0]).toHaveProperty('customFields');
  });

  it('creates a contact, then finds it by email lookup and upsert', async () => {
    const { server } = makeServer();
    const created = await post(server, '/contacts', {
      firstName: 'Test',
      lastName: 'Patient',
      email: 'test.patient@example.com',
      phone: '+254700000000',
      tags: ['lead'],
      customFields: [{ id: 'cf_lead_score', value: 88 }],
    });
    expect(created.status).toBe(201);
    const id = (created.body as Contact).id;

    const byId = await get(server, `/contacts/${id}`);
    expect(byId.status).toBe(200);
    expect((byId.body as Contact).email).toBe('test.patient@example.com');

    const lookup = await get(server, '/contacts/lookup', { email: 'TEST.Patient@example.com' });
    expect((lookup.body as { count: number }).count).toBe(1);

    const upsert = await post(server, '/contacts/upsert', {
      firstName: 'Test',
      lastName: 'Patient',
      email: 'test.patient@example.com',
    });
    const upsertBody = upsert.body as { newContact: boolean };
    expect(upsertBody.newContact).toBe(false);
  });

  it('404s for a missing contact', async () => {
    const { server } = makeServer();
    const res = await get(server, '/contacts/nope');
    expect(res.status).toBe(404);
  });
});

describe('SandboxTransport', () => {
  it('rejects non-2xx responses with GhlApiError so client guards can catch missing resources', async () => {
    const { server } = makeServer();
    const transport = new SandboxTransport(server);
    await expect(transport.request({ method: 'GET', path: '/contacts/nope' })).rejects.toThrow(GhlApiError);
    await expect(transport.request({ method: 'GET', path: '/contacts/nope' })).rejects.toThrowError(/Contact not found/);
  });
});

describe('custom fields & calendars', () => {
  it('lists custom fields for the contact model', async () => {
    const { server } = makeServer();
    const res = await get(server, '/custom-fields', { model: 'contact' });
    const body = res.body as { customFields: { id: string }[] };
    expect(body.customFields.length).toBe(10);
    expect(body.customFields.map((f) => f.id)).toContain('cf_lead_score');
    expect(body.customFields.map((f) => f.id)).toContain('cf_origin');
  });

  it('lists calendars and returns free slots', async () => {
    const { server } = makeServer();
    const cal = await get(server, '/calendars');
    const calendars = (cal.body as { calendars: { id: string }[] }).calendars;
    expect(calendars).toHaveLength(8);

    const start = '2026-01-05';
    const slots = await get(server, '/calendars/cal_antenatal_mwangi/free-slots', {
      startDate: start,
      endDate: '2026-01-09',
      timezone: 'Africa/Nairobi',
    });
    expect(slots.status).toBe(200);
    const day = (slots.body as Record<string, { slots: string[] }>)[start];
    expect(day?.slots.length).toBeGreaterThan(0);
    expect(day?.slots[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('appointments', () => {
  it('books a free slot and rejects a double-booking', async () => {
    const { server } = makeServer();
    // Pick a slot that exists for the antenatal calendar on 2026-01-06.
    const slots = await get(server, '/calendars/cal_antenatal_mwangi/free-slots', {
      startDate: '2026-01-06',
      endDate: '2026-01-06',
      timezone: 'Africa/Nairobi',
    });
    const day = (slots.body as Record<string, { slots: string[] }>)['2026-01-06'];
    const slot = day!.slots[0]!;

    const book = await post(server, '/calendars/events/appointments', {
      calendarId: 'cal_antenatal_mwangi',
      locationId: 'xK9sJh2DpQ4mN7vZ',
      contactId: 'c_001',
      startTime: slot,
    });
    expect(book.status).toBe(201);

    const duplicate = await post(server, '/calendars/events/appointments', {
      calendarId: 'cal_antenatal_mwangi',
      locationId: 'xK9sJh2DpQ4mN7vZ',
      contactId: 'c_002',
      startTime: slot,
    });
    expect(duplicate.status).toBe(409);
  });

  it('blocks a doctor across their calendars (no double-booking Dr. Mwangi)', async () => {
    const { server } = makeServer();
    const slots = await get(server, '/calendars/cal_antenatal_mwangi/free-slots', {
      startDate: '2026-01-07',
      endDate: '2026-01-07',
      timezone: 'Africa/Nairobi',
    });
    const day = (slots.body as Record<string, { slots: string[] }>)['2026-01-07'];
    const slot = day!.slots[0]!;
    const end = new Date(new Date(slot).getTime() + 30 * 60000).toISOString();

    const book = await post(server, '/calendars/events/appointments', {
      calendarId: 'cal_antenatal_mwangi',
      contactId: 'c_001',
      startTime: slot,
    });
    expect(book.status).toBe(201);

    // Same doctor, different calendar, overlapping window.
    const clash = await post(server, '/calendars/events/appointments', {
      calendarId: 'cal_gynae_mwangi',
      contactId: 'c_003',
      startTime: slot,
      endTime: end,
    });
    expect(clash.status).toBe(409);
  });
});

describe('webhooks', () => {
  it('signs, delivers and records ContactCreated events', async () => {
    const deliveries: { url: string; headers: Record<string, string>; body: string }[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      deliveries.push({ url, headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body as string });
      return { ok: true, status: 200 } as Response;
    };
    const { server } = makeServer(fetchImpl);

    await post(server, '/webhooks', {
      url: 'https://example.com/hook',
      eventTypes: ['ContactCreated', 'AppointmentBooked'],
    } as Partial<WebhookSubscription>);

    const created = await post(server, '/contacts', {
      firstName: 'Web',
      lastName: 'Hook',
      email: 'web.hook@example.com',
      phone: '+254711222333',
    });
    expect(created.status).toBe(201);

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]!.url).toBe('https://example.com/hook');
    expect(deliveries[0]!.headers['X-GHL-Signature']).toMatch(/^sha256=/);
    const payload = JSON.parse(deliveries[0]!.body);
    expect(payload.type).toBe('ContactCreated');

    const events = await get(server, '/sandbox/events');
    expect((events.body as { events: unknown[] }).events.length).toBeGreaterThanOrEqual(1);
  });
});

describe('auth', () => {
  it('rejects requests without the API key when configured', async () => {
    const store = new MemoryStore();
    const server = new SandboxServer({ store, apiKey: 'secret-key', autoSeed: true });
    const res = await server.handle({ method: 'GET', path: '/contacts', query: {}, headers: {} });
    expect(res.status).toBe(401);

    const ok = await server.handle({
      method: 'GET',
      path: '/contacts',
      query: {},
      headers: { authorization: 'Bearer secret-key' },
    });
    expect(ok.status).toBe(200);
  });
});

describe('seeded fixtures (sanity)', () => {
  it('lists the Mercy doctors and workflows', async () => {
    const { server } = makeServer();
    const users = await get(server, '/users');
    const u = users.body as { users: { id: string; firstName: string }[] };
    expect(u.users.map((x) => x.firstName)).toEqual(expect.arrayContaining(['Wahome', 'G.P.', 'Martin']));

    const wf = await get(server, '/workflows');
    const w = wf.body as { workflows: { id: string; status: string }[] };
    expect(w.workflows.every((x) => x.status === 'active')).toBe(true);
  });
});
