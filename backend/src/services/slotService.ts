/**
 * Doctor availability slot generation.
 *
 * Pure, dependency-free domain logic: given a doctor's weekly working windows
 * and a target date, compute the bookable "HH:mm" slots — subtracting already
 * booked times, blocked dates, and (for today) slots that have already passed.
 *
 * All time math is done in UTC wall-clock so the result is deterministic and
 * unit-testable without a clock or a database. `generateSlots` is the single
 * source of truth used by both the availability endpoint and the appointment
 * booking guard, so what a patient is offered is exactly what booking accepts.
 */

export interface WeeklyWindow {
  /** Day of week, 0 = Sunday … 6 = Saturday (matches Date.getUTCDay). */
  weekday: number;
  /** Window start, "HH:mm" (24h). */
  start: string;
  /** Window end, "HH:mm" (24h), exclusive. */
  end: string;
}

export interface AvailabilityLike {
  weekly: WeeklyWindow[];
  slotDurationMinutes: number;
  blockedDates?: (Date | string)[];
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" → minutes since midnight, or null if malformed. */
export function timeToMinutes(time: string): number | null {
  if (typeof time !== 'string') return null;
  const m = TIME_RE.exec(time.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** minutes since midnight → "HH:mm". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const toDate = (d: Date | string): Date => (d instanceof Date ? d : new Date(d));

const sameUtcDay = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

/**
 * Compute the open slots for `date`.
 *
 * @param availability  the doctor's weekly windows + slot duration + blocked dates
 * @param date          the target day
 * @param bookedTimes   "HH:mm" times already taken on that day
 * @param now           reference time (injected for testability; used to drop
 *                      past slots when `date` is today)
 */
export function generateSlots(
  availability: AvailabilityLike | null | undefined,
  date: Date | string,
  bookedTimes: string[] = [],
  now: Date = new Date(),
): string[] {
  if (!availability || !Array.isArray(availability.weekly)) return [];

  const target = toDate(date);
  if (Number.isNaN(target.getTime())) return [];

  const duration = availability.slotDurationMinutes;
  if (!Number.isFinite(duration) || duration <= 0) return [];

  // A blocked date yields no slots at all.
  const blocked = (availability.blockedDates ?? []).some((b) => {
    const bd = toDate(b);
    return !Number.isNaN(bd.getTime()) && sameUtcDay(bd, target);
  });
  if (blocked) return [];

  const weekday = target.getUTCDay();
  const booked = new Set(bookedTimes);
  const slots = new Set<string>();

  for (const window of availability.weekly) {
    if (!window || window.weekday !== weekday) continue;
    const start = timeToMinutes(window.start);
    const end = timeToMinutes(window.end);
    if (start === null || end === null || start >= end) continue;

    // A slot must fit entirely inside the window: [t, t+duration] ⊆ [start, end].
    for (let t = start; t + duration <= end; t += duration) {
      slots.add(minutesToTime(t));
    }
  }

  // Drop already-booked times.
  for (const time of booked) slots.delete(time);

  // For today, drop slots whose start time is already in the past.
  if (sameUtcDay(target, now)) {
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    for (const time of [...slots]) {
      const tm = timeToMinutes(time);
      if (tm !== null && tm <= nowMinutes) slots.delete(time);
    }
  }

  return [...slots].sort();
}

/**
 * Whether `time` is a slot the doctor offers on `date` (ignoring current
 * bookings — the caller checks double-booking separately). Used to reject a
 * booking that falls outside the doctor's published schedule.
 */
export function isWithinSchedule(
  availability: AvailabilityLike | null | undefined,
  date: Date | string,
  time: string,
  now: Date = new Date(),
): boolean {
  return generateSlots(availability, date, [], now).includes(time);
}
