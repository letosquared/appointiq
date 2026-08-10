import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Minimal dashboard auth. The demo uses a passcode (default "mercy") that sets
 * a signed cookie. API routes that n8n / Vercel Cron call use the same secret
 * via the X-API-Secret header. Swap for real auth (Supabase, NextAuth) in prod.
 */

const COOKIE = 'appointiq_session';
const TTL = 7 * 86400_000;

export function passcodeOk(input: string): boolean {
  const expected = process.env.DEMO_PASSCODE ?? 'mercy';
  return safeEqual(input, expected);
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function sessionToken(): string {
  const secret = process.env.DEMO_PASSCODE ?? 'mercy';
  const exp = Date.now() + TTL;
  const payload = `${exp}.${createHash('sha256').update(`${secret}:${exp}`).digest('hex')}`;
  return payload;
}

export function verifySession(cookie: string | null | undefined): boolean {
  if (!cookie) return false;
  const parts = cookie.split('.');
  const expStr = parts[0]!;
  const sig = parts[1]!;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const secret = process.env.DEMO_PASSCODE ?? 'mercy';
  const expected = createHash('sha256').update(`${secret}:${exp}`).digest('hex');
  return safeEqual(sig, expected);
}

export const SESSION_COOKIE = COOKIE;