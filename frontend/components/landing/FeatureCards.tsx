import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import { FolderOpen, Briefcase, Video, Award, ChevronRight } from 'lucide-react';
import { getLoginHref, protectedLandingPaths } from '../../utils/authRedirect';

interface FeatureCardsProps {
  isLoggedIn: boolean;
}

export default function FeatureCards({ isLoggedIn }: FeatureCardsProps) {
  const shouldReduceMotion = useReducedMotion();

  const getAuthAwareHref = (path: string) =>
    !isLoggedIn && protectedLandingPaths.includes(path) ? getLoginHref(path) : path;

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 12 }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={staggerContainer}>
        <Grid container spacing={3}>
          {[
            { title: 'Cases', desc: 'Explore and analyze real medical cases.', icon: <FolderOpen size={28} color="#0072ff" />, color: '#eff6ff', link: '/cases', authRequired: true },
            { title: 'Jobs', desc: 'Find internships and career opportunities.', icon: <Briefcase size={28} color="#38a169" />, color: '#f0fdf4', link: '/jobs' },
            { title: 'Webinars', desc: 'Join live AMAs and sessions.', icon: <Video size={28} color="#8b5cf6" />, color: '#f5f3ff', link: '/webinars' },
            { title: 'Leaderboard', desc: 'Track contributors and ranks.', icon: <Award size={28} color="#d97706" />, color: '#fffbeb', link: '/leaderboard' },
          ]
            .filter((item) => !item.authRequired || isLoggedIn)
            .map((item, i) => (
              <Grid size={{ xs: 12, sm: 6, md: isLoggedIn ? 3 : 4 }} key={i}>
                <motion.div
                  variants={fadeInUp}
                  style={{ height: '100%' }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -10, scale: 1.035, transition: { duration: 0.25, ease: 'easeOut' } }
                  }
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      borderRadius: '24px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: '#fff',
                      border: '1px solid #e2e8f0',
                      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                      '&:hover': {
                        borderColor: '#0072ff',
                        boxShadow: '0 20px 45px rgba(0, 114, 255, 0.22)',
                        '& .explore-underline': { width: '100%' },
                        '& .explore-arrow': { transform: shouldReduceMotion ? 'none' : 'translateX(6px)' },
                      },
                    }}
                  >
                    <motion.div
                      className="feature-icon-box"
                      style={{
                        backgroundColor: item.color,
                        width: 64,
                        height: 64,
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                      }}
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : {
                            rotate: [0, -12, 10, -6, 0],
                            scale: 1.12,
                            transition: { duration: 0.55, ease: 'easeInOut' },
                          }
                      }
                    >
                      {item.icon}
                    </motion.div>

                    <Typography variant="h5" fontWeight={800} color="#1a202c" mb={1.5}>
                      {item.title}
                    </Typography>
                    <Typography variant="body1" color="#64748b" mb={4} flexGrow={1} lineHeight={1.6}>
                      {item.desc}
                    </Typography>
                    <Link
                      href={getAuthAwareHref(item.link)}
                      style={{
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: '#0072ff',
                        fontWeight: 700,
                        position: 'relative',
                        width: 'fit-content',
                        paddingBottom: 2,
                      }}
                    >
                      Explore <ChevronRight className="explore-arrow" size={18} style={{ marginLeft: 4, transition: 'transform 0.25s ease' }} />
                      <Box
                        className="explore-underline"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          width: '0%',
                          height: 2,
                          bgcolor: '#0072ff',
                          transition: 'width 0.3s ease',
                          borderRadius: 2,
                        }}
                      />
                    </Link>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
        </Grid>
      </motion.div>
    </Container>
  );
}
