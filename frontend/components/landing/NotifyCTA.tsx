import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Container, Paper, Grid, Stack, Box, Chip, Typography, TextField, Button, Alert } from '@mui/material';
import { Mail } from 'lucide-react';
import api from '../../utils/api';

export default function NotifyCTA() {
  const [waitlistEmail, setWaitlistEmail] = React.useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = React.useState(false);
  const [waitlistLoading, setWaitlistLoading] = React.useState(false);
  const [waitlistError, setWaitlistError] = React.useState('');

  const handleWaitlistSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWaitlistError('');
    setWaitlistLoading(true);
    try {
      await api.post('/waitlist', { email: waitlistEmail });
      setWaitlistSubmitted(true);
      setWaitlistEmail('');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Something went wrong. Please try again.';
      setWaitlistError(message);
    } finally {
      setWaitlistLoading(false);
    }
  };

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 12 }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeInUp}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: (theme: any) => theme.custom?.cardShadow || '0 12px 28px rgba(10,37,64,0.14)',
            overflow: 'hidden',
          }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden
                >
                  <Mail size={22} />
                </Box>
                <Chip label="Mobile apps coming soon" color="primary" variant="outlined" />
              </Stack>
              <Typography variant="h4" component="h2" fontWeight={800} color="text.primary" gutterBottom>
                Get notified when MedInternia mobile launches
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
                We are replacing inactive app download buttons with a waitlist so users can hear when iOS and Android access is ready.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box component="form" onSubmit={handleWaitlistSubmit} noValidate>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email address"
                    value={waitlistEmail}
                    onChange={(event) => {
                      setWaitlistEmail(event.target.value);
                      setWaitlistSubmitted(false);
                      setWaitlistError('');
                    }}
                    inputProps={{ 'aria-label': 'Email address for mobile launch notifications' }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={waitlistLoading}
                    sx={{ px: 4, whiteSpace: 'nowrap' }}
                  >
                    {waitlistLoading ? 'Submitting...' : 'Notify Me'}
                  </Button>
                </Stack>
                {waitlistError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {waitlistError}
                  </Alert>
                )}
                {waitlistSubmitted && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    You are on the notify list. We will share updates when mobile access opens.
                  </Alert>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </motion.div>
    </Container>
  );
}
