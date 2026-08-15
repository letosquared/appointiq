'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SimulateLead from '@/components/dashboard/SimulateLead';
import { AutomationTab, CalendarTab, OutboxTab, OverviewTab, PipelineTab, WebhooksTab } from '@/components/dashboard/tabs';
import type { AutomationRun, DashboardData } from '@/components/dashboard/types';
import { Badge, BrandWordmark, Logo } from '@/components/ui';

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
  const [user, setUser] = useState<{ username: string; name: string; role: string } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        if (d.authed) {
          setUser(d.user ?? null);
          void refresh();
        }
      });
  }, [refresh]);

  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setAuthed(true);
      setUser(data.user ?? null);
      setLoginError('');
      void refresh();
    } else {
      setLoginError('Wrong username or password.');
    }
  }

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthed(false);
    setUser(null);
    setData(null);
    setUsername('');
    setPassword('');
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
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="text-base font-bold text-ink-800">Mercy Medical Centre</p>
              <p className="text-xs text-slate-500">Ops dashboard · staff sign in</p>
            </div>
          </div>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
          >
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-clinic-500 focus:outline-none focus:ring-1 focus:ring-clinic-500"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-clinic-500 focus:outline-none focus:ring-1 focus:ring-clinic-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    <path d="m1 1 22 22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button type="submit" className="w-full rounded-lg bg-clinic-600 px-4 py-2.5 font-semibold text-white hover:bg-clinic-700">
              Sign in
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
            {user && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                <span className="text-xs font-medium text-slate-700">
                  Logged in as <span className="font-semibold text-ink-800">{user.name}</span>
                  <span className="text-slate-500"> · {user.role}</span>
                </span>
                <button onClick={() => void logout()} className="text-xs font-medium text-clinic-600 hover:text-clinic-700">
                  Sign out
                </button>
              </div>
            )}
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
                <li>n8n handles the long game (nurture, rebook, digest).</li>
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
                {tab === 'outbox' && <OutboxTab data={data} onRefresh={refresh} />}
                {tab === 'webhooks' && <WebhooksTab data={data} />}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
