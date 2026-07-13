import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import Image from 'next/image';
import { Stethoscope, Users, Briefcase } from 'lucide-react';

const highlights = [
  { icon: Stethoscope, text: 'Case-based peer learning' },
  { icon: Users, text: 'Collaborate with doctors & interns' },
  { icon: Briefcase, text: 'Jobs, webinars & certifications' },
];

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function AuthLayout({ title, subtitle, children, wide = false }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
        overflowX: 'hidden',
        maxWidth: '100%',
      }}
    >
      {/* Brand panel — desktop only */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 45%',
          background: (theme) => theme.custom.navbarGradient,
          flexDirection: 'column',
          justifyContent: 'center',
          px: 6,
          py: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.08)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
            <Image
              src="/med-internia-logo.jpg"
              alt="MedInternia logo"
              width={48}
              height={48}
              style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }}
            />
            <Typography variant="h5" fontWeight={800} color="#fff" letterSpacing={0.5}>
              MedInternia
            </Typography>
          </Stack>

          <Typography variant="h3" fontWeight={800} color="#fff" sx={{ mb: 2, lineHeight: 1.2, fontSize: { md: '2.25rem', lg: '2.5rem' } }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 4, lineHeight: 1.7, fontSize: '1.05rem' }}>
            {subtitle}
          </Typography>

          <Stack spacing={2}>
            {highlights.map(({ icon: Icon, text }) => (
              <Stack key={text} direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color="#fff" />
                </Box>
                <Typography variant="body2" fontWeight={600} sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  {text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, sm: 4 },
          py: { xs: 4, sm: 6 },
          bgcolor: '#f8fbff',
          backgroundImage: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
        }}
      >
        <Box
          className="card-enter"
          sx={{
            width: '100%',
            maxWidth: wide ? 520 : 440,
          }}
        >
          {/* Mobile logo */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, justifyContent: 'center' }}
          >
            <Image
              src="/med-internia-logo.jpg"
              alt="MedInternia logo"
              width={36}
              height={36}
              style={{ borderRadius: '50%' }}
            />
            <Typography variant="h6" fontWeight={800} color="primary.main">
              MedInternia
            </Typography>
          </Stack>

          {children}
        </Box>
      </Box>
    </Box>
  );
}

export function AuthCard({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 4,
        p: { xs: 3, sm: 4 },
        boxShadow: '0 4px 24px rgba(0, 114, 255, 0.08)',
        border: '1px solid',
        borderColor: 'rgba(0, 114, 255, 0.12)',
        borderTop: '3px solid',
        borderTopColor: 'primary.main',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
