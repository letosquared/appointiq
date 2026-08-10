import { describe, expect, it } from 'vitest';
import { GhlClient, HttpTransport, type Transport } from '../src/index';
import type { Contact } from '../src/types';

describe('GhlClient', () => {
  it('attaches the GHL Version header and returns typed data', async () => {
    const calls: { path: string; headers: Record<string, string> }[] = [];
    const fakeTransport: Transport = {
      async request(opts) {
        calls.push({ path: opts.path, headers: opts.headers ?? {} });
        return {
          status: 200,
          body: {
            contacts: [
              {
                id: 'c_1',
                locationId: 'loc',
                firstName: 'Ada',
                tags: [],
                customFields: [],
              },
            ],
            count: 1,
          },
        };
      },
    };
    const client = new GhlClient({ transport: fakeTransport });
    const res = await client.contacts.list();
    expect(res.count).toBe(1);
    expect(calls[0]!.path).toBe('/contacts');
    expect(calls[0]!.headers['Version']).toBe('2021-07-28');
  });

  it('builds request paths for nested resources', async () => {
    const calls: { method: string; path: string; body?: unknown }[] = [];
    const fakeTransport: Transport = {
      async request(opts) {
        calls.push({ method: opts.method, path: opts.path, body: opts.body });
        return { status: 200, body: { tags: ['a', 'b'] } };
      },
    };
    const client = new GhlClient({ transport: fakeTransport });
    await client.tags.add('c_9', ['hot-lead']);
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.path).toBe('/contacts/c_9/tags');
  });
});

describe('HttpTransport', () => {
  it('sends the bearer token and parses JSON', async () => {
    let url = '';
    const fetchImpl = async (u: string, init?: RequestInit) => {
      url = u;
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer key123');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const t = new HttpTransport({ baseUrl: 'https://services.leadconnectorhq.com', apiKey: 'key123', fetchImpl });
    const res = await t.request({ method: 'GET', path: '/contacts' });
    expect(res.body).toEqual({ ok: true });
    expect(url).toBe('https://services.leadconnectorhq.com/contacts');
  });

  it('retries idempotent 5xx then surfaces a GhlApiError', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      return new Response('boom', { status: 502, headers: { 'Content-Type': 'text/plain' } });
    };
    const t = new HttpTransport({
      baseUrl: 'https://services.leadconnectorhq.com',
      fetchImpl,
      maxRetries: 2,
    });
    const { GhlApiError } = await import('../src/errors');
    await expect(t.request({ method: 'GET', path: '/contacts' })).rejects.toBeInstanceOf(GhlApiError);
    expect(calls).toBe(3);
  });

  it('sends query params and skips empty ones', async () => {
    const seen: Record<string, string> = {};
    const fetchImpl = async (u: string) => {
      const parsed = new URL(u);
      seen.page = parsed.searchParams.get('page') ?? '';
      seen.empty = parsed.searchParams.get('empty') ?? 'n/a';
      return new Response('[]', { status: 200 });
    };
    const t = new HttpTransport({ baseUrl: 'https://x.test', fetchImpl });
    await t.request({ method: 'GET', path: '/contacts', query: { page: 2, empty: undefined } });
    expect(seen.page).toBe('2');
    expect(seen.empty).toBe('n/a');
  });
});
