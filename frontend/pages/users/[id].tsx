import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box, CircularProgress, Alert, Card, CardContent, Button } from '@mui/material';
import api from '../../utils/api';
import AwardPointsModal from '../../components/AwardPointsModal';

export default function UserProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role') || localStorage.getItem('userType');
    if (role) setCurrentUserType(role);
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/users/${id}/profile`)
      .then(res => {
        setUser(res.data.data.user);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch user profile');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return null;

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>{user.firstName} {user.lastName}</Typography>
            <Typography variant="body1">Email: {user.email}</Typography>
            <Typography variant="body1">User Type: {user.userType}</Typography>
            {user.userType === 'intern' && (
              <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                Total Score: {user.points || 0}
              </Typography>
            )}
            
            {currentUserType === 'doctor' && user.userType === 'intern' && (
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
                  Score Intern
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {user && (
        <AwardPointsModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          internId={user._id}
          internName={`${user.firstName} ${user.lastName}`}
          onSuccess={(newPoints) => {
            setUser(prev => prev ? { ...prev, points: newPoints } : prev);
          }}
        />
      )}
    </Container>
  );
}
