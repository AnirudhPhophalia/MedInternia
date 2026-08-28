// Aggregate study statistics over a user's spaced-repetition flashcards.
//
// The SM-2 fields (interval / repetitions / easeFactor / nextReview) already
// live on every card; this turns that raw scheduling state into a study
// dashboard summary. Kept as a pure function so it is unit-testable without a
// DB — pass plain card objects and a reference "now".

// A card is considered "mature" once its review interval reaches this many
// days — the conventional SM-2 graduation threshold between learning and
// long-term retention.
export const MATURE_INTERVAL_DAYS = 21;

export interface FlashcardStatsInput {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReview: Date | string;
}

export interface FlashcardStats {
  total: number;
  dueNow: number;
  newCards: number;
  learning: number;
  mature: number;
  averageEaseFactor: number;
  averageInterval: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const computeFlashcardStats = (
  cards: FlashcardStatsInput[],
  now: Date = new Date()
): FlashcardStats => {
  const total = cards.length;
  if (total === 0) {
    return {
      total: 0,
      dueNow: 0,
      newCards: 0,
      learning: 0,
      mature: 0,
      averageEaseFactor: 0,
      averageInterval: 0
    };
  }

  const nowMs = now.getTime();
  let dueNow = 0;
  let newCards = 0;
  let learning = 0;
  let mature = 0;
  let easeSum = 0;
  let intervalSum = 0;

  for (const card of cards) {
    if (new Date(card.nextReview).getTime() <= nowMs) dueNow += 1;

    if (card.repetitions === 0) {
      newCards += 1;
    } else if (card.interval >= MATURE_INTERVAL_DAYS) {
      mature += 1;
    } else {
      learning += 1;
    }

    easeSum += card.easeFactor;
    intervalSum += card.interval;
  }

  return {
    total,
    dueNow,
    newCards,
    learning,
    mature,
    averageEaseFactor: round2(easeSum / total),
    averageInterval: round2(intervalSum / total)
  };
};
