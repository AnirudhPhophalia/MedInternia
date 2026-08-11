import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Paper,
  Chip,
  Stack,
  Button,
  IconButton,
  Fade,
  Zoom
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface OrganZone {
  id: string;
  specialtyValue: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  hoverColor: string;
}

export const ORGAN_ZONES: OrganZone[] = [
  {
    id: 'brain',
    specialtyValue: 'neurology',
    label: 'Neurology',
    icon: '🧠',
    description: 'Brain, Nerves & Nervous System',
    color: '#3b82f6',
    hoverColor: '#60a5fa'
  },
  {
    id: 'eyes',
    specialtyValue: 'ophthalmology',
    label: 'Ophthalmology',
    icon: '👁️',
    description: 'Eye Care & Ophthalmic Surgery',
    color: '#06b6d4',
    hoverColor: '#22d3ee'
  },
  {
    id: 'heart',
    specialtyValue: 'cardiology',
    label: 'Cardiology',
    icon: '🫀',
    description: 'Heart & Cardiovascular System',
    color: '#ef4444',
    hoverColor: '#f87171'
  },
  {
    id: 'lungs',
    specialtyValue: 'pulmonology',
    label: 'Pulmonology',
    icon: '🫁',
    description: 'Lungs & Respiratory Care',
    color: '#10b981',
    hoverColor: '#34d399'
  },
  {
    id: 'stomach',
    specialtyValue: 'gastroenterology',
    label: 'Gastroenterology',
    icon: '🩺',
    description: 'Digestive Tract & Gastro System',
    color: '#f59e0b',
    hoverColor: '#fbbf24'
  },
  {
    id: 'bones',
    specialtyValue: 'orthopedics',
    label: 'Orthopedics',
    icon: '🦴',
    description: 'Bones, Joints & Musculoskeletal System',
    color: '#8b5cf6',
    hoverColor: '#a78bfa'
  },
  {
    id: 'skin',
    specialtyValue: 'dermatology',
    label: 'Dermatology',
    icon: '🩹',
    description: 'Skin & Dermatological Medicine',
    color: '#ec4899',
    hoverColor: '#f472b6'
  },
  {
    id: 'surgery',
    specialtyValue: 'surgery',
    label: 'Surgery',
    icon: '🔪',
    description: 'General & Operative Surgery',
    color: '#6366f1',
    hoverColor: '#818cf8'
  },
  {
    id: 'emergency',
    specialtyValue: 'emergency',
    label: 'Emergency',
    icon: '🚨',
    description: 'Emergency Care & Acute Medicine',
    color: '#dc2626',
    hoverColor: '#ef4444'
  },
  {
    id: 'pediatrics',
    specialtyValue: 'pediatrics',
    label: 'Pediatrics',
    icon: '👶',
    description: 'Infant, Child & Adolescent Care',
    color: '#14b8a6',
    hoverColor: '#2dd4bf'
  },
  {
    id: 'oncology',
    specialtyValue: 'oncology',
    label: 'Oncology',
    icon: '🎗️',
    description: 'Cancer Treatment & Oncology',
    color: '#a855f7',
    hoverColor: '#c084fc'
  },
  {
    id: 'psychiatry',
    specialtyValue: 'psychiatry',
    label: 'Psychiatry',
    icon: '🧘',
    description: 'Mental Health & Behavioral Science',
    color: '#64748b',
    hoverColor: '#94a3b8'
  }
];

export interface BodyMapFilterProps {
  selectedSpecialties: string[];
  onToggleSpecialty: (specialtyValue: string) => void;
  onClearAll?: () => void;
}

