import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGhlClient } from '@/lib/ghl';
import { ensureRuntime } from '@/lib/runtime';
import { runLeadPipeline } from '@/lib/automation';
import { safeEqual } from '@/lib/auth';

/**
 * n8n target: after receiving a GHL webhook (via the webhook URL configured in
 * n8n), the workflow calls this endpoint to qualify the lead. The same secret
 * as webhooks is used (X-API-Secret header).
 */
const bodySchema = z.object({
  contactId: z.string().min(1),
  message: z.string().optional().default(''),
  force: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  await ensureRuntime();
  const expected = process.env.WEBHOOK_SECRET ?? 'local-demo-secret';
  const provided = req.headers.get('x-api-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }
  const run = await runLeadPipeline(parsed.data.contactId, {
    message: parsed.data.message,
    force: parsed.data.force,
  });
  return NextResponse.json({ ok: true, run });
}
