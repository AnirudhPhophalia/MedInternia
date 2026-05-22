import { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Alert, Paper, Divider } from '@mui/material';
import Link from 'next/link';
import api from '../../utils/api';
import { useRouter } from 'next/router';
import { signIn } from "next-auth/react"; // Google Auth Import

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
      const role = user?.role || '';
      const userId = user?._id || user?.id || '';
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', userId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={8} sx={{
        p: 4,
        borderRadius: 4,
        minWidth: 350,
        maxWidth: 400,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 8px 32px 0 rgba(33,147,176,0.10)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 900, color: '#1565c0', letterSpacing: 1, zIndex: 1, position: 'relative' }}>Login</Typography>
        {error && <Alert severity="error" sx={{ zIndex: 1, position: 'relative', mb: 2 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit} style={{ zIndex: 1, position: 'relative' }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            sx={{ bgcolor: '#f8fafd', borderRadius: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            sx={{ bgcolor: '#f8fafd', borderRadius: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{
              mt: 2,
              py: 1.3,
              fontWeight: 700,
              fontSize: '1.1rem',
              borderRadius: 3,
              boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.10)',
              background: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)',
              transition: 'all 0.2s',
              '&:hover': {
                background: 'linear-gradient(90deg, #1565c0 0%, #2193b0 100%)',
                transform: 'scale(1.03)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)'
              }
            }}
          >
            Login
          </Button>
        </form>

        <Divider sx={{ my: 3, zIndex: 1, position: 'relative' }}>or</Divider>

        {/* --- Google Authentication Button --- */}
        <Button
          fullWidth
          variant="outlined"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          sx={{
            mb: 3,
            py: 1.2,
            borderRadius: 3,
            fontWeight: 700,
            color: '#424242',
            borderColor: '#e0e0e0',
            textTransform: 'none',
            fontSize: '1.05rem',
            zIndex: 1,
            position: 'relative',
            '&:hover': {
              borderColor: '#bdbdbd',
              background: '#f5f5f5',
            }
          }}
          startIcon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 24, height: 24 }} />}
        >
          Continue with Google
        </Button>

        <Box textAlign="center" sx={{ zIndex: 1, position: 'relative' }}>
          <Typography variant="body2" sx={{ mb: 1 }}>Don't have an account?</Typography>
          <Link href="/auth/register" passHref>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              sx={{
                borderRadius: 3,
                fontWeight: 700,
                boxShadow: 'none',
                border: 'none',
                '&:hover': {
                  boxShadow: 'none',
                  textDecoration: 'none',
                  border: 'none',
                  background: '#e3f2fd',
                  color: '#1565c0',
                },
              }}
            >
              Register
            </Button>
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}