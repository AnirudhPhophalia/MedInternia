import { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert, Paper, Divider } from '@mui/material';
import Link from 'next/link';
import api from '../../utils/api';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      const token = res.data?.data?.token;
      const user = res.data?.data?.user;
      const role = user?.userType || user?.role || '';
      const userId = user?._id || user?.id || '';
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', userId);
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGoogleLogin = () => {
    // Standardized to hit the correct /api/auth/google endpoint directly
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
    const normalizedApiBase = apiBase.replace(/\/$/, '');
    window.location.href = `${normalizedApiBase}/auth/google`;
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={8} sx={{ p: 4, borderRadius: 4, minWidth: 350, maxWidth: 400, background: 'rgba(255,255,255,0.98)', boxShadow: '0 8px 32px 0 rgba(33,147,176,0.10)', position: 'relative', overflow: 'hidden' }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 900, color: '#1565c0', letterSpacing: 1, zIndex: 1, position: 'relative' }}>Login</Typography>
        {error && <Alert severity="error" sx={{ zIndex: 1, position: 'relative', mb: 2 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit} style={{ zIndex: 1, position: 'relative' }}>
          <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} required sx={{ bgcolor: '#f8fafd', borderRadius: 2 }} />
          <TextField label="Password" type="password" fullWidth margin="normal" value={password} onChange={e => setPassword(e.target.value)} required sx={{ bgcolor: '#f8fafd', borderRadius: 2 }} />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2, py: 1.3, fontWeight: 700, fontSize: '1.1rem', borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.10)', background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)', transition: 'all 0.2s', '&:hover': { background: 'linear-gradient(90deg, #1565c0 0%, #2193b0 100%)', transform: 'scale(1.03)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' } }}>
            Login
          </Button>
        </form>

        <Divider sx={{ my: 3, zIndex: 1, position: 'relative', color: 'text.secondary' }}>OR</Divider>

        <Button fullWidth variant="outlined" onClick={handleGoogleLogin} sx={{ mb: 2, py: 1.2, borderRadius: 3, fontWeight: 600, fontSize: '1rem', color: '#444', borderColor: '#ccc', textTransform: 'none', zIndex: 1, position: 'relative', '&:hover': { background: '#f8fafd', borderColor: '#1565c0' } }} startIcon={<img src="/google-logo.svg" onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" }} alt="Google" width={22} />}>
          Continue with Google
        </Button>

        <Box textAlign="center" sx={{ zIndex: 1, position: 'relative', mt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>Don't have an account?</Typography>
          <Link href="/auth/register" passHref>
            <Button variant="text" color="primary" fullWidth sx={{ borderRadius: 3, fontWeight: 700, '&:hover': { background: '#e3f2fd', color: '#1565c0' } }}>Register</Button>
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}