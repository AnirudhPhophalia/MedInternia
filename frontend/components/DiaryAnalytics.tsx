import React, { useMemo } from 'react';
import { buildDiaryAnalytics, DiaryLike, FrequencyItem } from '../utils/diaryAnalytics';

type DiaryAnalyticsProps = {
  diaries: DiaryLike[];
  loading?: boolean;
  error?: string | null;
};

function FrequencyTable({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: FrequencyItem[];
  emptyLabel: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#2456e0', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ color: '#888', fontSize: 14 }}>{emptyLabel}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            {title}
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left', padding: '6px 0', borderBottom: '1px solid #e3eafe', color: '#555' }}>
                Item
              </th>
              <th scope="col" style={{ textAlign: 'right', padding: '6px 0', borderBottom: '1px solid #e3eafe', color: '#555' }}>
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 8).map((item) => (
              <tr key={item.label}>
                <td style={{ padding: '6px 0', borderBottom: '1px solid #f0f4fb', textTransform: 'capitalize' }}>
                  {item.label}
                </td>
                <td style={{ padding: '6px 0', borderBottom: '1px solid #f0f4fb', textAlign: 'right', fontWeight: 600 }}>
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SimpleBarChart({ items, label }: { items: FrequencyItem[]; label: string }) {
  if (items.length === 0) {
    return <div style={{ color: '#888', fontSize: 14 }}>No entry timeline yet.</div>;
  }

  const max = Math.max(...items.map((item) => item.count), 1);
  const width = Math.max(320, items.length * 48);
  const height = 160;
  const padding = 28;
  const barWidth = Math.min(28, (width - padding * 2) / items.length - 8);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }} role="img" aria-label={label}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }}>
        {items.map((item, index) => {
          const x = padding + index * ((width - padding * 2) / items.length);
          const barHeight = ((item.count / max) * (height - padding * 2));
          const y = height - padding - barHeight;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#74a9bf" rx="3" />
              <text x={x + barWidth / 2} y={height - 8} fontSize="10" fill="#64748b" textAnchor="middle">
                {item.label.replace(/^Day\s+/i, 'D')}
              </text>
              <text x={x + barWidth / 2} y={y - 4} fontSize="10" fill="#2456e0" textAnchor="middle">
                {item.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const DiaryAnalytics: React.FC<DiaryAnalyticsProps> = ({ diaries, loading = false, error = null }) => {
  const summary = useMemo(() => buildDiaryAnalytics(diaries), [diaries]);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 2px 8px #e3eafe',
        padding: 24,
        marginTop: 32,
        border: '1.5px solid #e3eafe',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, color: '#2456e0', marginBottom: 6 }}>
        Charts & Analytics
      </div>
      <div style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
        Personal summaries from your diary entries only. These trends are not diagnostic.
      </div>

      {loading && (
        <div style={{ color: '#555', fontSize: 14 }} role="status">
          Loading your diary trends...
        </div>
      )}

      {!loading && error && (
        <div style={{ color: '#b42318', fontSize: 14 }} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && summary.totalEntries === 0 && (
        <div style={{ color: '#888', fontSize: 14 }}>
          No diary entries yet. Add an entry to see symptom, tag, and activity trends here.
        </div>
      )}

      {!loading && !error && summary.totalEntries > 0 && (
        <>
          <div style={{ fontSize: 14, color: '#2456e0', fontWeight: 600, marginBottom: 14 }}>
            {summary.totalEntries} entr{summary.totalEntries === 1 ? 'y' : 'ies'} in your diaries
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#2456e0', marginBottom: 8 }}>
              Entries over time
            </div>
            <SimpleBarChart items={summary.entriesByDay} label="Entries by day bar chart" />
            <FrequencyTable
              title="Entries by day"
              items={summary.entriesByDay}
              emptyLabel="No day values recorded."
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <FrequencyTable
              title="Symptom mentions"
              items={summary.symptomFrequency}
              emptyLabel="No symptoms recorded yet."
            />
            <FrequencyTable
              title="Tag frequency"
              items={summary.tagFrequency}
              emptyLabel="No tags recorded yet."
            />
            <FrequencyTable
              title="Locations"
              items={summary.locationFrequency}
              emptyLabel="No locations recorded yet."
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DiaryAnalytics;
