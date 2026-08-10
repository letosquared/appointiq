/**
 * Deterministic lead scoring.
 *
 * This is the no-API-key stand-in for an LLM qualifier. It scores a lead on
 * urgency, treatment value, source quality, engagement, timing and reachability,
 * then buckets the result into hot / warm / cold. Swapping in a real model later
 * is a one-interface change (see `docs/go-live.md`).
 */

export type Tier = 'hot' | 'warm' | 'cold';

export interface LeadSignal {
  contact: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    timezone?: string;
  };
  /** Custom fields keyed by fieldKey, e.g. `treatment_interest`, `urgency`. */
  customFields?: Record<string, string | number | boolean | string[] | null>;
  /** Free-text message the lead sent (WhatsApp, web form, email body…). */
  message?: string;
  channel?: 'whatsapp' | 'sms' | 'email' | 'web' | 'call' | 'facebook';
  source?: string;
  /** ISO datetime the signal was received. */
  receivedAt: string;
}

export interface ScoreBreakdown {
  urgency: number;
  treatment: number;
  source: number;
  engagement: number;
  timing: number;
  reachability: number;
}

export interface Qualification {
  score: number;
  tier: Tier;
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export interface ScoringConfig {
  /** Point weights per urgency label. */
  urgencyWeights: Record<string, number>;
  /** Extra points per treatment (value proxy). */
  treatmentWeights: Record<string, number>;
  sourceWeights: Record<string, number>;
  clinicTimezone: string;
  workingHours: { days: number[]; start: number; end: number };
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  urgencyWeights: {
    Immediate: 30,
    'This week': 20,
    'This month': 10,
    'Planning ahead': 0,
  },
  treatmentWeights: {
    Infertility: 10,
    'Antenatal Care': 8,
    Gynaecology: 6,
    'Wellness Clinic': 4,
    'Childbirth Class': 4,
    'Family Planning': 2,
  },
  sourceWeights: {
    Referral: 8,
    WhatsApp: 6,
    'Google Ads': 4,
    'Clinic Website': 3,
    Facebook: 2,
    Organic: 1,
  },
  clinicTimezone: 'Africa/Nairobi',
  workingHours: { days: [1, 2, 3, 4, 5], start: 8, end: 17 },
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function scoreLead(
  signal: LeadSignal,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): Qualification {
  const cf = signal.customFields ?? {};
  const reasons: string[] = [];
  const breakdown: ScoreBreakdown = {
    urgency: 0,
    treatment: 0,
    source: 0,
    engagement: 0,
    timing: 0,
    reachability: 0,
  };

  // Urgency
  const urgency = String(cf.urgency ?? 'Planning ahead');
  breakdown.urgency = config.urgencyWeights[urgency] ?? 0;
  if (breakdown.urgency >= 20) reasons.push(`urgency is '${urgency}'`);

  // Treatment value
  const treatment = String(cf.treatment_interest ?? '');
  breakdown.treatment = config.treatmentWeights[treatment] ?? 0;
  if (breakdown.treatment >= 8) reasons.push(`high-value ${treatment} case`);

  // Source quality
  const source = String(cf.lead_source ?? signal.source ?? '');
  breakdown.source = config.sourceWeights[source] ?? (source ? 1 : 0);
  if (breakdown.source >= 5) reasons.push(`strong source: ${source}`);

  // Engagement
  const message = signal.message?.trim() ?? '';
  if (message) {
    breakdown.engagement += 5;
    reasons.push('sent a message');
  }
  if (message.length > 80) {
    breakdown.engagement += 5;
    reasons.push('wrote a detailed message');
  }
  if (/\?/.test(message)) breakdown.engagement += 3;
  if (/(booking|appointment|when|available|today|tomorrow|sched)/i.test(message)) {
    breakdown.engagement += 5;
    reasons.push('shows booking intent');
  }
  if (/(urgent|pain|bleeding|severe|worried|pregnant|missed)/i.test(message)) {
    breakdown.engagement += 5;
    reasons.push('indicates clinical urgency');
  }

  // Timing
  const received = new Date(signal.receivedAt);
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: config.clinicTimezone, hour: '2-digit', hour12: false })
      .format(received) || 0,
  );
  const dow = new Intl.DateTimeFormat('en-US', { timeZone: config.clinicTimezone, weekday: 'short' })
    .format(received);
  const dowNum = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dow);
  const isWorkingDay = config.workingHours.days.includes(dowNum);
  if (isWorkingDay && hour >= config.workingHours.start && hour < config.workingHours.end) {
    breakdown.timing = 5;
    reasons.push('came in during clinic hours');
  } else if (isWorkingDay && hour >= 17) {
    breakdown.timing = 2;
  } else if (!isWorkingDay) {
    breakdown.timing = 1;
  }

  // Reachability
  if (signal.contact.phone) breakdown.reachability += 4;
  if (signal.contact.email) breakdown.reachability += 1;
  if (breakdown.reachability === 0) reasons.push('no phone or email on record');

  // Clinical red flags. Safety floor: language describing an active medical
  // emergency can never be treated as a cold lead, even if the intake form is
  // incomplete (no custom fields, no contact details). Treat the urgency
  // contribution as "this week" at minimum so the score reflects it too.
  const severe = /(bleeding|bleed|severe|urgently|emergency|heavy pain|passing out|fainting|convuls|can'?t breathe|difficulty breathing)/i.test(message);
  if (severe) {
    if (breakdown.urgency < 20) {
      breakdown.urgency = 20;
      reasons.push('clinical red-flag language — treated as this-week urgency');
    }
  }

  const score = clamp(
    breakdown.urgency + breakdown.treatment + breakdown.source + breakdown.engagement + breakdown.timing + breakdown.reachability,
  );
  let tier: Tier = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold';
  if (severe && tier === 'cold') {
    tier = 'warm';
    reasons.push('clinical red-flag language — cannot be a cold lead');
  }
  if (severe && urgency === 'Immediate' && tier !== 'hot') {
    tier = 'hot';
    reasons.push('clinical red-flag + Immediate urgency — safety override to hot');
  }
  if (tier === 'hot') reasons.push('hot lead — prioritize');

  return { score, tier, breakdown, reasons };
}

export function scoreToLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Hot';
  if (score >= 45) return 'Warm';
  if (score >= 25) return 'Cold';
  return 'Ice cold';
}
