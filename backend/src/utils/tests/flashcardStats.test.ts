import { computeFlashcardStats, MATURE_INTERVAL_DAYS } from '../flashcardStats';

const card = (over: Partial<Parameters<typeof computeFlashcardStats>[0][number]> = {}) => ({
  repetitions: 3,
  interval: 5,
  easeFactor: 2.5,
  nextReview: '2030-01-01T00:00:00.000Z',
  ...over
});

describe('computeFlashcardStats', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('returns zeroed stats for an empty deck', () => {
    expect(computeFlashcardStats([], now)).toEqual({
      total: 0,
      dueNow: 0,
      newCards: 0,
      learning: 0,
      mature: 0,
      averageEaseFactor: 0,
      averageInterval: 0
    });
  });

  it('counts cards due when nextReview is now or in the past', () => {
    const stats = computeFlashcardStats(
      [
        card({ nextReview: '2026-06-14T00:00:00.000Z' }), // past -> due
        card({ nextReview: now.toISOString() }), // exactly now -> due
        card({ nextReview: '2026-06-16T00:00:00.000Z' }) // future -> not due
      ],
      now
    );
    expect(stats.dueNow).toBe(2);
    expect(stats.total).toBe(3);
  });

  it('buckets cards into new / learning / mature by SM-2 state', () => {
    const stats = computeFlashcardStats(
      [
        card({ repetitions: 0, interval: 1 }), // new
        card({ repetitions: 2, interval: 6 }), // learning (below mature threshold)
        card({ repetitions: 5, interval: MATURE_INTERVAL_DAYS }), // mature (at threshold)
        card({ repetitions: 8, interval: 40 }) // mature
      ],
      now
    );
    expect(stats.newCards).toBe(1);
    expect(stats.learning).toBe(1);
    expect(stats.mature).toBe(2);
  });

  it('treats a new card as new even if its interval is high', () => {
    const stats = computeFlashcardStats([card({ repetitions: 0, interval: 50 })], now);
    expect(stats.newCards).toBe(1);
    expect(stats.mature).toBe(0);
  });

  it('averages ease factor and interval, rounded to 2 decimals', () => {
    const stats = computeFlashcardStats(
      [
        card({ easeFactor: 2.5, interval: 10 }),
        card({ easeFactor: 2.0, interval: 5 }),
        card({ easeFactor: 1.8, interval: 3 })
      ],
      now
    );
    expect(stats.averageEaseFactor).toBe(2.1);
    expect(stats.averageInterval).toBe(6);
  });
});
