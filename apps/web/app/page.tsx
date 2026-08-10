import Link from 'next/link';
import { getDashboardData } from '@/lib/data';
import { Badge, BrandWordmark, Logo } from '@/components/ui';
import { QualifierDemo } from '@/components/landing/QualifierDemo';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const data = await getDashboardData();
  const services = await fetchCatalog();
  const topSources = data.sources.slice(0, 4);
  const hot = data.contacts.filter((c) => c.tags?.includes('hot-lead')).length;
  const recentRuns = data.runs.slice(0, 3);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <BrandWordmark title="AppointIQ" sub="AI clinic automation · Mercy Medical Centre" />
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/book" className="rounded-lg bg-clinic-600 px-4 py-2 font-medium text-white hover:bg-clinic-700">
              Book an appointment
            </Link>
            <Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Ops dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-clinic-50 to-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Badge tone="green">Live demo</Badge>
              <Badge tone={data.mode === 'sandbox' ? 'amber' : 'blue'}>{data.mode === 'sandbox' ? 'GHL Sandbox' : 'Real GoHighLevel'}</Badge>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink-800 lg:text-5xl">
              No patient message goes unanswered — or un-booked.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              When a lead reaches out on WhatsApp, Facebook or Google, AppointIQ scores them, drafts a human reply,
              routes them to the right OB/GYN and books the next free slot — then hands the whole story to the clinic
              team in one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="rounded-lg bg-clinic-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-clinic-700">
                Book as a patient
              </Link>
              <Link href="/dashboard" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Open the ops dashboard
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-500">
              {data.counts.contacts} leads tracked · {data.counts.booked} booked · {data.counts.visited} visits · {hot} hot leads
            </p>
          </div>

          {/* Pipeline visualization */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient pipeline</p>
            <div className="mt-4 space-y-3">
              {data.pipeline.map((p) => {
                const pct = data.counts.contacts ? Math.round((p.count / data.counts.contacts) * 100) : 0;
                return (
                  <div key={p.stage}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{p.stage}</span>
                      <span className="text-slate-500">{p.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-clinic-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500">Top sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topSources.map((s) => (
                  <Badge key={s.source}>{s.source} · {s.count}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-ink-800">What happens the second a lead arrives</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { step: '01', title: 'Qualify', body: 'The engine scores urgency, source, treatment value and reachability in milliseconds — no API keys needed.' },
            { step: '02', title: 'Reply & route', body: 'A warm, service-specific reply is drafted and queued on WhatsApp. The lead is routed to the right doctor\'s calendar.' },
            { step: '03', title: 'Book & follow up', body: 'Booking intent auto-books the next free slot. The pipeline logs every run and n8n handles nurturing and rebooking.' },
          ].map((c) => (
            <div key={c.step} className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-bold text-clinic-600">{c.step}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink-800">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try the qualifier — live */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-ink-800">Try the qualifier — live</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick an inbound lead. AppointIQ scores it, drafts the reply, routes it to the right doctor and books a slot — in about a second.
            </p>
          </div>
          <QualifierDemo />
        </div>
      </section>

      {/* Services */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-800">Bookable services</h2>
              <p className="mt-1 text-sm text-slate-500">Live calendars, real doctors, real Nairobi hours.</p>
            </div>
            <Link href="/book" className="text-sm font-semibold text-clinic-700 hover:underline">
              Book now →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.name} className="rounded-xl border border-slate-200 p-5">
                <p className="font-semibold text-ink-800">{s.name}</p>
                <p className="mt-1 text-sm text-slate-500">{s.doctorName}</p>
                <div className="mt-3">
                  <Badge tone="green">{s.calendarName}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live automation feed */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-ink-800">Automation, live</h2>
        <p className="mt-1 text-sm text-slate-500">The most recent decisions the pipeline made.</p>
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {recentRuns.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No runs yet — open the dashboard and hit “Simulate inbound lead”.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentRuns.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800">{r.contactName}</span>
                    <Badge tone={r.type === 'booked' ? 'green' : 'blue'}>{r.type}</Badge>
                    <span className="text-slate-500">{r.message}</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-3">
            <Logo />
            <p>AppointIQ · a build-for-Conek demonstration on the GoHighLevel stack.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
            <Link href="/book" className="hover:text-slate-900">Book</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

async function fetchCatalog(): Promise<{ name: string; doctorName?: string; calendarName?: string }[]> {
  try {
    const res = await fetch(`${process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/catalog`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.services ?? [];
  } catch {
    return [];
  }
}
