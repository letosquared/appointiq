import { describe, expect, it } from 'vitest';
import { draftReply, routeLead, scoreLead } from '../src';
import type { LeadSignal } from '../src';

const baseSignal = (overrides: Partial<LeadSignal> = {}): LeadSignal => ({
  contact: { firstName: 'Achieng', phone: '+254700000000', email: 'achieng@example.com' },
  customFields: {},
  receivedAt: '2026-01-05T09:30:00.000Z', // Monday 12:30 Nairobi = working hours
  ...overrides,
});

describe('scoreLead', () => {
  it('scores an urgent WhatsApp lead as hot', () => {
    const q = scoreLead(
      baseSignal({
        channel: 'whatsapp',
        customFields: { urgency: 'Immediate', treatment_interest: 'Infertility', lead_source: 'Referral' },
        message: 'I am bleeding and very worried. Please book us today, this is urgent.',
      }),
    );
    expect(q.tier).toBe('hot');
    expect(q.score).toBeGreaterThanOrEqual(70);
    expect(q.reasons).toContain('hot lead — prioritize');
  });

  it('scores a cold web form lead without contact info as cold', () => {
    const q = scoreLead(
      baseSignal({
        contact: {},
        channel: 'web',
        customFields: { urgency: 'Planning ahead', treatment_interest: 'Wellness Clinic' },
        message: 'Please send me your price list.',
      }),
    );
    expect(q.tier).toBe('cold');
    expect(q.score).toBeLessThan(45);
  });

  it('keeps scores within 0-100', () => {
    const q = scoreLead(
      baseSignal({
        channel: 'whatsapp',
        customFields: { urgency: 'Immediate', treatment_interest: 'Infertility', lead_source: 'Referral' },
        message: 'Severe pain and bleeding today. This is urgent, please help. Can you see me today?'.repeat(3),
      }),
    );
    expect(q.score).toBeLessThanOrEqual(100);
  });

  it('floors a red-flag message to warm even with no custom fields or contact info', () => {
    const q = scoreLead(baseSignal({ contact: {}, message: 'I am bleeding heavily, please help' }));
    expect(q.tier).toBe('warm');
    expect(q.breakdown.urgency).toBeGreaterThanOrEqual(20);
    expect(q.reasons.some((r) => r.includes('red-flag'))).toBe(true);
  });

  it('treats red-flag language as this-week urgency when the form is incomplete', () => {
    const q = scoreLead(baseSignal({ contact: {}, message: 'Can you help? I am in severe pain today.' }));
    expect(q.breakdown.urgency).toBe(20);
    expect(q.tier).toBe('warm');
  });

  it('overrides a warm score to hot for red-flag + Immediate urgency', () => {
    const q = scoreLead(
      baseSignal({
        contact: { firstName: 'Achieng', phone: '+254700000000' },
        customFields: { urgency: 'Immediate', treatment_interest: 'Antenatal Care', lead_source: 'WhatsApp' },
        message: 'I am bleeding and very worried. Can I come in today please?',
        receivedAt: '2026-01-04T19:00:00.000Z',
      }),
    );
    expect(q.score).toBeLessThan(70);
    expect(q.tier).toBe('hot');
    expect(q.reasons.some((r) => r.includes('safety override'))).toBe(true);
  });
});

describe('draftReply', () => {
  it('drafts an urgent WhatsApp reply for hot leads', () => {
    const r = draftReply(
      baseSignal({ customFields: { treatment_interest: 'Infertility' }, message: 'please book us this week' }),
      'hot',
    );
    expect(r.channel).toBe('whatsapp');
    expect(r.tone).toBe('urgent');
    expect(r.body).toContain('Achieng');
    expect(r.body).toContain('Mercy Medical Centre');
    expect(r.body).toContain('+254 729 370 022');
  });

  it('drafts a nurture reply for cold leads with email channel when no phone', () => {
    const r = draftReply(
      baseSignal({ contact: { firstName: 'Brian', email: 'b@example.com' }, customFields: { treatment_interest: 'Wellness Clinic' } }),
      'cold',
    );
    expect(r.channel).toBe('email');
    expect(r.tone).toBe('nurture');
    expect(r.body).toContain('When you are ready');
  });

  it('detects treatment from the message when no custom field is set', () => {
    const r = draftReply(baseSignal({ customFields: {}, message: 'Do you do childbirth preparation classes?' }), 'warm');
    expect(r.body).toContain('What stage of pregnancy are you at');
  });
});

describe('routeLead', () => {
  it('routes antenatal care to Dr. Mwangi’s antenatal calendar', () => {
    const r = routeLead(baseSignal({ customFields: { treatment_interest: 'Antenatal Care' } }));
    expect(r.calendarId).toBe('cal_antenatal_mwangi');
    expect(r.doctorId).toBe('u_dr_mwangi');
  });

  it('routes infertility to Dr. Wahome’s calendar', () => {
    const r = routeLead(baseSignal({ message: 'IVF options please' }));
    expect(r.calendarId).toBe('cal_infertility_wahome');
  });

  it('suggests a 72h booking window', () => {
    const now = new Date('2026-01-05T00:00:00.000Z');
    const r = routeLead(baseSignal({}), now);
    expect(r.suggestedSlotWindow.start).toBe('2026-01-05T00:00:00.000Z');
    expect(r.suggestedSlotWindow.end).toBe('2026-01-08T00:00:00.000Z');
  });

  it('tightens the window to 24h for hot leads', () => {
    const now = new Date('2026-01-05T00:00:00.000Z');
    const r = routeLead(baseSignal({}), now, 'hot');
    expect(r.suggestedSlotWindow.end).toBe('2026-01-06T00:00:00.000Z');
  });
});
