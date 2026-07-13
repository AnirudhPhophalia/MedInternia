import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { Stethoscope, Search, FolderOpen, Sparkles } from 'lucide-react';

const mockCases = [
  {
    title: 'Acute Chest Pain in 58M',
    specialty: 'Cardiology',
    difficulty: 'Intermediate',
    topics: ['ECG', 'chest pain'],
  },
  {
    title: 'Progressive Weakness & Fatigue',
    specialty: 'Neurology',
    difficulty: 'Advanced',
    topics: ['neuro exam', 'MRI'],
  },
  {
    title: 'Chronic Cough & Dyspnea',
    specialty: 'Pulmonology',
    difficulty: 'Beginner',
    topics: ['spirometry', 'CXR'],
  },
];

const difficultyStyle: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: '#d1fae5', color: '#065f46' },
  Intermediate: { bg: '#fef3c7', color: '#92400e' },
  Advanced: { bg: '#fee2e2', color: '#991b1b' },
};

export default function HeroProductPreview() {
  return (
    <Box
      role="img"
      aria-label="Preview of the MedInternia Cases dashboard showing medical case cards with specialty and difficulty tags"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        mx: 'auto',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '70%',
          height: '70%',
          bgcolor: '#e0f2fe',
          borderRadius: '50%',
          filter: 'blur(60px)',
          opacity: 0.5,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0, 86, 204, 0.18), 0 8px 24px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0, 114, 255, 0.12)',
          bgcolor: '#fff',
        }}
      >
        {/* Browser chrome */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={0.75}>
            {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
              <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
            ))}
          </Stack>
          <Box
            sx={{
              flex: 1,
              mx: 1,
              px: 2,
              py: 0.5,
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#0072ff', opacity: 0.8 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>
              medinternia.com/cases
            </Typography>
          </Box>
        </Box>

        {/* App preview */}
        <Box sx={{ bgcolor: '#f8fbff', p: { xs: 2, sm: 2.5 } }}>
          {/* Mini nav */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0072ff, #00c6ff)',
                }}
              />
              <Typography variant="caption" fontWeight={700} color="#1a202c">
                MedInternia
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {[FolderOpen, Search, Sparkles].map((Icon, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: i === 0 ? 'rgba(0,114,255,0.1)' : '#fff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={14} color={i === 0 ? '#0072ff' : '#64748b'} />
                </Box>
              ))}
            </Stack>
          </Stack>

          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{
              mb: 0.5,
              background: 'linear-gradient(90deg, #0072ff, #00c6ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '1rem', sm: '1.15rem' },
            }}
          >
            Medical Cases
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Explore, discuss, and learn from real clinical cases
          </Typography>

          {/* Filter bar mock */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 120, height: 32, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', px: 1.5, gap: 1 }}>
              <Search size={12} color="#94a3b8" />
              <Typography variant="caption" color="text.disabled">Search cases…</Typography>
            </Box>
            {['Specialty', 'Difficulty'].map((label) => (
              <Box key={label} sx={{ width: 80, height: 32, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Recommended row label */}
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
            <Sparkles size={14} color="#0072ff" />
            <Typography variant="caption" fontWeight={700} color="primary.main">
              Recommended for you
            </Typography>
          </Stack>

          {/* Case cards */}
          <Stack spacing={1.25}>
            {mockCases.map((c) => {
              const diff = difficultyStyle[c.difficulty];
              return (
                <Box
                  key={c.title}
                  sx={{
                    p: 1.5,
                    bgcolor: '#fff',
                    borderRadius: 2.5,
                    border: '1px solid #e2e8f0',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
                    <Chip
                      icon={<Stethoscope size={10} />}
                      label={c.specialty}
                      size="small"
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#e8f4ff', color: '#0056cc', '& .MuiChip-icon': { color: '#0072ff' } }}
                    />
                    <Chip
                      label={c.difficulty}
                      size="small"
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, bgcolor: diff.bg, color: diff.color }}
                    />
                  </Stack>
                  <Typography variant="caption" fontWeight={700} color="#1a202c" sx={{ display: 'block', mb: 0.5, fontSize: '0.8rem' }}>
                    {c.title}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {c.topics.map((t) => (
                      <Typography key={t} variant="caption" sx={{ fontSize: '0.6rem', color: '#94a3b8', bgcolor: '#f1f5f9', px: 0.75, py: 0.25, borderRadius: 1 }}>
                        {t}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
