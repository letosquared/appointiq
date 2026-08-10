import { NextResponse } from 'next/server';
import { listRuns } from '@/lib/automation';

export async function GET() {
  const runs = await listRuns();
  return NextResponse.json({ runs });
}
