import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Card, CardContent, Button } from '@mui/material';
import api from '../../utils/api';


export default function WebinarDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [webinar, setWebinar] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/webinars/${id}`)
      .then(res => {
        setWebinar(res.data.data.webinar);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch webinar');
        setLoading(false);
      });
  }, [id]);

  const handleRegister = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/webinars/${id}/register`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Registered successfully!');
    } catch {
      setError('Failed to register');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!webinar) return null;

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>{webinar.title}</Typography>
            <Typography variant="body1">{webinar.description}</Typography>
            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleRegister}>Register</Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
