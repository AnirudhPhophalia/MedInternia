import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { Container, Box, Typography, Grid, Paper } from '@mui/material';
import { UserPlus, Video, Briefcase } from 'lucide-react';

export default function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  return (
    <Container maxWidth="xl" sx={{ mb: { xs: 8, md: 14 } }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
        <Typography variant="h3" fontWeight={800} color="#0f172a" mb={{ xs: 6, md: 10 }} sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' }, textAlign: 'center' }}>
          How It Works
        </Typography>

        <Box sx={{ position: 'relative' }}>
          {/* Desktop-only dashed connector running behind the cards */}
          <Box
            aria-hidden="true"
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 34,
              left: '16.5%',
              right: '16.5%',
              height: 0,
              borderTop: '2px dashed #cbd5e1',
              zIndex: 0,
            }}
          />

          <Grid container spacing={{ xs: 4, md: 4 }} sx={{ position: 'relative', zIndex: 1 }}>
            {[
              { num: '01', title: 'Sign Up', desc: 'Create your free account and set up your medical profile.', icon: <UserPlus size={26} color="#fff" /> },
              { num: '02', title: 'Learn & Collaborate', desc: 'Join cases, webinars, and discussions to learn and share knowledge.', icon: <Video size={26} color="#fff" /> },
              { num: '03', title: 'Grow Your Career', desc: 'Earn achievements, connect with peers, and find job opportunities.', icon: <Briefcase size={26} color="#fff" /> },
            ].map((step, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <motion.div
                  variants={fadeInUp}
                  style={{ height: '100%' }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -8, transition: { duration: 0.25, ease: 'easeOut' } }
                  }
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 3, md: 4 },
                      height: '100%',
                      borderRadius: '24px',
                      bgcolor: '#fff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                      '&:hover': {
                        borderColor: '#0072ff',
                        boxShadow: '0 20px 40px rgba(0, 114, 255, 0.16)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 68,
                        height: 68,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 8px 20px rgba(0, 114, 255, 0.25)',
                        mb: 2.5,
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Typography fontWeight={800} color="primary.main" mb={0.5} fontSize="0.95rem">
                      {step.num}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#0f172a" mb={1}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="#475569" sx={{ lineHeight: 1.6 }}>
                      {step.desc}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      </motion.div>
    </Container>
  );
}
