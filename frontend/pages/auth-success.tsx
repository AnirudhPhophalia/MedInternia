import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import api from '../../utils/api';

export default function AuthSuccess() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    const verifySession = async () => {
      try {
        // We no longer rely on URL tokens (security risk).
        // Since the backend set an HttpOnly cookie, we make a quick /profile check
        // to verify the session and extract the required role/userId for the frontend state.
        
        const res = await api.get('/auth/profile', {
          // Tell axios to explicitly send cross-origin cookies if domains differ
          withCredentials: true 
        });

        if (res.data?.success && res.data?.data) {
          const user = res.data.data;
          
          // Populate the required frontend state
          localStorage.setItem('role', user.userType || 'patient');
          localStorage.setItem('userId', user._id || user.id || '');
          
          // Redirect to dashboard securely
          window.location.href = '/dashboard';
        } else {
          throw new Error("Invalid session profile");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        setError("Secure authentication failed. Redirecting to login...");
        setTimeout(() => {
          router.push('/auth/login');
        }, 2500);
      }
    };

    verifySession();

  }, [router.isReady, router]);

  return (
    <Box sx={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', 
      justifyContent: 'center', alignItems: 'center', 
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' 
    }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <>
          <CircularProgress size={60} thickness={4} sx={{ color: '#2193b0', mb: 3 }} />
          <Typography variant="h5" sx={{ color: '#1565c0', fontWeight: 600 }}>
            Authenticating...
          </Typography>
          <Typography variant="body1" sx={{ color: '#555', mt: 1 }}>
            Securely logging you in. Please wait.
          </Typography>
        </>
      )}
    </Box>
  );
}