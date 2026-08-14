import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import api from '../../utils/api';
import { useQuery } from '@tanstack/react-query';

export default function Profile() {
  const { data: profile, isLoading: loading, isError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/profile');
      return res.data;
    }
  });

  if (loading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to fetch profile</Alert>;

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
