import { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert, Card, Fade } from '@mui/material';
import api from '../../utils/api';
import { useRouter } from 'next/router';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await api.put('/auth/change-password', { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        router.push('/profile/edit');
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 6
    }}>
      <Fade in timeout={900}>
        <Card elevation={8} sx={{ p: 4, borderRadius: 5, minWidth: 370, maxWidth: 450, width: '100%', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
              Change Password
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              margin="normal"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              margin="normal"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2, py: 1.3, fontWeight: 700, fontSize: '1.1rem', borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.10)', transition: 'all 0.2s', '&:hover': { background: 'linear-gradient(90deg, #0072ff 0%, #6dd5ed 100%)', transform: 'scale(1.03)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' } }}
            >
              Change Password
            </Button>
          </form>
        </Card>
      </Fade>
    </Box>
  );
}
