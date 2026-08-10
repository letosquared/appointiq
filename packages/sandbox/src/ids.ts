import { randomBytes } from 'node:crypto';

/** Generate a short, URL-safe id with an optional prefix (e.g. `c`, `app`). */
export function createId(prefix = ''): string {
  const raw = randomBytes(8).toString('base64url').slice(0, 12);
  return prefix ? `${prefix}_${raw}` : raw;
}
