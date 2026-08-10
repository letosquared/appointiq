'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SimulateLead from '@/components/dashboard/SimulateLead';
import { AutomationTab, CalendarTab, OutboxTab, OverviewTab, PipelineTab, WebhooksTab } from '@/components/dashboard/tabs';
import type { AutomationRun, DashboardData } from '@/components/dashboard/types';
import { Badge, BrandWordmark } from '@/components/ui';

type Tab = 'overview' | 'pipeline' | 'calendar' | 'automation' | 'outbox' | 'webhooks';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'automation', label: 'Automation' },
  { id: 'outbox', label: 'Outbox' },
  { id: 'webhooks', label: 'Webhooks' },
];

export default function DashboardPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [lastRun, setLastRun] = useState<AutomationRun | null>(null);
  const [resetting, setResetting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/dashboard', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setAuthed(!!d.authed);
        if (d.authed) void refresh();
      });
  }, [refresh]);

  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      setAuthed(true);
      setLoginError('');
      void refresh();
    } else {
      setLoginError('Wrong passcode. Hint: try “mercy”.');
    }
  }

  async function reset() {
    if (!confirm('Reset the demo? Re-seeds GHL data and clears runs/outbox.')) return;
    setResetting(true);
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
      await refresh();
    } finally {
      setResetting(false);
    }
  }

  const onSimulated = useCallback(
    (run?: AutomationRun) => {
      setLastRun(run ?? null);
      setTab(run?.type === 'booked' ? 'automation' : 'overview');
      setTimeout(() => void refresh(), 400);
    },
    [refresh],
  );

  if (authed === null) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Checking…</div>;
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-clinic-600 font-bold text-white">A</div>
          <h1 className="mt-4 text-xl font-bold text-ink-800">Ops dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the demo passcode to continue.</p>
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
          >
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-clinic-500 focus:outline-none focus:ring-1 focus:ring-clinic-500"
            />
            {loginError && <p className="mt-2 text-sm text-red-600">{loginError}</p>}
            <button type="submit" className="mt-4 w-full rounded-lg bg-clinic-600 px-4 py-2.5 font-semibold text-white hover:bg-clinic-700">
              Unlock
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandWordmark title="Mercy Medical Centre — Ops" sub="AppointIQ · lead engine + automation dashboard" />
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={data?.mode === 'live' ? 'blue' : 'amber'}>{data?.mode === 'live' ? 'Real GHL' : 'GHL Sandbox'}</Badge>
            <Link href="/" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Patient site
            </Link>
            <button
              onClick={() => void reset()}
              disabled={resetting}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {resetting ? 'Resetting…' : 'Reset demo'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Simulate lead banner */}
        {lastRun && (
          <div className="mb-5 rounded-xl border border-clinic-200 bg-clinic-50 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-clinic-800">Pipeline ran for {lastRun.contactName}</span>
              {lastRun.score !== undefined && <Badge tone="green">score {lastRun.score}</Badge>}
              {lastRun.tier && <Badge tone={lastRun.tier === 'hot' ? 'red' : lastRun.tier === 'warm' ? 'amber' : 'slate'}>{lastRun.tier}</Badge>}
              {lastRun.stage && <Badge tone="blue">{lastRun.stage}</Badge>}
              <span className="text-clinic-700">{lastRun.message}</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left column: simulate + quick links */}
          <div className="space-y-4">
            <SimulateLead onDone={onSimulated} />
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How this demo works</p>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-600">
                <li>“Simulate lead” creates a GHL contact + custom fields.</li>
                <li>The engine scores it, drafts a WhatsApp reply, picks a doctor.</li>
                <li>Booking intent auto-books the next free slot.</li>
                <li>Every step lands in Automation, Outbox and Webhooks tabs.</li>
                <li>n8n + Vercel Cron handle the long game (nurture, rebook, digest).</li>
              </ol>
            </div>
          </div>

          {/* Right column: tabs */}
          <div>
            <nav className="mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    tab === t.id ? 'bg-clinic-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {!data ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading…</p>
            ) : (
              <>
                {tab === 'overview' && <OverviewTab data={data} />}
                {tab === 'pipeline' && <PipelineTab data={data} />}
                {tab === 'calendar' && <CalendarTab data={data} />}
                {tab === 'automation' && <AutomationTab data={data} />}
                {tab === 'outbox' && <OutboxTab data={data} />}
                {tab === 'webhooks' && <WebhooksTab data={data} />}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
