import { NextResponse } from 'next/server';
import { resetDemo } from '@/lib/runtime';

export async function POST() {
  await resetDemo();
  return NextResponse.json({ ok: true });
}
