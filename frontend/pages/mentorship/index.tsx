import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, CircularProgress, Alert, Button, Avatar, Chip
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../utils/api';
import PageHeader from '../../components/layout/PageHeader';
import Link from 'next/link';

export default function MentorshipDashboard() {
  const router = useRouter();
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const [profileRes, mentorshipsRes] = await Promise.all([
          api.get('/users/profile', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/mentorship/me', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setUser(profileRes.data.data);
        setMentorships(mentorshipsRes.data.data);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load mentorship dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  const isDoctor = user?.userType === 'doctor';

  const pending = mentorships.filter(m => m.status === 'pending');
  const active = mentorships.filter(m => m.status === 'active');
  const completed = mentorships.filter(m => m.status === 'completed');

  const renderMentorshipCard = (m: any) => {
    const partner = isDoctor ? m.mentee : m.mentor;
    const partnerName = partner ? `${partner.firstName} ${partner.lastName}` : 'Unknown';
    const roleLabel = isDoctor ? 'Mentee' : 'Mentor';

    return (
      <Grid size={{ xs: 12, md: 6 }} key={m._id}>
        <Card sx={{ borderRadius: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar src={partner?.profilePicture} sx={{ width: 56, height: 56 }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{roleLabel}</Typography>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    {isDoctor ? partnerName : `Dr. ${partnerName}`}
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label={m.status.toUpperCase()} 
                size="small"
                color={m.status === 'active' ? 'success' : m.status === 'pending' ? 'warning' : 'default'}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            </Box>

            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Focus:</strong> {m.specialtyRequested}
            </Typography>

            <Button 
              variant={m.status === 'pending' ? 'outlined' : 'contained'}
              fullWidth
              endIcon={<ArrowForwardIcon />}
              onClick={() => router.push(`/mentorship/${m._id}`)}
              sx={{ mt: 'auto', borderRadius: 2 }}
            >
              {m.status === 'pending' && isDoctor ? 'Review Request' : 'View Dashboard'}
            </Button>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #f8fbff 0%, #e8f4ff 100%)', py: 6 }}>
      <Container maxWidth="lg">
        <PageHeader 
          title="Mentorship Hub" 
          subtitle={isDoctor ? "Manage your mentees and review incoming requests." : "Track your mentorship goals and meetings."}
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Mentorship' }]}
        />

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {!isDoctor && (
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="secondary"
              startIcon={<SearchIcon />}
              component={Link}
              href="/doctors?mentorship=true"
              sx={{ borderRadius: 2, px: 3 }}
            >
              Find a Mentor
            </Button>
          </Box>
        )}

        {mentorships.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.8)' }}>
            <Typography variant="h6" color="text.secondary">
              {isDoctor ? "You don't have any active mentorships or pending requests." : "You haven't requested any mentorships yet."}
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            {pending.length > 0 && (
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Pending Requests</Typography>
                <Grid container spacing={3}>
                  {pending.map(renderMentorshipCard)}
                </Grid>
              </Box>
            )}

            {active.length > 0 && (
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Active Mentorships</Typography>
                <Grid container spacing={3}>
                  {active.map(renderMentorshipCard)}
                </Grid>
              </Box>
            )}

            {completed.length > 0 && (
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Past Mentorships</Typography>
                <Grid container spacing={3}>
                  {completed.map(renderMentorshipCard)}
                </Grid>
              </Box>
            )}

          </Box>
        )}
      </Container>
    </Box>
  );
}
