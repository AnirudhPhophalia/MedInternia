import { buildDiaryAnalytics } from './diaryAnalytics';

describe('buildDiaryAnalytics', () => {
  it('returns empty summaries when there are no diaries', () => {
    expect(buildDiaryAnalytics([])).toEqual({
      totalEntries: 0,
      symptomFrequency: [],
      tagFrequency: [],
      locationFrequency: [],
      entriesByDay: [],
    });
    expect(buildDiaryAnalytics(null).totalEntries).toBe(0);
    expect(buildDiaryAnalytics(undefined).totalEntries).toBe(0);
  });

  it('aggregates a single entry', () => {
    const summary = buildDiaryAnalytics([
      {
        entries: [
          {
            day: '1',
            location: 'Ward A',
            symptoms: 'fever, cough',
            tags: ['respiratory'],
            symptomsChecklist: ['fatigue'],
          },
        ],
      },
    ]);

    expect(summary.totalEntries).toBe(1);
    expect(summary.symptomFrequency).toEqual([
      { label: 'cough', count: 1 },
      { label: 'fatigue', count: 1 },
      { label: 'fever', count: 1 },
    ]);
    expect(summary.tagFrequency).toEqual([{ label: 'respiratory', count: 1 }]);
    expect(summary.locationFrequency).toEqual([{ label: 'ward a', count: 1 }]);
    expect(summary.entriesByDay).toEqual([{ label: 'Day 1', count: 1 }]);
  });

  it('aggregates multiple entries and ignores malformed fields', () => {
    const summary = buildDiaryAnalytics([
      {
        entries: [
          {
            day: 2,
            location: '  Clinic  ',
            symptoms: 'Fever; cough',
            tags: ['Follow-up', '', null as unknown as string],
            symptomsChecklist: undefined,
          },
          {
            day: '1',
            location: 'clinic',
            symptoms: '',
            tags: 'not-an-array' as unknown as string[],
            symptomsChecklist: ['Cough', 12 as unknown as string],
          },
          null as unknown as { day: string },
        ],
      },
      { entries: null },
      {},
    ]);

    expect(summary.totalEntries).toBe(2);
    expect(summary.symptomFrequency).toEqual([
      { label: 'cough', count: 2 },
      { label: 'fever', count: 1 },
    ]);
    expect(summary.tagFrequency).toEqual([{ label: 'follow-up', count: 1 }]);
    expect(summary.locationFrequency).toEqual([{ label: 'clinic', count: 2 }]);
    expect(summary.entriesByDay).toEqual([
      { label: 'Day 1', count: 1 },
      { label: 'Day 2', count: 1 },
    ]);
  });
});
