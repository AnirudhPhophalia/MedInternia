import { useState } from 'react';
import { Typography, TextField, Button, Box, Alert, Paper, Divider, IconButton, InputAdornment, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';
import api from '../../utils/api';
import { useRouter } from 'next/router';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { getSafeRedirectPath } from '../../utils/authRedirect';
import AuthLayout, { AuthCard } from '../../components/auth/AuthLayout';
import { useAuth, setGlobalToken } from '../../context/AuthContext';

const persistAuthSession = (token: string, userId: string, user: any) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem('token', token);
  localStorage.setItem('userId', userId);
  localStorage.setItem('user', JSON.stringify(user));

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  document.cookie = `auth_status=authenticated; Path=/; SameSite=Lax${secure}`;
};

export default function Login() {
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // GSSoC: Loading state for submit button
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // GSSoC: Show loading spinner while login request is in-flight
    setLoading(true);
    try {
  const res = await api.post('/auth/login', { email, password });
  const token = res.data?.data?.token;
  const user = res.data?.data?.user;
  const userId = user?._id || user?.id || '';
  persistAuthSession(token, userId, user);
  setGlobalToken(token);
  authLogin(token, userId, user);
  router.push(getSafeRedirectPath(router.query.redirect));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 0 } }}>
      {/* GSSoC: card-enter adds fade-in-up; mobile width fixed with width/minWidth */}
      <Paper elevation={8} className="card-enter" sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: 4,
        width: { xs: '100%', sm: 400 },
        minWidth: { xs: 0, sm: 350 },
        maxWidth: 420,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 8px 32px 0 rgba(33,147,176,0.10)',
        position: 'relative',
        overflow: 'hidden',
      }}>
      <IconButton
    aria-label="close"
    onClick={() => router.back()}
    sx={{
      position: 'absolute',
      right: 12,
      top: 12,
      color: '#1565c0',
      zIndex: 2, 
      '&:hover': {
        backgroundColor: 'rgba(21, 101, 192, 0.08)',
      }
    }}
  >
    <CloseIcon />
  </IconButton>
      {/* Back to Home - accessible, keyboard focusable */}
      <Button
        component={Link}
        href="/"
        aria-label="Back to Home"
        sx={{
          position: 'absolute',
          left: 12,
          top: 12,
          color: '#1565c0',
          textTransform: 'none',
          fontWeight: 700,
          zIndex: 2,
          borderRadius: 2,
          px: 1,
          '&:hover': { backgroundColor: 'rgba(21, 101, 192, 0.06)' },
          '&:focus': { boxShadow: '0 0 0 4px rgba(33,147,176,0.12)' }
        }}
        variant="text"
      >
        ← Back to Home
      </Button>
       <Box
  sx={{
    display: 'flex',
    justifyContent: 'center',
    mb: 3,
  }}
>
  <Box
    sx={{
      width: 90,
      height: 90,

      borderRadius: '50%',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      backgroundColor: '#fff',
      p: 1,
    }}
  >
    <img
      src="/med-internia-logo.jpg"
      alt="MedInternia Logo"
      style={{ width: '100%', height: '100%' }}
    />
  </Box>
</Box>
  {/* Removed decorative circle at top right */}
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 900, color: '#1565c0', letterSpacing: 1, zIndex: 1, position: 'relative' }}>Login</Typography>
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access medical cases, peer discussions, job opportunities, and your personalized learning dashboard."
    >
      <AuthCard>
        <IconButton
          aria-label="close"
          onClick={() => router.back()}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: 'text.secondary',
            zIndex: 2,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
          Login
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Enter your credentials to continue
        </Typography>
        {error && <Alert severity="error" sx={{ zIndex: 1, position: 'relative' }}>{error}</Alert>}
        <form onSubmit={handleSubmit} style={{ zIndex: 1, position: 'relative' }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            sx={{
              '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
              '& .MuiInputBase-input': {
                animation: showPassword
                  ? 'revealPassword 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                  : 'hidePassword 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                '@keyframes revealPassword': {
                  '0%': {
                    filter: 'blur(5px)',
                    letterSpacing: '0.12em',
                    opacity: 0,
                    clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
                  },
                  '40%': {
                    opacity: 0.6,
                  },
                  '100%': {
                    filter: 'blur(0)',
                    letterSpacing: 'normal',
                    opacity: 1,
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  }
                },
                '@keyframes hidePassword': {
                  '0%': {
                    filter: 'blur(5px)',
                    letterSpacing: '0.12em',
                    opacity: 0,
                    clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
                  },
                  '40%': {
                    opacity: 0.6,
                  },
                  '100%': {
                    filter: 'blur(0)',
                    letterSpacing: 'normal',
                    opacity: 1,
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  }
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                    sx={{
                      color: 'text.secondary',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'scale(1.12)',
                        color: 'primary.main',
                      },
                      '&:active': {
                        transform: 'scale(0.93)',
                      },
                      mr: 0.5,
                    }}
                  >
                    {showPassword ? (
                      <VisibilityOff
                        sx={{
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          animation: 'premiumRotateOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                          '@keyframes premiumRotateOut': {
                            '0%': { opacity: 0, transform: 'rotate(-25deg) scale(0.8)' },
                            '100%': { opacity: 1, transform: 'rotate(0deg) scale(1)' }
                          }
                        }}
                      />
                    ) : (
                      <Visibility
                        sx={{
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          animation: 'premiumRotateIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                          '@keyframes premiumRotateIn': {
                            '0%': { opacity: 0, transform: 'rotate(25deg) scale(0.8)' },
                            '100%': { opacity: 1, transform: 'rotate(0deg) scale(1)' }
                          }
                        }}
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Box
  sx={{
    display: "flex",
    justifyContent: "flex-end",
    mt: 1,
    mb: 2,
  }}
>
  <Link
    href="/auth/forgot-password"
    style={{
      textDecoration: "none",
      color: "#1565c0",
      fontWeight: 600,
    }}
  >
    Forgot Password?
  </Link>
</Box>
          {/* GSSoC: Disabled + spinner when loading */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            aria-label="Login"
            sx={{
              mt: 2,
              py: 1.3,
              fontWeight: 800,
              fontSize: '1.1rem',
              borderRadius: 3,
              letterSpacing: 0.5,
              textTransform: 'none',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
              '&:active': {
                color: '#ffffff',
              },
              '&:focus': {
                color: '#ffffff',
              }
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Login'}
          </Button>
        </form>
        <Divider sx={{ my: 3, zIndex: 1, position: 'relative' }}>or</Divider>
        <Box textAlign="center" sx={{ zIndex: 1, position: 'relative' }}>
          <Typography variant="body2" sx={{ mb: 1 }}>Don't have an account?</Typography>
          <Button
            component={Link}
            href="/auth/register"
            variant="text"
            color="primary"
            fullWidth
            sx={{
              borderRadius: 3,
              fontWeight: 700,
              py: 1.3,
              textDecoration: 'none !important',
              '&:hover': {
                bgcolor: 'rgba(0, 114, 255, 0.06)',
                textDecoration: 'none !important',
              },
            }}
          >
            Create an account
          </Button>
        </Box>
      </AuthCard>
    </AuthLayout>
  );
}
