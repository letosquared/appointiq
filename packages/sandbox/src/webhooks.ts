import { createHmac } from 'node:crypto';
import type { WebhookEnvelope, WebhookEventType, WebhookSubscription } from './domain';
import type { Store } from './store';

export const MAX_OUTBOX = 300;

/** HMAC-SHA256 signature in the same format HighLevel uses for webhooks. */
export function signWebhook(payload: unknown, secret: string): string {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export function verifyWebhookSignature(
  body: string,
  secret: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const expected = signWebhook(body, secret);
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && a.equals(b);
}

export interface WebhookEmitterOptions {
  store: Store;
  secret: string;
  fetchImpl?: typeof fetch;
}

/**
 * Emits webhook events to every subscribed URL (n8n, our own receiver, …) and
 * keeps an outbox in the store so the dashboard can show delivery health.
 * Delivery is best-effort with a small retry — failed events stay in the outbox.
 */
export class WebhookEmitter {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: WebhookEmitterOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async emit(type: WebhookEventType, id: string, data: Record<string, unknown>): Promise<WebhookEnvelope> {
    const event: WebhookEnvelope = {
      type,
      locationId: '',
      id,
      data,
      createdAt: new Date().toISOString(),
    };

    const subscriptions = (await this.opts.store.getCollection<WebhookSubscription>('webhooks')) ?? [];
    const targets = subscriptions.filter(
      (s) => s.enabled && s.eventTypes.includes(type),
    );

    if (targets.length === 0) {
      event.delivered = false;
      event.deliveryAttempts = 0;
      await this.record(event);
      return event;
    }

    for (const target of targets) {
      await this.deliver(event, target);
    }
    await this.record(event);
    return event;
  }

  private async deliver(event: WebhookEnvelope, subscription: WebhookSubscription): Promise<void> {
    // Sign over the exact body bytes that hit the wire — the same scheme real
    // HighLevel uses, so the app's receiver verifies with the raw request text.
    const payload = { ...event };
    const body = JSON.stringify(payload);
    const signature = signWebhook(body, this.opts.secret);
    const wire = JSON.stringify({ ...payload, signature });
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await this.fetchImpl(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-GHL-Signature': signature,
            'User-Agent': 'AppointIQ-Sandbox/0.1',
          },
          body: wire,
        });
        event.delivered = res.ok;
        event.deliveryAttempts = attempt;
        event.lastAttemptAt = new Date().toISOString();
        if (res.ok) return;
      } catch {
        event.deliveryAttempts = attempt;
        event.lastAttemptAt = new Date().toISOString();
      }
      await new Promise((r) => setTimeout(r, attempt * 250));
    }
  }

  private async record(event: WebhookEnvelope): Promise<void> {
    const events = (await this.opts.store.getCollection<WebhookEnvelope>('events')) ?? [];
    events.push(event);
    if (events.length > MAX_OUTBOX) events.splice(0, events.length - MAX_OUTBOX);
    await this.opts.store.putCollection('events', events);
  }
}
