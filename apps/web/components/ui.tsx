import type { ReactNode } from 'react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <img
      src="/mercy-logo.png"
      alt="Mercy Medical Centre logo"
      className={`${dims} shrink-0 rounded-full object-cover ring-1 ring-slate-200`}
    />
  );
}

export function BrandWordmark({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div>
        <p className="text-sm font-semibold leading-none text-ink-800">{title}</p>
        {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    green: 'bg-clinic-50 text-clinic-700 ring-clinic-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier?: string }) {
  const tone = tier === 'hot' ? 'red' : tier === 'warm' ? 'amber' : 'slate';
  return <Badge tone={tone as 'red'}>{tier ?? 'cold'}</Badge>;
}

export function StatCard({ label, value, sub, tone = 'green' }: { label: string; value: ReactNode; sub?: string; tone?: string }) {
  const accents: Record<string, string> = {
    green: 'bg-clinic-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-sky-500',
    violet: 'bg-violet-500',
    slate: 'bg-slate-500',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accents[tone] ?? accents.green}`} />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink-800">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function Panel({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title ? (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {right}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
