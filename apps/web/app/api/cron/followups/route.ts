import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { runFollowUpReminders } from '@/lib/automation';

/**
 * Vercel Cron → /api/cron/followups (CRON_SECRET header required).
 * Finds contacts whose follow-up is due and queues a reminder in the outbox.
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET ?? 'local-demo-secret';
  const provided = req.headers.get('x-api-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const sent = await runFollowUpReminders();
  return NextResponse.json({ ok: true, remindersSent: sent });
}
