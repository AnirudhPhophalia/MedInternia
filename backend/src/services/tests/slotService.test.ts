import {
  generateSlots,
  isWithinSchedule,
  timeToMinutes,
  minutesToTime,
  AvailabilityLike,
} from '../slotService';

// A Wednesday (2025-06-04 is a Wednesday, weekday 3 in UTC).
const WED = '2025-06-04';
const WED_WEEKDAY = 3;
// A far-future reference "now" so today's past-slot filtering doesn't interfere
// unless a test explicitly targets it.
const PAST_NOW = new Date('2000-01-01T00:00:00.000Z');

const avail = (over: Partial<AvailabilityLike> = {}): AvailabilityLike => ({
  weekly: [{ weekday: WED_WEEKDAY, start: '09:00', end: '11:00' }],
  slotDurationMinutes: 30,
  blockedDates: [],
  ...over,
});

describe('timeToMinutes / minutesToTime', () => {
  it('round-trips valid times', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(0)).toBe('00:00');
  });
  it('rejects malformed times', () => {
    expect(timeToMinutes('9:30')).toBeNull();
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('12:60')).toBeNull();
    expect(timeToMinutes('noon')).toBeNull();
  });
});

describe('generateSlots', () => {
  it('generates whole slots within a window', () => {
    expect(generateSlots(avail(), WED, [], PAST_NOW)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('never emits a partial slot past the window end', () => {
    // 09:00–10:15 with 30-min slots → only 09:00, 09:30 (10:00+30 = 10:30 > 10:15).
    const a = avail({ weekly: [{ weekday: WED_WEEKDAY, start: '09:00', end: '10:15' }] });
    expect(generateSlots(a, WED, [], PAST_NOW)).toEqual(['09:00', '09:30']);
  });

  it('returns nothing on a weekday with no window', () => {
    // 2025-06-05 is a Thursday (weekday 4); availability only covers Wednesday.
    expect(generateSlots(avail(), '2025-06-05', [], PAST_NOW)).toEqual([]);
  });

  it('subtracts already-booked times', () => {
    expect(generateSlots(avail(), WED, ['09:30', '10:30'], PAST_NOW)).toEqual(['09:00', '10:00']);
  });

  it('returns nothing on a blocked date', () => {
    const a = avail({ blockedDates: [new Date(`${WED}T00:00:00.000Z`)] });
    expect(generateSlots(a, WED, [], PAST_NOW)).toEqual([]);
  });

  it('merges multiple windows on the same weekday', () => {
    const a = avail({
      weekly: [
        { weekday: WED_WEEKDAY, start: '09:00', end: '10:00' },
        { weekday: WED_WEEKDAY, start: '14:00', end: '15:00' },
      ],
    });
    expect(generateSlots(a, WED, [], PAST_NOW)).toEqual(['09:00', '09:30', '14:00', '14:30']);
  });

  it('drops slots that have already passed today', () => {
    // "now" = the target Wednesday at 09:45 UTC → 09:00 and 09:30 are past.
    const now = new Date(`${WED}T09:45:00.000Z`);
    expect(generateSlots(avail(), WED, [], now)).toEqual(['10:00', '10:30']);
  });

  it('keeps all slots when the date is in the future relative to now', () => {
    const now = new Date(`${WED}T23:59:00.000Z`);
    // A future Wednesday (2025-06-11) is unaffected by today's clock.
    expect(generateSlots(avail(), '2025-06-11', [], now)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('handles invalid / empty configs gracefully', () => {
    expect(generateSlots(null, WED, [], PAST_NOW)).toEqual([]);
    expect(generateSlots(avail({ slotDurationMinutes: 0 }), WED, [], PAST_NOW)).toEqual([]);
    expect(generateSlots(avail({ weekly: [{ weekday: WED_WEEKDAY, start: '11:00', end: '09:00' }] }), WED, [], PAST_NOW)).toEqual([]);
    expect(generateSlots(avail(), 'not-a-date', [], PAST_NOW)).toEqual([]);
  });
});

describe('isWithinSchedule', () => {
  it('accepts a real slot and rejects off-grid / out-of-window times', () => {
    expect(isWithinSchedule(avail(), WED, '09:30', PAST_NOW)).toBe(true);
    expect(isWithinSchedule(avail(), WED, '09:45', PAST_NOW)).toBe(false); // not aligned
    expect(isWithinSchedule(avail(), WED, '11:00', PAST_NOW)).toBe(false); // window end
    expect(isWithinSchedule(avail(), '2025-06-05', '09:00', PAST_NOW)).toBe(false); // wrong weekday
  });

  it('ignores current bookings (double-booking is checked separately)', () => {
    // Even a booked-looking time is "within schedule"; slot generation for the
    // guard passes no booked set.
    expect(isWithinSchedule(avail(), WED, '09:00', PAST_NOW)).toBe(true);
  });
});
