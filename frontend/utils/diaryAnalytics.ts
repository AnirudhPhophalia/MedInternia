export type DiaryEntryLike = {
  day?: unknown;
  location?: unknown;
  symptoms?: unknown;
  tags?: unknown;
  symptomsChecklist?: unknown;
};

export type DiaryLike = {
  entries?: DiaryEntryLike[] | null;
};

export type FrequencyItem = {
  label: string;
  count: number;
};

export type DiaryAnalyticsSummary = {
  totalEntries: number;
  symptomFrequency: FrequencyItem[];
  tagFrequency: FrequencyItem[];
  locationFrequency: FrequencyItem[];
  entriesByDay: FrequencyItem[];
};

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function splitSymptoms(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(/[,;/|]+/)
    .map((part) => normalizeToken(part))
    .filter((part): part is string => Boolean(part));
}

function collectTokens(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeToken(value))
    .filter((value): value is string => Boolean(value));
}

function toFrequencyList(counts: Map<string, number>): FrequencyItem[] {
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

/**
 * Build privacy-safe, non-diagnostic summaries from the diaries already loaded
 * for the signed-in user. Incomplete or malformed optional fields are ignored.
 */
export function buildDiaryAnalytics(diaries: DiaryLike[] | null | undefined): DiaryAnalyticsSummary {
  const symptomCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  let totalEntries = 0;

  for (const diary of diaries || []) {
    const entries = Array.isArray(diary?.entries) ? diary.entries : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      totalEntries += 1;

      for (const symptom of splitSymptoms(entry.symptoms)) {
        increment(symptomCounts, symptom);
      }
      for (const symptom of collectTokens(entry.symptomsChecklist)) {
        increment(symptomCounts, symptom);
      }
      for (const tag of collectTokens(entry.tags)) {
        increment(tagCounts, tag);
      }

      const location = normalizeToken(entry.location);
      if (location) increment(locationCounts, location);

      const day =
        typeof entry.day === 'number' || typeof entry.day === 'string'
          ? String(entry.day).trim()
          : '';
      if (day) increment(dayCounts, `Day ${day}`);
    }
  }

  return {
    totalEntries,
    symptomFrequency: toFrequencyList(symptomCounts),
    tagFrequency: toFrequencyList(tagCounts),
    locationFrequency: toFrequencyList(locationCounts),
    entriesByDay: toFrequencyList(dayCounts).sort((a, b) => {
      const dayA = Number(a.label.replace(/^Day\s+/i, ''));
      const dayB = Number(b.label.replace(/^Day\s+/i, ''));
      if (!Number.isNaN(dayA) && !Number.isNaN(dayB)) return dayA - dayB;
      return a.label.localeCompare(b.label);
    }),
  };
}
