
import { useEffect, useState } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import Stack from '@mui/material/Stack';
import api from '../../utils/api';
import CertificateCard from '../../components/CertificateCard';
import { useAuth } from '../../context/AuthContext';

export default function Certificates() {
  const { userId } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      setLoading(false);
      return;
    }
    api.get(`/certificates/user/${userId}`)
      .then(res => {
        setCertificates(res.data.data.certificates || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch certificates');
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>My Certificates</Typography>
        <Stack spacing={2}>
          {certificates.length === 0 ? (
            <Typography>No certificates found.</Typography>
          ) : (
            certificates.map(c => (
              <CertificateCard key={c._id} certificate={c} />
            ))
          )}
        </Stack>
      </Box>
    </Container>
  );
}
