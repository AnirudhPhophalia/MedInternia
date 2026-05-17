import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function AuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Jab tak router poori tarah load na ho jaye, wait karo
    if (!router.isReady) return;

    // URL se token nikalna
    const { token } = router.query;

    if (token && typeof token === 'string') {
      try {
        // 1. Token ko localStorage mein save karo
        localStorage.setItem('token', token);

        // 2. Token ko decode karke user ki details nikalo
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('role', payload.role || 'patient');
        localStorage.setItem('userId', payload.id || '');

        // 3. Sab save hone ke baad seedha Dashboard par bhej do!
       window.location.href = '/dashboard';
      } catch (error) {
        console.error("Authentication Error:", error);
        router.push('/auth/login');
      }
    } else {
      // Agar URL mein token nahi mila toh wapas login par bhej do
      router.push('/auth/login');
    }
  }, [router.isReady, router.query, router]);

  return (
    <Box sx={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', 
      justifyContent: 'center', alignItems: 'center', 
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)' 
    }}>
      <CircularProgress size={60} thickness={4} sx={{ color: '#2193b0', mb: 3 }} />
      <Typography variant="h5" sx={{ color: '#1565c0', fontWeight: 600 }}>
        Authenticating...
      </Typography>
      <Typography variant="body1" sx={{ color: '#555', mt: 1 }}>
        Securely logging you in with Google.
      </Typography>
    </Box>
  );
}