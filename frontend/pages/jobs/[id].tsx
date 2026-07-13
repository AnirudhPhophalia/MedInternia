import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Card, CardContent, Button, Stack } from '@mui/material';
import api from '../../utils/api';
import { useRecentlyViewedInternships } from '../../hooks/useRecentlyViewedInternships';
import DeadlineCountdown from '../../components/DeadlineCountdown';

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { addRecentlyViewed } = useRecentlyViewedInternships();

  useEffect(() => {
    if (!id) return;
    api.get(`/jobs/${id}`)
      .then(res => {
        const fetchedJob = res.data.data.job;
        setJob(fetchedJob);
        setLoading(false);
        if (fetchedJob) {
          addRecentlyViewed({
            _id: fetchedJob._id,
            title: fetchedJob.title,
            company: fetchedJob.company,
            location: fetchedJob.location?.isRemote
              ? 'Remote'
              : [fetchedJob.location?.city, fetchedJob.location?.state]
                  .filter(Boolean)
                  .join(', '),
            logo: fetchedJob.companyLogo,
          });
        }
      })
      .catch(() => {
        setError('Failed to fetch job');
        setLoading(false);
      });
  }, [id, addRecentlyViewed]);

  const handleApply = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/jobs/${id}/apply`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Applied successfully!');
    } catch {
      setError('Failed to apply');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!job) return null;

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
              <Typography variant="h4" gutterBottom>{job.title}</Typography>
              <DeadlineCountdown deadline={job.applicationDeadline} size="medium" />
            </Stack>
            <Typography variant="body1">{job.description}</Typography>
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleApply}>Apply</Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

