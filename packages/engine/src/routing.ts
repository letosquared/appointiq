/**
 * Routing: which calendar/doctor should own this lead, and what the pipeline
 * should do next. Mirrors the sandbox seed: each service maps to a calendar and
 * a doctor, with a fallback for when the primary is not available.
 */

import type { LeadSignal, Tier } from './scoring';

export interface CalendarRef {
  id: string;
  doctorId: string;
  service: string;
  capacity: number;
}

export interface RoutingDecision {
  calendarId: string;
  doctorId: string;
  reason: string;
  suggestedSlotWindow: { start: string; end: string };
}

/** Exact same ids as the sandbox seed (packages/sandbox/src/seed.ts). */
export const SERVICE_ROUTES: Record<string, { calendarId: string; doctorId: string }> = {
  'Antenatal Care': { calendarId: 'cal_antenatal_mwangi', doctorId: 'u_dr_mwangi' },
  Gynaecology: { calendarId: 'cal_gynae_mwangi', doctorId: 'u_dr_mwangi' },
  Infertility: { calendarId: 'cal_infertility_wahome', doctorId: 'u_dr_wahome' },
  'Childbirth Class': { calendarId: 'cal_childbirth_mutua', doctorId: 'u_dr_mutua' },
  'Wellness Clinic': { calendarId: 'cal_wellness_clinic', doctorId: 'u_dr_wahome' },
  'Family Planning': { calendarId: 'cal_family_planning', doctorId: 'u_dr_mutua' },
};

export function detectService(signal: LeadSignal): string {
  const cf = signal.customFields ?? {};
  const explicit = String(cf.treatment_interest ?? '');
  if (explicit && SERVICE_ROUTES[explicit]) return explicit;
  const message = signal.message ?? '';
  if (/(antenat|pregnan|pre-natal|prenatal|obstetric|scan)/i.test(message)) return 'Antenatal Care';
  if (/(infert|conceiv|fertility|ivf|trying)/i.test(message)) return 'Infertility';
  if (/(fibroid|gynae|menstrual|pap|std|period|pain|bleed)/i.test(message)) return 'Gynaecology';
  if (/(childbirth|birth class|lamaze|breastfeed|newborn)/i.test(message)) return 'Childbirth Class';
  if (/(family planning|contracept|implant|coil)/i.test(message)) return 'Family Planning';
  if (/(wellness|check-?up|screening|fitness)/i.test(message)) return 'Wellness Clinic';
  return 'Gynaecology';
}

export function routeLead(signal: LeadSignal, now: Date = new Date(), tier?: Tier): RoutingDecision {
  const service = detectService(signal);
  const route = SERVICE_ROUTES[service] ?? SERVICE_ROUTES.Gynaecology!;
  // Hot leads need same-day attention: tight 24h booking window. Everything
  // else gets the standard 72h window.
  const windowHours = tier === 'hot' ? 24 : 72;
  const start = now.toISOString();
  const end = new Date(now.getTime() + windowHours * 3600_000).toISOString();
  return {
    calendarId: route.calendarId,
    doctorId: route.doctorId,
    reason: `${service} → ${route.calendarId}`,
    suggestedSlotWindow: { start, end },
  };
}
