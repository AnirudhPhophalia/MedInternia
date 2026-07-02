import { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import api from '../../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSend = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('OTP sent to your email!');
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleReset = async (e: any) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setSuccess('Password reset successfully!');
      setSent(false);
      setEmail('');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>Forgot Password</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
        {!sent ? (
          <form onSubmit={handleSend}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Send OTP</Button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <TextField
              label="OTP"
              fullWidth
              margin="normal"
              value={otp}
              onChange={e => setOtp(e.target.value)}
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
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Reset Password</Button>
          </form>
        )}
      </Box>
    </Container>
  );
}
