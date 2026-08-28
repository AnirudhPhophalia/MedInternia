import { rankJobsByMatch } from '../jobRecommendationService';

interface Job {
  id: string;
  score: number;
}

const scorer = (job: Job) => job.score;

describe('rankJobsByMatch', () => {
  it('sorts jobs by match score descending', () => {
    const jobs: Job[] = [
      { id: 'a', score: 40 },
      { id: 'b', score: 90 },
      { id: 'c', score: 70 }
    ];

    const ranked = rankJobsByMatch(jobs, scorer);

    expect(ranked.map((r) => r.job.id)).toEqual(['b', 'c', 'a']);
    expect(ranked[0].matchPercentage).toBe(90);
  });

  it('drops jobs below the minimum score', () => {
    const jobs: Job[] = [
      { id: 'a', score: 20 },
      { id: 'b', score: 55 },
      { id: 'c', score: 80 }
    ];

    const ranked = rankJobsByMatch(jobs, scorer, { minScore: 50 });

    expect(ranked.map((r) => r.job.id)).toEqual(['c', 'b']);
  });

  it('caps the result at the requested limit', () => {
    const jobs: Job[] = [
      { id: 'a', score: 10 },
      { id: 'b', score: 20 },
      { id: 'c', score: 30 },
      { id: 'd', score: 40 }
    ];

    const ranked = rankJobsByMatch(jobs, scorer, { limit: 2 });

    expect(ranked.map((r) => r.job.id)).toEqual(['d', 'c']);
  });

  it('keeps original order for ties (stable)', () => {
    const jobs: Job[] = [
      { id: 'first', score: 50 },
      { id: 'second', score: 50 },
      { id: 'third', score: 50 }
    ];

    const ranked = rankJobsByMatch(jobs, scorer);

    expect(ranked.map((r) => r.job.id)).toEqual(['first', 'second', 'third']);
  });

  it('returns an empty array when no jobs clear the threshold', () => {
    const jobs: Job[] = [{ id: 'a', score: 10 }];

    expect(rankJobsByMatch(jobs, scorer, { minScore: 90 })).toEqual([]);
  });

  it('handles an empty job list', () => {
    expect(rankJobsByMatch([], scorer)).toEqual([]);
  });

  it('treats a non-positive limit as no results', () => {
    const jobs: Job[] = [{ id: 'a', score: 80 }];

    expect(rankJobsByMatch(jobs, scorer, { limit: 0 })).toEqual([]);
  });
});
