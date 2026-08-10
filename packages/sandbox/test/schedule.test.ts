import { describe, expect, it } from 'vitest';
import { generateSlots, localToUtc, type CalendarSchedule } from '../src/schedule';

function makeSchedule(overrides: Partial<CalendarSchedule> = {}): CalendarSchedule {
  return {
    calendarId: 'cal_test',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 30,
    appointmentDurationMinutes: 30,
    bufferMinutes: 0,
    minNoticeHours: 0,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
    ...overrides,
  };
}

describe('generateSlots', () => {
  it('returns a full day of slots inside working hours, skipping lunch', () => {
    // Monday 2026-01-05 in Nairobi (+03:00).
    const now = new Date('2026-01-05T00:00:00.000Z');
    const result = generateSlots({
      schedule: makeSchedule(),
      startDate: '2026-01-05',
      endDate: '2026-01-05',
      timezone: 'Africa/Nairobi',
      now,
    });
    const slots = result.slots['2026-01-05']?.slots ?? [];

    // Morning: 08:00→12:30 = 10 half-hour slots. Afternoon: 14:00→16:30 = 6.
    expect(slots).toHaveLength(16);
    expect(slots[0]).toBe('2026-01-05T05:00:00.000Z'); // 08:00 Nairobi = 05:00 UTC
    expect(slots[8]).toBe('2026-01-05T09:00:00.000Z'); // 12:00 Nairobi
    expect(slots[9]).toBe('2026-01-05T09:30:00.000Z'); // 12:30 Nairobi (ends at lunch)
    expect(slots[10]).toBe('2026-01-05T11:00:00.000Z'); // 14:00 Nairobi
    // No lunch slots at 13:00 / 13:30 Nairobi (10:00 / 10:30 UTC).
    expect(slots.some((s) => s === '2026-01-05T10:00:00.000Z')).toBe(false);
    expect(slots.some((s) => s === '2026-01-05T10:30:00.000Z')).toBe(false);
  });

  it('returns Saturday slots and no Sunday slots', () => {
    const now = new Date('2026-01-10T00:00:00.000Z'); // Saturday
    const result = generateSlots({
      schedule: makeSchedule(),
      startDate: '2026-01-10',
      endDate: '2026-01-11',
      timezone: 'Africa/Nairobi',
      now,
    });
    const sat = result.slots['2026-01-10']?.slots ?? [];
    expect(sat.length).toBe(6); // 09:00 → 11:30
    expect(result.slots['2026-01-11']).toBeUndefined(); // Sunday closed
  });

  it('drops slots that collide with a booked appointment', () => {
    const now = new Date('2026-01-05T00:00:00.000Z');
    const result = generateSlots({
      schedule: makeSchedule(),
      startDate: '2026-01-05',
      endDate: '2026-01-05',
      timezone: 'Africa/Nairobi',
      now,
      booked: [{ start: new Date('2026-01-05T05:30:00.000Z'), end: new Date('2026-01-05T06:00:00.000Z') }],
    });
    const slots = result.slots['2026-01-05']?.slots ?? [];
    expect(slots).not.toContain('2026-01-05T05:30:00.000Z');
    expect(slots).toHaveLength(15);
  });

  it('is DST-correct: New York summer slots shift an hour vs winter', () => {
    const schedule = makeSchedule({ timezone: 'America/New_York' });
    const summer = generateSlots({
      schedule,
      startDate: '2026-07-06', // EDT = UTC-4
      endDate: '2026-07-06',
      timezone: 'America/New_York',
      now: new Date('2026-07-06T00:00:00.000Z'),
    });
    const winter = generateSlots({
      schedule,
      startDate: '2026-01-05', // EST = UTC-5
      endDate: '2026-01-05',
      timezone: 'America/New_York',
      now: new Date('2026-01-05T00:00:00.000Z'),
    });
    expect(summer.slots['2026-07-06']?.slots[0]).toBe('2026-07-06T12:00:00.000Z'); // 08:00 EDT
    expect(winter.slots['2026-01-05']?.slots[0]).toBe('2026-01-05T13:00:00.000Z'); // 08:00 EST
  });
});

describe('localToUtc', () => {
  it('converts Nairobi wall time correctly', () => {
    const d = localToUtc('Africa/Nairobi', '2026-01-05', '09', '00');
    expect(d.toISOString()).toBe('2026-01-05T06:00:00.000Z');
  });
});
