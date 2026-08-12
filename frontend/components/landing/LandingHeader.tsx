import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { getLoginHref, protectedLandingPaths } from '../../utils/authRedirect';

interface LandingHeaderProps {
  isLoggedIn: boolean;
}

export default function LandingHeader({ isLoggedIn }: LandingHeaderProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 20,
    restDelta: 0.001,
  });

  const navItems = isLoggedIn
    ? ['Cases', 'Jobs', 'Webinars', 'Leaderboard', 'About']
    : ['Jobs', 'Webinars', 'Leaderboard', 'About'];

  const getAuthAwareHref = (path: string) =>
    !isLoggedIn && protectedLandingPaths.includes(path) ? getLoginHref(path) : path;

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          px: { xs: 2, md: 6 },
          py: 2,
          display: isLoggedIn ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1100,
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => router.push('/')}
          role="button"
          tabIndex={0}
          aria-label="Go to MedInternia home"
          onKeyDown={(e) => e.key === 'Enter' && router.push('/')}
        >
          <Image src="/med-internia-logo.jpg" alt="MedInternia Logo" width={36} height={36} style={{ borderRadius: '50%' }} />
          <Typography variant="h6" fontWeight={800} color="#1a202c" ml={1}>
            MedInternia
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4 }}>
          {navItems.map((item) => (
            <Link key={item} href={getAuthAwareHref(`/${item.toLowerCase()}`)} passHref legacyBehavior>
              <Typography
                component="a"
                fontWeight={600}
                color="#4a5568"
                sx={{
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                  '&:hover': { color: '#0072ff', borderBottom: 'none !important' },
                }}
              >
                {item}
              </Typography>
            </Link>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <IconButton
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#1a202c' }}
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Button
            variant="text"
            sx={{
              color: '#0072ff',
              fontWeight: 700,
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': { bgcolor: 'rgba(0,114,255,0.08)' },
            }}
            onClick={() => router.push('/auth/login')}
          >
            Log in
          </Button>
          <Button
            variant="contained"
            sx={{
              bgcolor: '#0072ff',
              color: '#fff',
              borderRadius: '24px',
              px: { xs: 2, sm: 3 },
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0,114,255,0.2)',
              '&:hover': { bgcolor: '#005bb5', transform: 'translateY(-1px)' },
              transition: 'all 0.2s',
            }}
            onClick={() => router.push('/auth/register')}
          >
            Sign Up
          </Button>
        </Box>
        <motion.div
          style={{
            scaleX,
            transformOrigin: "left",
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: "3px",
            background: "linear-gradient(90deg,#2563EB,#06B6D4,#3B82F6)",
            boxShadow: "0 0 12px rgba(37,99,235,.45), 0 0 24px rgba(6,182,212,.25)",
            zIndex: 1200,
          }}
        />
      </Box>

      {/* Layout Spacer Box - only active if not logged in to clear fixed header bounds */}
      {!isLoggedIn && <Box sx={{ height: 72 }} />}

      {/* Mobile nav drawer */}
      <Drawer
        anchor="right"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <Typography fontWeight={700} color="#1a202c">
            Menu
          </Typography>
          <IconButton aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {navItems.map((item) => (
            <ListItem key={item} disablePadding>
              <ListItemButton
                component={Link}
                href={getAuthAwareHref(`/${item.toLowerCase()}`)}
                onClick={() => setMobileNavOpen(false)}
              >
                <ListItemText primary={item} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding>
            <ListItemButton component={Link} href="/auth/login" onClick={() => setMobileNavOpen(false)}>
              <ListItemText primary="Log in" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
