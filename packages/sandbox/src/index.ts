import type { HttpResponse, HttpRequestOptions, Transport } from '@appointiq/ghl';
import { SandboxServer, type SandboxServerOptions } from './router';
import { createStore, type Store } from './store';
import { seedIfEmpty } from './seed';
import { defaultSandboxConfig } from './config';

export * from './domain';
export * from './store';
export * from './schedule';
export * from './config';
export { SandboxServer } from './router';
export type { RouterRequest, RouterResponse, SandboxServerOptions } from './router';
export { signWebhook, verifyWebhookSignature } from './webhooks';

export interface CreateSandboxOptions extends Omit<SandboxServerOptions, 'store'> {
  store?: Store;
}

/**
 * Builds a ready-to-serve sandbox backed by the default store (memory unless
 * `SANDBOX_STORE`/`KV_REST_API_*` are configured). Lazily seeds Mercy Medical
 * data on first request.
 */
export function createSandbox(opts: CreateSandboxOptions = {}) {
  const store = opts.store ?? createStore();
  const server = new SandboxServer({ ...opts, store, autoSeed: opts.autoSeed ?? true });
  return { store, server };
}

/** A `Transport` that routes GhlClient requests straight into an in-process sandbox. */
export class SandboxTransport implements Transport {
  constructor(private readonly server: SandboxServer) {}

  async request(opts: HttpRequestOptions): Promise<HttpResponse> {
    const res = await this.server.handle({
      method: opts.method,
      path: opts.path,
      query: opts.query as Record<string, string | string[] | undefined>,
      body: opts.body,
      headers: opts.headers as Record<string, string>,
    });
    return { status: res.status, body: res.body };
  }
}

/** Ensure demo data exists, e.g. after a fresh Upstash store. */
export async function ensureSandboxData(store: Store): Promise<void> {
  await seedIfEmpty(store);
}

export { defaultSandboxConfig };
