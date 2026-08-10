import { NextResponse } from 'next/server';
import { listOutbox } from '@/lib/automation';

export async function GET() {
  const outbox = await listOutbox();
  return NextResponse.json({ outbox });
}
