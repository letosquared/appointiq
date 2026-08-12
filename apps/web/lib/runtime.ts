import type { WebhookEventType } from '@appointiq/ghl';
import { ensureDemoActivity } from './demo-activity';
import { getGhlClient, getSandboxServer, getSandboxStore } from './ghl';

let runtimePromise: Promise<void> | undefined;

/**
 * One-time bootstrap for the sandbox runtime:
 *  - guarantees the Mercy Medical seed exists (even on a fresh Upstash store)
 *  - subscribes the app's own webhook receiver so the sandbox emits events that
 *    drive automation, and the webhook outbox shows real delivery attempts
 */
export function ensureRuntime(): Promise<void> {
  runtimePromise ??= bootstrap();
  return runtimePromise;
}

async function bootstrap(): Promise<void> {
  const client = getGhlClient();
  const server = getSandboxServer();

  // Trigger seeding now (idempotent).
  await server.handle({ method: 'GET', path: '/contacts', query: {}, headers: {} });

  // Backfill sample runs/outbox so the demo never opens to empty panels.
  await ensureDemoActivity();

  // Vercel sets VERCEL_URL automatically, so the app can subscribe its own
  // webhook receiver even without PUBLIC_BASE_URL. PUBLIC_BASE_URL still wins
  // when set (e.g. a custom domain).
  const publicUrl =
    process.env.PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!publicUrl) return;

  const subs = await client.transport.request({ method: 'GET', path: '/webhooks' });
  const existing = ((subs.body as { webhooks: Array<{ url: string; enabled: boolean }> }).webhooks) ?? [];
  const ownUrl = `${publicUrl.replace(/\/+$/, '')}/api/webhooks/ghl`;
  if (existing.some((s) => s.url === ownUrl && s.enabled)) return;

  const allEvents: WebhookEventType[] = [
    'ContactCreated',
    'ContactUpdated',
    'ContactDeleted',
    'ContactTagAdd',
    'ContactTagDelete',
    'AppointmentBooked',
    'AppointmentUpdated',
    'AppointmentCancelled',
    'AppointmentStatusChanged',
  ];
  await client.transport.request({
    method: 'POST',
    path: '/webhooks',
    body: { url: ownUrl, enabled: true, eventTypes: allEvents },
  });
}

/** Wipe the demo: re-seed the sandbox and clear app-level bookkeeping. */
export async function resetDemo(): Promise<void> {
  const server = getSandboxServer();
  await server.handle({ method: 'POST', path: '/sandbox/seed', query: {}, headers: {}, body: {} });
  const store = getSandboxStore();
  await store.putCollection('runs', []);
  await store.putCollection('outbox', []);
  await ensureDemoActivity();
}
