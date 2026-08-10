/**
 * Runtime configuration for the sandbox. Values are read once at construction;
 * env vars are supported so the same package runs locally (file/memory store)
 * and on Vercel (Upstash store).
 */
export interface SandboxConfig {
  locationId: string;
  locationName: string;
  /** Secret used to HMAC-sign outbound webhook payloads. */
  webhookSecret: string;
  /** Default timezone for the location (IANA). */
  timezone: string;
  /** Base URL of the webhook receiver (ours), e.g. https://appointiq.vercel.app. */
  webhookDeliveryUrl?: string;
  /** Hours in the future a free-slots request may look, max. */
  maxFreeSlotDays?: number;
}

export interface SandboxConfigInput extends Partial<SandboxConfig> {
  locationId?: string;
  locationName?: string;
}

export function defaultSandboxConfig(input: SandboxConfigInput = {}): SandboxConfig {
  return {
    locationId: input.locationId ?? 'xK9sJh2DpQ4mN7vZ',
    locationName: input.locationName ?? 'Mercy Medical Centre',
    webhookSecret: input.webhookSecret ?? 'sandbox-webhook-secret-change-me',
    timezone: input.timezone ?? 'Africa/Nairobi',
    webhookDeliveryUrl: input.webhookDeliveryUrl ?? process.env.WEBHOOK_DELIVERY_URL,
    maxFreeSlotDays: input.maxFreeSlotDays ?? 30,
  };
}

export interface SandboxSecrets {
  /** Optional bearer token the sandbox expects (mirrors a GHL API key). */
  apiKey?: string;
}
