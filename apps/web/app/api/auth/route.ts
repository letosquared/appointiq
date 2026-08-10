import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { passcodeOk, sessionToken, verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (!body.passcode || !passcodeOk(body.passcode)) {
    return NextResponse.json({ ok: false, message: 'Wrong passcode' }, { status: 401 });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 86400,
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = await cookies();
  const authed = verifySession(store.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ authed });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
