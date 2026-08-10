import { GhlClient, HttpTransport } from '@appointiq/ghl';
import {
  SandboxServer,
  SandboxTransport,
  createStore,
  type Store,
} from '@appointiq/sandbox';

/**
 * Server-side singletons. Everything else in the app talks through `GhlClient`,
 * so switching between the sandbox and the real GoHighLevel API is a single env
 * var (`GHL_MODE`). The sandbox runtime is shared across route handlers and
 * keeps state in-memory (per warm instance) or in Upstash for true persistence.
 */

let cachedStore: Store | undefined;
let cachedServer: SandboxServer | undefined;
let cachedClient: GhlClient | undefined;
let cachedTransport: SandboxTransport | undefined;

export function getSandboxStore(): Store {
  if (cachedStore) return cachedStore;
  const backend = (process.env.SANDBOX_STORE ?? 'memory') as 'memory' | 'file' | 'upstash';
  const opts: { backend: typeof backend } & Record<string, unknown> = { backend };
  if (backend === 'upstash') {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      // Fall back to memory so the demo never hard-crashes on a missing KV.
      opts.backend = 'memory';
    }
  }
  if (backend === 'file') opts.dir = process.env.SANDBOX_DATA_DIR;
  cachedStore = createStore(opts as never);
  return cachedStore;
}

export function getSandboxServer(): SandboxServer {
  if (cachedServer) return cachedServer;
  const config = {
    webhookSecret: process.env.WEBHOOK_SECRET ?? 'local-demo-secret',
  };
  cachedServer = new SandboxServer({
    store: getSandboxStore(),
    autoSeed: true,
    config,
    apiKey: process.env.SANDBOX_API_KEY,
  });
  return cachedServer;
}

export function getSandboxTransport(): SandboxTransport {
  cachedTransport ??= new SandboxTransport(getSandboxServer());
  return cachedTransport;
}

export function getGhlClient(): GhlClient {
  if (cachedClient) return cachedClient;
  const mode = process.env.GHL_MODE ?? 'sandbox';
  if (mode === 'live') {
    const apiKey = process.env.GHL_API_KEY;
    if (!apiKey) {
      throw new Error('GHL_MODE=live requires GHL_API_KEY (see apps/web/.env.example)');
    }
    cachedClient = new GhlClient({
      transport: new HttpTransport({
        baseUrl: process.env.GHL_API_URL ?? 'https://services.leadconnectorhq.com',
        apiKey,
      }),
    });
    return cachedClient;
  }
  cachedClient = new GhlClient({ transport: getSandboxTransport() });
  return cachedClient;
}

/** Which mode is active — surfaced on the dashboard so demos are explicit. */
export function ghlMode(): 'sandbox' | 'live' {
  return process.env.GHL_MODE === 'live' ? 'live' : 'sandbox';
}

export type { Store };
