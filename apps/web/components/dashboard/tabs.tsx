'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Panel, StatCard, TierBadge } from '@/components/ui';
import type { DashboardData } from './types';

const fmtTime = (iso: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
const fmtSlot = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(iso));

function stageTone(stage: string): 'red' | 'amber' | 'green' | 'blue' | 'violet' | 'slate' {
  switch (stage) {
    case 'Hot': case 'No-show': return 'red';
    case 'Warm': case 'Contacted': case 'New': return 'amber';
    case 'Booked': case 'Visited': return 'green';
    case 'Qualified': return 'blue';
    default: return 'slate';
  }
}

export function OverviewTab({ data }: { data: DashboardData }) {
  const max = Math.max(1, ...data.sources.map((s) => s.count));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Contacts" value={data.counts.contacts} sub={`${data.counts.newLeads} new leads`} tone="blue" />
        <StatCard label="Booked" value={data.counts.booked} sub={`${data.counts.appointmentsToday} appts today`} tone="green" />
        <StatCard label="Visits / No-shows" value={`${data.counts.visited} / ${data.counts.noShows}`} sub="tracked via pipeline" tone="violet" />
        <StatCard label="Follow-ups due" value={data.counts.followupsDue} sub="n8n nurture queue" tone={data.counts.followupsDue > 0 ? 'amber' : 'green'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pipeline">
          <div className="space-y-3">
            {data.pipeline.map((p) => {
              const pct = data.counts.contacts ? Math.round((p.count / data.counts.contacts) * 100) : 0;
              return (
                <div key={p.stage}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{p.stage}</span>
                    <span className="text-slate-500">{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-clinic-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Lead sources" right={<Badge tone="green">revenue est. KES {data.counts.potentialRevenue.toLocaleString()}</Badge>}>
          <div className="space-y-3">
            {data.sources.map((s) => (
              <div key={s.source}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{s.source}</span>
                  <span className="text-slate-500">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.round((s.count / max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Latest automation runs" right={<Badge tone="green">{data.runs.length} runs</Badge>}>
        {data.runs.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing yet — use “Simulate an inbound lead” to kick the pipeline off.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.runs.slice(0, 6).map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-medium text-slate-800">{r.contactName}</span>
                    <Badge tone={r.type === 'booked' ? 'green' : 'blue'}>{r.type}</Badge>
                    {r.score !== undefined && <TierBadge tier={r.tier} />}
                    <span className="truncate text-xs text-slate-500">{r.message}</span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{fmtTime(r.createdAt)}</span>
                </div>
                <RunDetails run={r} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function RunDetails({ run }: { run: DashboardData['runs'][number] }) {
  if (!run.reasons?.length && !run.reply) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {run.reasons && run.reasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Why</span>
          {run.reasons.map((reason, i) => (
            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {reason}
            </span>
          ))}
        </div>
      )}
      {run.reply && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
          <Badge tone={run.reply.channel === 'whatsapp' ? 'green' : run.reply.channel === 'email' ? 'blue' : 'amber'}>
            {run.reply.channel}
          </Badge>
          <p className="text-xs leading-relaxed text-slate-600">{run.reply.body}</p>
        </div>
      )}
    </div>
  );
}

export function PipelineTab({ data }: { data: DashboardData }) {
  const stageOf = (c: DashboardData['contacts'][number]) =>
    ((c.customFields.find((f) => f.id === 'cf_lead_stage')?.value as string) ?? 'New');
  const byStage = (stage: string) => data.contacts.filter((c) => stageOf(c) === stage);
  const stages = ['New', 'Contacted', 'Qualified', 'Booked', 'Visited', 'No-show'];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {stages.map((stage) => {
        const list = byStage(stage);
        return (
          <Panel key={stage} title={<span className="flex items-center gap-2">{stage} <Badge tone={stageTone(stage)}>{list.length}</Badge></span>}>
            <div className="scroll-thin max-h-80 space-y-2 overflow-y-auto pr-1">
              {list.length === 0 && <p className="text-xs text-slate-400">Empty</p>}
              {list.map((c) => {
                const score = c.customFields.find((f) => f.id === 'cf_lead_score')?.value;
                const src = String(c.customFields.find((f) => f.id === 'cf_lead_source')?.value ?? c.source ?? '');
                return (
                  <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{(c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' ')) || c.email || c.phone}</p>
                      {score !== null && score !== undefined && <Badge tone="green">score {score}</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{src || '—'}</span>
                      {c.tags?.map((t) => t.endsWith('-lead') || t === 'booked' ? <Badge key={t}>{t}</Badge> : null)}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">{c.phone || c.email}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

export function CalendarTab({ data }: { data: DashboardData }) {
  const calName = (id?: string) => data.calendars.find((c) => c.id === id)?.name ?? id ?? '—';
  const userName = (id?: string) => {
    const u = data.users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : undefined;
  };
  const sorted = [...data.appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <Panel title="Upcoming appointments" right={<Badge tone="green">{sorted.length} total</Badge>}>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">No appointments yet.</p>
      ) : (
        <div className="scroll-thin max-h-[560px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 font-medium">Doctor</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((a) => {
                const contact = data.contacts.find((c) => c.id === a.contactId);
                return (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 text-slate-700">{fmtSlot(a.startTime)}</td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{contact?.name ?? a.title ?? a.contactId}</td>
                    <td className="py-2 pr-3 text-slate-600">{calName(a.calendarId)}</td>
                    <td className="py-2 pr-3 text-slate-600">{userName(a.assignedUserId) ?? '—'}</td>
                    <td className="py-2"><Badge tone={a.appointmentStatus === 'cancelled' ? 'red' : a.appointmentStatus === 'confirmed' ? 'blue' : 'green'}>{a.appointmentStatus ?? 'booked'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function AutomationTab({ data }: { data: DashboardData }) {
  return (
    <Panel title="Automation runs" right={<Badge tone="green">{data.runs.length}</Badge>}>
      {data.runs.length === 0 ? (
        <p className="text-sm text-slate-500">No pipeline runs yet.</p>
      ) : (
        <ul className="scroll-thin max-h-[560px] space-y-2 overflow-y-auto">
          {data.runs.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.type === 'booked' ? 'green' : 'blue'}>{r.type}</Badge>
                <span className="font-medium text-slate-800">{r.contactName}</span>
                {r.score !== undefined && <TierBadge tier={r.tier} />}
                {r.stage && <Badge tone={stageTone(r.stage)}>{r.stage}</Badge>}
                {r.calendarId && <Badge>{r.calendarId}</Badge>}
                <span className="ml-auto text-xs text-slate-400">{fmtTime(r.createdAt)}</span>
              </div>
              {r.message && <p className="mt-2 text-sm text-slate-600">{r.message}</p>}
              <RunDetails run={r} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function OutboxTab({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const chanTone = (c: string) => (c === 'whatsapp' ? 'green' : c === 'email' ? 'blue' : 'amber');
  const queued = data.outbox.filter((m) => m.status === 'queued').length;
  const failed = data.outbox.filter((m) => m.status === 'failed').length;

  const sendOne = async (id: string) => {
    setSendingId(id);
    try {
      await fetch('/api/outbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      router.refresh();
    } finally {
      setSendingId(null);
    }
  };

  const approveAll = async () => {
    setSending(true);
    try {
      await fetch('/api/outbox/send', { method: 'POST' });
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel
      title={`Outbox — AI drafts, staff approve, WhatsApp sends (${queued} awaiting approval${failed ? `, ${failed} failed` : ''})`}
      right={
        queued > 0 ? (
          <button
            onClick={approveAll}
            disabled={sending}
            className="rounded-lg bg-clinic-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clinic-700 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Approve all'}
          </button>
        ) : (
          <Badge tone="green">{data.outbox.length} messages</Badge>
        )
      }
    >
      {data.outbox.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing drafted yet — simulate a lead and the reply lands here for approval.</p>
      ) : (
        <ul className="scroll-thin max-h-[560px] space-y-3 overflow-y-auto">
          {data.outbox.map((m) => (
            <li key={m.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Badge tone={chanTone(m.channel) as 'green'}>{m.channel}</Badge>
                <span className="font-medium text-slate-800">{m.name}</span>
                <span className="text-xs text-slate-500">{m.to}</span>
                <Badge tone={m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'amber'}>{m.status}</Badge>
                <span className="ml-auto flex items-center gap-2">
                  {(m.status === 'queued' || m.status === 'failed') && (
                    <button
                      onClick={() => void sendOne(m.id)}
                      disabled={sendingId === m.id}
                      className="rounded-md border border-clinic-300 bg-clinic-50 px-2 py-1 text-xs font-semibold text-clinic-700 hover:bg-clinic-100 disabled:opacity-50"
                    >
                      {sendingId === m.id ? 'Sending…' : m.status === 'failed' ? 'Retry & send' : 'Approve & send'}
                    </button>
                  )}
                  <span className="text-xs text-slate-400">{fmtTime(m.createdAt)}</span>
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function WebhooksTab({ data }: { data: DashboardData }) {
  const events = [...data.events].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const delivered = events.filter((e) => e.delivered).length;
  return (
    <Panel
      title="GHL webhook outbox"
      right={<Badge tone="green">{delivered}/{events.length} delivered</Badge>}
    >
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No webhook events yet — the sandbox emits events whenever contacts or appointments change.</p>
      ) : (
        <ul className="scroll-thin max-h-[560px] space-y-2 overflow-y-auto">
          {events.map((e, i) => (
            <li key={`${e.type}-${e.id}-${i}`} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Badge tone="blue">{e.type}</Badge>
                <span className="text-xs text-slate-500">{e.id}</span>
                <span className="ml-auto text-xs text-slate-400">{fmtTime(e.createdAt ?? '')}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                <span className={e.delivered ? 'text-green-600' : 'text-amber-600'}>{e.delivered ? '● delivered' : '○ not delivered'}</span>
                {e.deliveryAttempts !== undefined && <span>attempts: {e.deliveryAttempts}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
