'use client';

import { useState } from 'react';
import type { AutomationRun } from './types';

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  google: 'Google Ads',
  facebook: 'Facebook',
  referral: 'Referral',
  website: 'Clinic Website',
  call: 'Phone Call',
};

const SCRIPT = [
  'Good afternoon! I am expecting, and I have been having some bleeding and cramping. I am really worried — can you see me today?',
  'Hello, my wife and I have been trying to conceive for two years with no luck. Do you do fertility treatment? Please book us this week.',
  'Hi, do you offer childbirth preparation classes? When are they?',
  'I would like a wellness check-up and a pap smear. Are you open on Saturday?',
  'Please send me your price list for family planning consultations.',
  'My periods are very painful. Can I book a gynaecology consult this month?',
];

export default function SimulateLead({ onDone }: { onDone: (run?: AutomationRun) => void }) {
  const [channel, setChannel] = useState('whatsapp');
  const [treatment, setTreatment] = useState('');
  const [urgency, setUrgency] = useState('This week');
  const [insurance, setInsurance] = useState('');
  const [message, setMessage] = useState(SCRIPT[0]);
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function simulate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/demo/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          treatment: treatment || undefined,
          urgency,
          insurance: insurance || undefined,
          message,
          firstName: firstName || `Demo ${CHANNEL_LABEL[channel]}`,
          lastName: '',
          phone: '+2547' + Math.floor(10000000 + Math.random() * 89999999),
          email: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Simulation failed');
      onDone(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-clinic-500 focus:outline-none focus:ring-1 focus:ring-clinic-500';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Simulate an inbound lead</h3>
        <p className="mt-0.5 text-xs text-slate-500">Drops a contact into GHL and runs the full qualification pipeline.</p>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Channel</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {Object.entries(CHANNEL_LABEL).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setChannel(k)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  channel === k ? 'border-clinic-600 bg-clinic-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-clinic-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Service</span>
            <select value={treatment} onChange={(e) => setTreatment(e.target.value)} className={inputCls}>
              <option value="">Auto-detect</option>
              <option>Antenatal Care</option>
              <option>Infertility</option>
              <option>Gynaecology</option>
              <option>Childbirth Class</option>
              <option>Wellness Clinic</option>
              <option>Family Planning</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Urgency</span>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className={inputCls}>
              <option>Immediate</option>
              <option>This week</option>
              <option>This month</option>
              <option>Planning ahead</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Insurance</span>
            <select value={insurance} onChange={(e) => setInsurance(e.target.value)} className={inputCls}>
              <option value="">None</option>
              <option>Jubilee</option>
              <option>Madison</option>
              <option>CIC</option>
              <option>APA</option>
              <option>Old Mutual</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={inputCls} />
          <span className="mt-1 block text-xs text-slate-400">
            Pro tip: mention “book”, “schedule” or “come in” and the pipeline will auto-book the next free slot.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient name (optional)</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Wanjiru" className={inputCls} />
        </label>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">Demo scripts</span>
          <div className="flex gap-1.5">
            {SCRIPT.map((s, i) => (
              <button
                key={i}
                onClick={() => setMessage(s)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                #{i + 1}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => void simulate()}
          disabled={busy}
          className="w-full rounded-lg bg-clinic-600 px-4 py-2.5 font-semibold text-white hover:bg-clinic-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Running pipeline…' : 'Simulate lead'}
        </button>
      </div>
    </div>
  );
}
