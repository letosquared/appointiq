import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loginStaff, sessionToken, verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const user = loginStaff(body.username ?? '', body.password ?? '');
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Wrong username or password' }, { status: 401 });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Browser-session cookie: no maxAge, so staff sign in again on each visit.
  });
  return NextResponse.json({ ok: true, user });
}

export async function GET() {
  const store = await cookies();
  const session = verifySession(store.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ authed: session.ok, user: session.user });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
