/**
 * Calendar scheduling for the sandbox.
 *
 * This mirrors how HighLevel calendars behave: a calendar has associated users
 * (our doctors), working hours, an appointment duration and buffers. `free-slots`
 * returns only slots that are inside working hours and do not collide with an
 * existing appointment or a manually blocked slot.
 *
 * Timezone math is done without a library: we resolve the UTC offset for the
 * calendar timezone using Intl and converge on the correct instant. Nairobi has
 * no DST, but the code is DST-correct for any IANA zone (tested against
 * America/New_York).
 */

export interface WorkHours {
  /** Days of week this rule applies to. 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Local wall-clock start, "HH:MM" (24h). */
  start: string;
  /** Local wall-clock end, "HH:MM" (24h). */
  end: string;
  /** Optional lunch break, excluded from availability. */
  breakStart?: string;
  breakEnd?: string;
}

export interface BlockedSlot {
  start: string; // ISO datetime
  end: string; // ISO datetime
  reason?: string;
}

export interface CalendarSchedule {
  calendarId: string;
  timezone: string;
  /** Granularity of the returned slots, in minutes. */
  slotIntervalMinutes: number;
  /** Length of each bookable appointment, in minutes. */
  appointmentDurationMinutes: number;
  /** Free minutes left before and after every booked slot. */
  bufferMinutes: number;
  /** Minimum advance notice before a slot is bookable (hours). */
  minNoticeHours: number;
  workingHours: WorkHours[];
  blockedSlots: BlockedSlot[];
}

/* ------------------------------------------------------------------ */
/* Timezone helpers                                                    */
/* ------------------------------------------------------------------ */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** UTC offset (in minutes) of `tz` at the given instant. */
export function utcOffsetMinutes(tz: string, atUtcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(atUtcMs);

  const read = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  const year = read('year');
  const month = read('month');
  const day = read('day');
  let hour = read('hour');
  // Intl can emit "24" for midnight in some locales.
  if (hour === 24) hour = 0;

  const localAsUtc = Date.UTC(year, month - 1, day, hour, read('minute'), read('second'));
  return Math.round((localAsUtc - atUtcMs) / 60000);
}

/** Given local wall time (date + HH:MM in `tz`), return the UTC instant. */
export function localToUtc(tz: string, date: string, hh: string, mm: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  let utc = Date.UTC(y!, m! - 1, d!, Number(hh), Number(mm));
  // Converge on the offset: Nairobi (no DST) converges in 1 pass.
  for (let i = 0; i < 3; i++) {
    const offset = utcOffsetMinutes(tz, utc);
    const next = Date.UTC(y!, m! - 1, d!, Number(hh), Number(mm)) - offset * 60000;
    if (next === utc) break;
    utc = next;
  }
  return new Date(utc);
}

export function toIso(d: Date): string {
  return d.toISOString();
}

export function dateKey(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const read = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

/** "YYYY-MM-DD HH:MM:SS" -> ISO. The legacy format the real GHL API returns. */
export function legacyToIso(legacy: string, timezone?: string): string {
  const m = legacy.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return legacy;
  const [, y, mo, d, h, mi, s] = m;
  if (timezone) {
    return localToUtc(timezone, `${y}-${mo}-${d}`, h!, mi!).toISOString();
  }
  return new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? '0')),
  ).toISOString();
}

/* ------------------------------------------------------------------ */
/* Slot generation                                                     */
/* ------------------------------------------------------------------ */

export interface FreeSlotResult {
  /** Date-keyed (YYYY-MM-DD in the calendar timezone) slot lists. */
  slots: Record<string, { slots: string[] }>;
}

export interface BookedWindow {
  start: Date;
  end: Date;
}

export interface GenerateSlotsOptions {
  schedule: CalendarSchedule;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  timezone?: string;
  now?: Date;
  booked?: BookedWindow[];
  /** Slots that start before this instant are omitted. Defaults to now. */
  earliestStart?: Date;
}

function minutesOf(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h! * 60 + m!;
}

function hhmm(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function generateSlots(opts: GenerateSlotsOptions): FreeSlotResult {
  const { schedule, startDate, endDate, timezone = schedule.timezone } = opts;
  const now = opts.now ?? new Date();
  const earliest = opts.earliestStart ?? now;
  const booked = opts.booked ?? [];

  const result: Record<string, { slots: string[] }> = {};

  // Walk each date, generating candidate slots for every working-hours rule.
  const cursor = localToUtc(timezone, startDate, '00', '00');
  const endCursor = localToUtc(timezone, endDate, '23', '59');

  for (const d = new Date(cursor); d.getTime() <= endCursor.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = dateKey(d, timezone);

    // Resolve weekday in the target timezone.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).formatToParts(d);
    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value;
    const dowTz = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayPart ?? '');

    const daySlots: string[] = [];

    for (const wh of schedule.workingHours) {
      if (!wh.days.includes(dowTz)) continue;
      const dayStart = minutesOf(wh.start);
      const dayEnd = minutesOf(wh.end);
      const breakStart = wh.breakStart ? minutesOf(wh.breakStart) : -1;
      const breakEnd = wh.breakEnd ? minutesOf(wh.breakEnd) : -1;

      for (let t = dayStart; t + schedule.appointmentDurationMinutes <= dayEnd; t += schedule.slotIntervalMinutes) {
        // Skip lunch.
        if (t >= breakStart && t < breakEnd) continue;
        const [hh, mm] = hhmm(t).split(':');
        const slotStart = localToUtc(timezone, key, hh!, mm!);
        const slotEnd = new Date(slotStart.getTime() + schedule.appointmentDurationMinutes * 60000);
        if (slotStart < earliest) continue;
        if (conflicts(slotStart, slotEnd, schedule, booked)) continue;
        daySlots.push(slotStart.toISOString());
      }
    }

    if (daySlots.length) result[key] = { slots: daySlots };
  }

  return { slots: result };
}

/** True when [start,end) overlaps a booked appointment or a blocked slot. */
export function conflicts(
  start: Date,
  end: Date,
  schedule: CalendarSchedule,
  booked: BookedWindow[],
): boolean {
  const buffer = schedule.bufferMinutes * 60000;
  const startBuf = new Date(start.getTime() - buffer);
  const endBuf = new Date(end.getTime() + buffer);

  for (const b of booked) {
    if (startBuf < b.end && b.start < endBuf) return true;
  }
  for (const block of schedule.blockedSlots) {
    const bs = new Date(block.start);
    const be = new Date(block.end);
    if (start < be && bs < end) return true;
  }
  return false;
}
