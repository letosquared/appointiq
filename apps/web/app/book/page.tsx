'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, BrandWordmark } from '@/components/ui';

interface CatalogService {
  name: string;
  calendarId: string;
  doctorName?: string;
  calendarName?: string;
}

interface Confirmation {
  contact: { id: string; name: string };
  appointment: { id: string; startTime: string; endTime: string };
}

type Step = 'service' | 'slot' | 'details' | 'done';

export default function BookPage() {
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<CatalogService | null>(null);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, string[]>>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/catalog', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCatalog(d.services ?? []))
      .catch(() => setCatalog([]));
  }, []);

  const loadSlots = useCallback(async (calendarId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/book?calendarId=${encodeURIComponent(calendarId)}`, { cache: 'no-store' });
      const data = await res.json();
      const grouped: Record<string, string[]> = {};
      for (const [day, dayData] of Object.entries(data.slots ?? {})) {
        grouped[day] = (dayData as { slots: string[] }).slots ?? [];
      }
      setSlotsByDay(grouped);
      setStep('slot');
    } catch {
      setError('Could not load slots. Is the sandbox running?');
    } finally {
      setLoading(false);
    }
  }, []);

  const dayList = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' });
    return Object.keys(slotsByDay).filter((d) => (slotsByDay[d] ?? []).length > 0).map((d) => ({ key: d, label: fmt.format(new Date(`${d}T12:00:00Z`)) }));
  }, [slotsByDay]);

  async function submit() {
    if (!service || !selectedSlot) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: service.calendarId,
          startTime: selectedSlot,
          ...form,
          source: 'Clinic Website',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Booking failed');
        setLoading(false);
        return;
      }
      setConfirmation(data);
      setStep('done');
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandWordmark title="Book an appointment" sub="Mercy Medical Centre · Kaunda Street, Nairobi" />
          </div>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Back</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {step === 'service' && (
          <div>
            <h1 className="text-2xl font-bold text-ink-800">What do you need?</h1>
            <p className="mt-1 text-sm text-slate-500">Choose a service — we‘ll find the right doctor and their next free slots.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {catalog.map((s) => (
                <button
                  key={s.calendarId}
                  onClick={() => {
                    setService(s);
                    void loadSlots(s.calendarId);
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-clinic-500 hover:shadow"
                >
                  <p className="font-semibold text-ink-800">{s.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{s.doctorName}</p>
                  <div className="mt-3">
                    <Badge tone="green">{s.calendarName}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'slot' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-ink-800">Pick a time</h1>
                <p className="mt-1 text-sm text-slate-500">{service?.name} with {service?.doctorName}</p>
              </div>
              <button onClick={() => setStep('service')} className="text-sm font-medium text-clinic-700 hover:underline">Change service</button>
            </div>
            {loading ? (
              <p className="py-8 text-sm text-slate-500">Loading slots…</p>
            ) : (
              <div className="space-y-6">
                {dayList.map((day) => (
                  <div key={day.key}>
                    <p className="mb-2 text-sm font-semibold text-slate-700">{day.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {(slotsByDay[day.key] ?? []).map((slot) => {
                        const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(slot));
                        const active = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              active ? 'border-clinic-600 bg-clinic-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-clinic-500'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-500">{selectedSlot ? 'Selected a time' : 'Select a time to continue'}</p>
                  <button
                    disabled={!selectedSlot}
                    onClick={() => setStep('details')}
                    className="rounded-lg bg-clinic-600 px-4 py-2 font-medium text-white hover:bg-clinic-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div>
            <h1 className="text-2xl font-bold text-ink-800">Your details</h1>
            <p className="mt-1 text-sm text-slate-500">We‘ll confirm on WhatsApp — same number GHL will use to follow up.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {([
                ['firstName', 'First name', 'text'],
                ['lastName', 'Last name', 'text'],
                ['phone', 'Phone / WhatsApp', 'tel'],
                ['email', 'Email (optional)', 'email'],
              ] as const).map(([key, label, type]) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-clinic-500 focus:outline-none focus:ring-1 focus:ring-clinic-500"
                  />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-clinic-500 focus:outline-none focus:ring-1 focus:ring-clinic-500"
                />
              </label>
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <button onClick={() => setStep('slot')} className="text-sm font-medium text-slate-500 hover:text-slate-900">← Back</button>
              <button
                onClick={() => void submit()}
                disabled={loading || !form.firstName || !form.phone}
                className="rounded-lg bg-clinic-600 px-5 py-2.5 font-medium text-white hover:bg-clinic-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Booking…' : 'Confirm booking'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && confirmation && (
          <div className="rounded-2xl border border-clinic-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clinic-100 text-2xl">✓</div>
            <h1 className="mt-4 text-2xl font-bold text-ink-800">You‘re booked, {confirmation.contact.name.split(' ')[0]}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(confirmation.appointment.startTime))}
            </p>
            <p className="mt-1 text-sm text-slate-500">Mercy Medical Centre · Cardinal Otunga Plaza Annex, 6th Floor, Kaunda Street</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Home</Link>
              <Link href="/dashboard" className="rounded-lg bg-clinic-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinic-700">
                See what happened in ops
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
