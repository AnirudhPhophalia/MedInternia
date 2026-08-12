import React from 'react';
import dynamic from 'next/dynamic';
import { motion, Variants } from 'framer-motion';
import { Container, Box, Typography, Grid, Paper, Stack } from '@mui/material';
import { CheckCircle2 } from 'lucide-react';

const HeroProductPreview = dynamic(() => import('./HeroProductPreview'), {
  loading: () => null,
});

export default function WhyMedInternia() {
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 12, overflow: 'hidden' }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'center', gap: { xs: 6, lg: 8 } }}>
          <Box sx={{ flex: 1, width: '100%' }}>
            <Box sx={{ width: 40, height: 4, bgcolor: '#0072ff', mb: 3, borderRadius: 2 }} />
            <Typography variant="h3" fontWeight={800} color="#0f172a" mb={1} sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' } }}>
              Why MedInternia?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 520 }}>
              Everything you need to learn, collaborate, and grow — in one platform.
            </Typography>

            <Grid container spacing={3}>
              {[
                {
                  label: 'Learning',
                  items: [
                    'Case-based learning and analysis',
                    'Peer review and feedback system',
                    'AI-powered suggestions',
                  ],
                },
                {
                  label: 'Career & Growth',
                  items: [
                    'Badges and certification achievements',
                    'Job opportunities board',
                    'Leaderboard and advanced search',
                  ],
                },
                {
                  label: 'Collaboration',
                  items: [
                    'Webinars and live AMAs',
                    'LinkedIn/GitHub export',
                    'Video conferencing',
                  ],
                },
              ].map((group) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={group.label}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      height: '100%',
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      bgcolor: '#fff',
                    }}
                  >
                    <Typography
                      variant="overline"
                      fontWeight={800}
                      color="primary.main"
                      sx={{ letterSpacing: '0.08em', display: 'block', mb: 1.5 }}
                    >
                      {group.label}
                    </Typography>
                    <Stack spacing={1.5}>
                      {group.items.map((text) => (
                        <Box key={text} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <CheckCircle2 size={18} color="#fff" fill="#0072ff" style={{ flexShrink: 0, marginTop: 2 }} />
                          <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ lineHeight: 1.5 }}>
                            {text}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Box sx={{ flex: 1, width: '100%', maxWidth: { lg: 520 } }}>
            <HeroProductPreview />
          </Box>
        </Box>
      </motion.div>
    </Container>
  );
}
