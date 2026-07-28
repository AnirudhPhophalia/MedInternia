import { useEffect, useState } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import api from '../../utils/api';
import { useRouter } from 'next/router';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get('/auth/profile')
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch profile');
        setLoading(false);
      });
  }, [router]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>Profile</Typography>
        <Typography variant="body1">First Name: {profile?.firstName}</Typography>
        <Typography variant="body1">Last Name: {profile?.lastName}</Typography>
        <Typography variant="body1">Email: {profile?.email}</Typography>
        <Typography variant="body1">User Type: {profile?.userType}</Typography>
        {/* Add more profile details here */}
      </Box>
    </Container>
  );
}
