import React from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { Container, Box, Typography, Grid, Paper, Stack, Skeleton, Chip, Avatar } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { fetchTopContributors, TopContributor } from '../../utils/topContributors';
import { getLoginHref, protectedLandingPaths } from '../../utils/authRedirect';

interface TopContributorsSectionProps {
  isLoggedIn: boolean;
}

export default function TopContributorsSection({ isLoggedIn }: TopContributorsSectionProps) {
  const [contributors, setContributors] = React.useState<TopContributor[]>([]);
  const [contributorsLoading, setContributorsLoading] = React.useState(true);
  const [contributorsError, setContributorsError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchTopContributors(3)
      .then((data) => {
        if (!cancelled) setContributors(data);
      })
      .catch(() => {
        if (!cancelled) setContributorsError(true);
      })
      .finally(() => {
        if (!cancelled) setContributorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getAuthAwareHref = (path: string) =>
    !isLoggedIn && protectedLandingPaths.includes(path) ? getLoginHref(path) : path;

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 12 }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#1a202c">
              Top Contributors
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {contributorsError
                ? "Couldn't load rankings right now"
                : !contributorsLoading && contributors.length === 0
                ? 'No contributors yet — be the first!'
                : "This week's top-performing interns, by points earned"}
            </Typography>
          </Box>
          <Link href={getAuthAwareHref('/leaderboard')} style={{ textDecoration: 'none', color: '#0072ff', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
            View Leaderboard <ChevronRight size={20} />
          </Link>
        </Box>
        {!contributorsLoading && !contributorsError && contributors.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: '20px',
              border: '1px dashed #cbd5e1',
              bgcolor: '#fafbfc',
              textAlign: 'center',
            }}
          >
            <Typography color="text.secondary">
              No leaderboard activity yet. Check back soon!
            </Typography>
          </Paper>
        ) : (
        <Grid container spacing={3}>
          {(contributorsLoading || contributorsError ? [1, 2, 3] : contributors).map((item, i) => {
            const rank = i + 1;
            const medalColor = rank === 1 ? '#d97706' : rank === 2 ? '#94a3b8' : '#b45309';

            if (contributorsLoading) {
              return (
                <Grid size={{ xs: 12, md: 4 }} key={rank}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: '20px',
                      border: '1px dashed #cbd5e1',
                      bgcolor: '#fafbfc',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2.5}>
                      <Skeleton variant="circular" width={56} height={56} animation="wave" />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="70%" height={28} animation="wave" sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width="40%" height={20} animation="wave" />
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              );
            }

            if (contributorsError) {
              return (
                <Grid size={{ xs: 12, md: 4 }} key={rank}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: '20px',
                      border: '1px dashed #cbd5e1',
                      bgcolor: '#fafbfc',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2.5}>
                      <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: '#eef2f7' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={700} color="text.secondary">
                          Unavailable
                        </Typography>
                      </Box>
                      <Chip label={`#${rank}`} size="small" sx={{ fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }} />
                    </Stack>
                  </Paper>
                </Grid>
              );
            }

            const contributor = item as TopContributor;
            const fullName = `${contributor.firstName} ${contributor.lastName}`.trim();
            return (
              <Grid size={{ xs: 12, md: 4 }} key={contributor._id}>
                <Paper
                  component={Link}
                  href={`/users/${contributor._id}`}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#fff',
                    display: 'block',
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(15,23,42,0.08)' },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2.5}>
                    <Avatar
                      src={contributor.profilePicture}
                      alt={fullName}
                      sx={{ width: 56, height: 56, bgcolor: medalColor, fontWeight: 700 }}
                    >
                      {fullName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} color="#1a202c" noWrap>
                        {fullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {contributor.points} point{contributor.points === 1 ? '' : 's'}
                        {contributor.medicalSchool ? ` · ${contributor.medicalSchool}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={`#${rank}`}
                      size="small"
                      sx={{ fontWeight: 700, bgcolor: `${medalColor}1a`, color: medalColor }}
                    />
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
        )}
      </motion.div>
    </Container>
  );
}
