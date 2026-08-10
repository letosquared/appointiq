'use client';

import { useState } from 'react';
import { Badge, TierBadge } from '@/components/ui';

type ScenarioKey = 'urgent' | 'booking' | 'fertility' | 'cold';

interface Scenario {
  key: ScenarioKey;
  label: string;
  hint: string;
  tone: 'red' | 'green' | 'blue' | 'slate';
  payload: {
    firstName: string;
    lastName?: string;
    channel: 'whatsapp' | 'google' | 'facebook' | 'referral' | 'website' | 'call';
    message: string;
    treatment: string;
    urgency: string;
  };
}

const SCENARIOS: Scenario[] = [
  {
    key: 'urgent',
    label: 'Urgent — bleeding in pregnancy',
    hint: 'after-hours WhatsApp',
    tone: 'red',
    payload: {
      firstName: 'Achieng',
      lastName: 'Ochieng',
      channel: 'whatsapp',
      message: 'Hi, I am bleeding and very worried. Can I come in today please?',
      treatment: 'Antenatal Care',
      urgency: 'Immediate',
    },
  },
  {
    key: 'booking',
    label: 'Booking — antenatal check-up',
    hint: 'daytime web lead',
    tone: 'green',
    payload: {
      firstName: 'Mary',
      lastName: 'Njeri',
      channel: 'website',
      message: 'Good morning, I would like to book an antenatal appointment. When are you open this week?',
      treatment: 'Antenatal Care',
      urgency: 'This month',
    },
  },
  {
    key: 'fertility',
    label: 'Enquiry — fertility / IVF',
    hint: 'Facebook Messenger',
    tone: 'blue',
    payload: {
      firstName: 'Faith',
      lastName: 'Wambui',
      channel: 'facebook',
      message: 'Hi, do you offer IVF? How long is the wait for a fertility consult?',
      treatment: 'Infertility',
      urgency: 'Planning ahead',
    },
  },
  {
    key: 'cold',
    label: 'Cold — just wants the price list',
    hint: 'clinic website form',
    tone: 'slate',
    payload: {
      firstName: 'Brian',
      lastName: 'Otieno',
      channel: 'website',
      message: 'Please send me your price list.',
      treatment: '',
      urgency: 'Planning ahead',
    },
  },
];

interface RunResult {
  score?: number;
  tier?: string;
  stage?: string;
  calendarId?: string;
  appointmentId?: string;
  message?: string;
  reasons?: string[];
  reply?: { channel: string; body: string };
}

const phoneBubble = (body: string, tone: 'in' | 'out') =>
  tone === 'in'
    ? 'self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200'
    : 'self-end max-w-[85%] rounded-2xl rounded-br-sm bg-clinic-500 px-3.5 py-2.5 text-sm text-white';

export function QualifierDemo() {
  const [active, setActive] = useState<ScenarioKey>('urgent');
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenario: Scenario = SCENARIOS.find((s) => s.key === active) ?? SCENARIOS[0]!;

  const run = async (s: Scenario) => {
    setActive(s.key);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s.payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Request failed');
      setResult(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Scenario picker */}
      <div className="lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pick an inbound lead</p>
        <div className="mt-3 space-y-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => run(s)}
              disabled={loading}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                active === s.key ? 'border-clinic-600 bg-clinic-50 ring-1 ring-clinic-600' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-ink-800">{s.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{s.hint}</p>
              </div>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.tone === 'red' ? 'bg-red-500' : s.tone === 'green' ? 'bg-clinic-500' : s.tone === 'blue' ? 'bg-sky-500' : 'bg-slate-400'}`} />
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Every scenario runs the real pipeline: score → draft → route → auto-book. Nothing here is staged — it is the same code n8n calls.
        </p>
      </div>

      {/* WhatsApp preview */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
          <div className="mx-auto flex h-[430px] max-w-md flex-col rounded-2xl bg-[url(/whatsapp-bg.svg)] bg-cover shadow-inner">
            <div className="flex items-center gap-3 rounded-t-2xl bg-clinic-700 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">M</span>
              <div>
                <p className="text-sm font-semibold text-white">Mercy Medical Centre</p>
                <p className="text-xs text-clinic-100">online</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {loading ? (
                <div className="flex items-center gap-2 self-start rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-500 ring-1 ring-slate-200">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              ) : (
                <div className="flex flex-col space-y-3">
                  <div className={phoneBubble(scenario.payload.message, 'in')}>
                    {scenario.payload.message}
                    <span className="mt-1 block text-right text-[10px] text-slate-400">10:24</span>
                  </div>
                  {result?.reply && (
                    <div className={phoneBubble(result.reply.body, 'out')}>
                      <p className="whitespace-pre-line">{result.reply.body}</p>
                      <span className="mt-1 block text-right text-[10px] text-clinic-100">10:25</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !result ? (
            <p className="text-sm text-slate-500">Pick a scenario to watch the engine decide — score, tier, routing and the drafted WhatsApp reply.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">score {result.score}</Badge>
              <TierBadge tier={result.tier} />
              <Badge tone={result.appointmentId ? 'green' : 'slate'}>{result.appointmentId ? 'auto-booked' : 'qualified'}</Badge>
              {result.stage && <Badge>{result.stage}</Badge>}
              {result.calendarId && <Badge tone="violet">{result.calendarId}</Badge>}
              <span className="ml-auto text-xs text-slate-400">
                {result.reply?.channel === 'whatsapp' ? 'queued to outbox for staff approval' : 'reply drafted'}
              </span>
            </div>
          )}
          {result?.reasons && result.reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.reasons.map((r) => (
                <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
