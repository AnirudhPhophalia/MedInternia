export interface RankedJob<T> {
  job: T;
  matchPercentage: number;
}

export interface RankOptions {
  minScore?: number;
  limit?: number;
}

/**
 * Rank a set of jobs by how well they match a user, using an injected scorer.
 *
 * The scorer is passed in (rather than imported) so this stays a pure,
 * DB-free function: jobs in, ranked jobs out. Entries are sorted by match
 * descending, dropping anything below `minScore`, and capped at `limit`.
 * Ties keep their original relative order (stable sort).
 */
export const rankJobsByMatch = <T>(
  jobs: T[],
  scorer: (job: T) => number,
  options: RankOptions = {}
): RankedJob<T>[] => {
  const minScore = options.minScore ?? 0;
  const { limit } = options;

  const ranked = jobs
    .map((job) => ({ job, matchPercentage: scorer(job) }))
    .filter((entry) => entry.matchPercentage >= minScore)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return typeof limit === 'number' ? ranked.slice(0, Math.max(0, limit)) : ranked;
};
