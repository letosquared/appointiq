import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Staff auth for the ops dashboard. A seeded staff directory (username +
 * password) sets a signed, browser-session cookie — so staff sign in again on
 * each visit — and the header shows who is logged in. This is demo auth: swap
 * for real SSO / Supabase in production.
 */

const COOKIE = 'appointiq_session';
// Backstop TTL: the cookie itself is a browser-session cookie (no maxAge), so it
// dies when the browser closes. This bounds a session-restore browser (e.g.
// Chrome "continue where you left off") to a single work shift at most.
const TTL = 8 * 3600_000;

export interface StaffUser {
  username: string;
  name: string;
  role: string;
}

interface StaffAccount extends StaffUser {
  passwordHash: string;
}

function hash(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** Seeded staff directory for the Mercy demo. */
const STAFF: StaffAccount[] = [
  {
    username: 'w.ngugi',
    name: 'Wanjiru Ngugi',
    role: 'Front Desk',
    passwordHash: hash(process.env.DEMO_PASSCODE ?? 'mercy'),
  },
  {
    username: 'a.odhiambo',
    name: 'Achieng Odhiambo',
    role: 'Practice Manager',
    passwordHash: hash('admin'),
  },
  {
    username: 'd.mwangi',
    name: 'Dr. David Mwangi',
    role: 'Lead Clinician',
    passwordHash: hash('doctor'),
  },
];

export function loginStaff(username: string, password: string): StaffUser | null {
  const account = STAFF.find((a) => a.username === username.trim().toLowerCase());
  if (!account) return null;
  const candidate = createHash('sha256').update(password).digest();
  const expected = Buffer.from(account.passwordHash, 'hex');
  if (!timingSafeEqual(candidate, expected)) return null;
  return { username: account.username, name: account.name, role: account.role };
}

export function sessionToken(user: StaffUser): string {
  const secret = process.env.DEMO_PASSCODE ?? 'mercy';
  const exp = Date.now() + TTL;
  const sig = createHash('sha256').update(`${secret}:${user.username}:${exp}`).digest('hex');
  // base64url keeps usernames like "w.ngugi" from splitting on the dot delimiter.
  return `${exp}.${Buffer.from(user.username).toString('base64url')}.${sig}`;
}

export function verifySession(cookie: string | null | undefined): { ok: boolean; user: StaffUser | null } {
  if (!cookie) return { ok: false, user: null };
  const parts = cookie.split('.');
  if (parts.length !== 3) return { ok: false, user: null };
  const [expStr, usernameB64, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return { ok: false, user: null };
  let username: string;
  try {
    username = Buffer.from(usernameB64 ?? '', 'base64url').toString('utf8');
  } catch {
    return { ok: false, user: null };
  }
  const account = STAFF.find((a) => a.username === username);
  if (!account) return { ok: false, user: null };
  const secret = process.env.DEMO_PASSCODE ?? 'mercy';
  const expected = createHash('sha256').update(`${secret}:${account.username}:${exp}`).digest('hex');
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return { ok: false, user: null };
  return { ok: true, user: { username: account.username, name: account.name, role: account.role } };
}

export const SESSION_COOKIE = COOKIE;