export default function BodyMapFilter({
  selectedSpecialties = [],
  onToggleSpecialty,
  onClearAll
}: BodyMapFilterProps) {
  const [hoveredOrgan, setHoveredOrgan] = useState<OrganZone | null>(null);

  const isSelected = (val: string) =>
    selectedSpecialties.map(s => s.toLowerCase()).includes(val.toLowerCase());

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 4,
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Element */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
            🫀 Interactive Body Map
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Click an organ to filter internships by medical specialty
          </Typography>
        </Box>
        {selectedSpecialties.length > 0 && onClearAll && (
          <Button
            size="small"
            onClick={onClearAll}
            startIcon={<RestartAltIcon fontSize="small" />}
            sx={{
              color: '#cbd5e1',
              borderColor: 'rgba(255,255,255,0.2)',
              textTransform: 'none',
              fontSize: '0.75rem',
              '&:hover': { color: '#fff', borderColor: '#fff' }
            }}
            variant="outlined"
          >
            Reset ({selectedSpecialties.length})
          </Button>
        )}
      </Stack>

      {/* Hover Info Badge */}
      <Box
        sx={{
          minHeight: 42,
          p: 1,
          mb: 2,
          borderRadius: 2,
          bgcolor: hoveredOrgan
            ? `${hoveredOrgan.color}22`
            : 'rgba(255,255,255,0.05)',
          border: `1px solid ${
            hoveredOrgan ? hoveredOrgan.color : 'rgba(255,255,255,0.1)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s ease'
        }}
      >
        {hoveredOrgan ? (
          <Fade in={!!hoveredOrgan}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h6">{hoveredOrgan.icon}</Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: hoveredOrgan.color, lineHeight: 1.2 }}>
                  {hoveredOrgan.label}
                </Typography>
                <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', fontSize: '0.7rem' }}>
                  {hoveredOrgan.description}
                </Typography>
              </Box>
            </Stack>
          </Fade>
        ) : (
          <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <InfoOutlinedIcon fontSize="inherit" /> Hover over any organ or tap body buttons below
          </Typography>
        )}
      </Box>

      {/* Interactive Human Body SVG Canvas */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 1
        }}
      >
        <svg
          viewBox="0 0 300 520"
          style={{ width: '100%', height: 'auto', maxHeight: 380, filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' }}
          role="img"
          aria-label="Interactive Human Body Anatomy Map"
        >
          <defs>
            {/* Body Outline Gradient */}
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Human Body Silhouette */}
          <g opacity="0.85">
            {/* Head & Neck */}
            <path
              d="M 150 25 C 130 25 120 40 120 65 C 120 85 130 100 138 105 C 138 115 135 125 130 130 L 170 130 C 165 125 162 115 162 105 C 170 100 180 85 180 65 C 180 40 170 25 150 25 Z"
              fill="url(#bodyGradient)"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Torso */}
            <path
              d="M 130 130 L 95 155 C 90 160 85 185 85 220 C 85 240 92 270 95 285 L 115 285 L 110 210 L 115 160 L 185 160 L 190 210 L 185 285 L 205 285 C 208 270 215 240 215 220 C 215 185 210 160 205 155 L 170 130 Z"
              fill="url(#bodyGradient)"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Abdomen & Pelvis */}
            <path
              d="M 115 285 L 185 285 L 190 355 C 190 370 175 385 150 385 C 125 385 110 370 110 355 Z"
              fill="url(#bodyGradient)"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Legs */}
            <path
              d="M 115 380 L 146 380 L 142 490 C 140 505 125 505 120 490 L 112 430 Z"
              fill="url(#bodyGradient)"
              stroke="#475569"
              strokeWidth="1.5"
            />
            <path
              d="M 154 380 L 185 380 L 188 430 L 180 490 C 175 505 160 505 158 490 Z"
              fill="url(#bodyGradient)"
              stroke="#475569"
              strokeWidth="1.5"
            />
          </g>

          {/* --- CLICKABLE ORGAN SYSTEM ZONES --- */}

          {/* 1. BRAIN / HEAD (Neurology) */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('neurology')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'brain') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-brain"
          >
            <circle
              cx="150"
              cy="60"
              r="22"
              fill={isSelected('neurology') ? '#3b82f6' : (hoveredOrgan?.id === 'brain' ? '#60a5fa' : 'rgba(59, 130, 246, 0.4)')}
              stroke="#60a5fa"
              strokeWidth={isSelected('neurology') ? 3 : 1.5}
              filter={isSelected('neurology') || hoveredOrgan?.id === 'brain' ? 'url(#glowEffect)' : undefined}
            />
            <text x="150" y="65" textAnchor="middle" fontSize="16" pointerEvents="none">🧠</text>
          </g>

          {/* 2. EYES (Ophthalmology) */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('ophthalmology')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'eyes') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-eyes"
          >
            <rect
              x="133"
              cy="48"
              width="34"
              height="14"
              rx="7"
              fill={isSelected('ophthalmology') ? '#06b6d4' : (hoveredOrgan?.id === 'eyes' ? '#22d3ee' : 'rgba(6, 182, 212, 0.3)')}
              stroke="#22d3ee"
              strokeWidth={isSelected('ophthalmology') ? 2 : 1}
            />
            <text x="150" y="59" textAnchor="middle" fontSize="11" pointerEvents="none">👁️</text>
          </g>

          {/* 3. LUNGS (Pulmonology) */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('pulmonology')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'lungs') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-lungs"
          >
            {/* Left Lung */}
            <path
              d="M 125 160 C 115 160 112 185 115 210 C 122 225 135 220 135 195 Z"
              fill={isSelected('pulmonology') ? '#10b981' : (hoveredOrgan?.id === 'lungs' ? '#34d399' : 'rgba(16, 185, 129, 0.4)')}
              stroke="#34d399"
              strokeWidth={isSelected('pulmonology') ? 2.5 : 1.5}
            />
            {/* Right Lung */}
            <path
              d="M 175 160 C 185 160 188 185 185 210 C 178 225 165 220 165 195 Z"
              fill={isSelected('pulmonology') ? '#10b981' : (hoveredOrgan?.id === 'lungs' ? '#34d399' : 'rgba(16, 185, 129, 0.4)')}
              stroke="#34d399"
              strokeWidth={isSelected('pulmonology') ? 2.5 : 1.5}
            />
            <text x="150" y="190" textAnchor="middle" fontSize="14" pointerEvents="none">🫁</text>
          </g>

          {/* 4. HEART (Cardiology) */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('cardiology')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'heart') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-heart"
          >
            <circle
              cx="160"
              cy="180"
              r="16"
              fill={isSelected('cardiology') ? '#ef4444' : (hoveredOrgan?.id === 'heart' ? '#f87171' : 'rgba(239, 68, 68, 0.5)')}
              stroke="#f87171"
              strokeWidth={isSelected('cardiology') ? 3 : 1.5}
              filter={isSelected('cardiology') || hoveredOrgan?.id === 'heart' ? 'url(#glowEffect)' : undefined}
            />
            <text x="160" y="185" textAnchor="middle" fontSize="14" pointerEvents="none">🫀</text>
          </g>

          {/* 5. STOMACH / GASTRO (Gastroenterology) */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('gastroenterology')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'stomach') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-stomach"
          >
            <path
              d="M 130 230 C 120 230 120 260 140 270 C 165 270 170 250 160 235 Z"
              fill={isSelected('gastroenterology') ? '#f59e0b' : (hoveredOrgan?.id === 'stomach' ? '#fbbf24' : 'rgba(245, 158, 11, 0.4)')}
              stroke="#fbbf24"
              strokeWidth={isSelected('gastroenterology') ? 2.5 : 1.5}
            />
            <text x="145" y="253" textAnchor="middle" fontSize="13" pointerEvents="none">🩺</text>
          </g>

          {/* 6. BONES / SKELETON (Orthopedics) - Legs & Spine Line */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('orthopedics')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'bones') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-bones"
          >
            {/* Spine backbone */}
            <line x1="150" y1="110" x2="150" y2="350" stroke={isSelected('orthopedics') ? '#8b5cf6' : '#a78bfa'} strokeWidth="3" strokeDasharray="4 3" />
            {/* Femur left & right */}
            <line x1="130" y1="380" x2="125" y2="470" stroke={isSelected('orthopedics') ? '#8b5cf6' : '#a78bfa'} strokeWidth="4" />
            <line x1="170" y1="380" x2="175" y2="470" stroke={isSelected('orthopedics') ? '#8b5cf6' : '#a78bfa'} strokeWidth="4" />
            <circle
              cx="150"
              cy="435"
              r="15"
              fill={isSelected('orthopedics') ? '#8b5cf6' : (hoveredOrgan?.id === 'bones' ? '#a78bfa' : 'rgba(139, 92, 246, 0.4)')}
              stroke="#a78bfa"
              strokeWidth="2"
            />
            <text x="150" y="440" textAnchor="middle" fontSize="13" pointerEvents="none">🦴</text>
          </g>

          {/* 7. SKIN (Dermatology) - Outer Arm zone */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('dermatology')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'skin') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-skin"
          >
            <rect
              x="85"
              cy="190"
              width="20"
              height="75"
              rx="10"
              fill={isSelected('dermatology') ? '#ec4899' : (hoveredOrgan?.id === 'skin' ? '#f472b6' : 'rgba(236, 72, 153, 0.3)')}
              stroke="#f472b6"
              strokeWidth={isSelected('dermatology') ? 2 : 1}
            />
            <text x="95" y="233" textAnchor="middle" fontSize="12" pointerEvents="none">🩹</text>
          </g>

          {/* 8. SURGERY (Hands / Upper Arm) */}
          <g
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onToggleSpecialty('surgery')}
            onMouseEnter={() => setHoveredOrgan(ORGAN_ZONES.find(o => o.id === 'surgery') || null)}
            onMouseLeave={() => setHoveredOrgan(null)}
            data-testid="organ-surgery"
          >
            <rect
              x="195"
              cy="190"
              width="20"
              height="75"
              rx="10"
              fill={isSelected('surgery') ? '#6366f1' : (hoveredOrgan?.id === 'surgery' ? '#818cf8' : 'rgba(99, 102, 241, 0.3)')}
              stroke="#818cf8"
              strokeWidth={isSelected('surgery') ? 2 : 1}
            />
            <text x="205" y="233" textAnchor="middle" fontSize="12" pointerEvents="none">🔪</text>
          </g>
        </svg>

        {/* Legend / Quick Filter Organ Buttons */}
        <Typography variant="caption" fontWeight={600} sx={{ color: '#94a3b8', mt: 1, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Quick Select Specialties:
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
          {ORGAN_ZONES.map((zone) => {
            const active = isSelected(zone.specialtyValue);
            return (
              <Chip
                key={zone.id}
                label={`${zone.icon} ${zone.label}`}
                onClick={() => onToggleSpecialty(zone.specialtyValue)}
                onMouseEnter={() => setHoveredOrgan(zone)}
                onMouseLeave={() => setHoveredOrgan(null)}
                size="small"
                sx={{
                  bgcolor: active ? zone.color : 'rgba(255,255,255,0.08)',
                  color: active ? '#fff' : '#cbd5e1',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.73rem',
                  border: `1px solid ${active ? zone.color : 'rgba(255,255,255,0.15)'}`,
                  boxShadow: active ? `0 0 10px ${zone.color}aa` : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: zone.color,
                    color: '#fff',
                    transform: 'translateY(-1px)'
                  }
                }}
              />
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}
