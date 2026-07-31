import React from 'react';
import Link from 'next/link';
import { Linkedin, X, Instagram, Mail, Send } from 'lucide-react';
import { Box, Typography, Stack, Divider, IconButton, InputBase, Paper, useTheme } from '@mui/material';
import { getLoginHref, protectedLandingPaths } from '../utils/authRedirect';

const quickLinks = [
  { label: 'Cases', href: '/cases' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Webinars', href: '/webinars' },
  { label: 'Contact', href: '/contact' },
];

const resourcesLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'FAQs', href: '/faq' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/medinternia', icon: Linkedin },
  { label: 'X', href: 'https://x.com/medinternia', icon: X },
  { label: 'Instagram', href: 'https://instagram.com/medinternia', icon: Instagram },
  { label: 'Email', href: 'mailto:medinternia@gmail.com', icon: Mail },
];

function FooterLinkColumn({
  title,
  links,
  getHref,
}: {
  title: string;
  links: { label: string; href: string }[];
  getHref: (path: string) => string;
}) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2.5, color: '#fff', letterSpacing: '0.02em' }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {links.map((link) => (
          <Link key={link.href} href={getHref(link.href)} passHref legacyBehavior>
            <Typography
              component="a"
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                display: 'block',
                fontSize: '0.875rem',
                transition: 'color 0.2s',
                '&:hover': { color: '#fff', borderBottom: 'none' },
              }}
            >
              {link.label}
            </Typography>
          </Link>
        ))}
      </Stack>
    </Box>
  );
}

export default function Footer() {
  const theme = useTheme();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(Boolean(token));
  }, []);

  const getAuthAwareHref = (path: string) =>
    !isLoggedIn && protectedLandingPaths.includes(path) ? getLoginHref(path) : path;

  return (
    <Box
      component="footer"
      role="contentinfo"
      aria-label="Site footer"
      sx={{
        backgroundColor: theme.custom.footerBg,
        color: '#fff',
        pt: { xs: 6, md: 8 },
        pb: { xs: 3, md: 4 },
        px: { xs: 3, sm: 5, md: 10 },
        mt: 'auto',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 5, md: 6 }}
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box sx={{ maxWidth: 320 }}>
          <Typography
            variant="h5"
            fontWeight={800}
             sx={{
              color: '#60A5FA',
              mb: 1.5,
             }}
          >
            MedInternia
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, mb: 3 }}>
            Your gateway to medical learning, peer collaboration, career opportunities, and live webinars.
          </Typography>

          <Stack direction="row" spacing={1}>
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <IconButton
                key={label}
                aria-label={label}
                component="a"
                href={href}
                target={href.startsWith('mailto') ? undefined : '_blank'}
                rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  width: 36,
                  height: 36,
                }}
              >
                <Icon size={16} />
              </IconButton>
            ))}
          </Stack>
        </Box>

        <FooterLinkColumn title="Quick Links" links={quickLinks} getHref={getAuthAwareHref} />
        <FooterLinkColumn title="Resources" links={resourcesLinks} getHref={(p) => p} />

        <Box sx={{ maxWidth: 300, width: '100%' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2.5, color: '#fff' }}>
            Stay Connected
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mb: 2, fontSize: '0.875rem' }}>
            Subscribe to our newsletter for updates
          </Typography>
          <Paper
            component="form"
            elevation={0}
            sx={{
              p: '4px 4px 4px 12px',
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.06)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <InputBase
              sx={{
                flex: 1,
                color: '#fff',
                fontSize: '0.875rem',
                '& input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
              }}
              placeholder="Enter your email"
              inputProps={{ 'aria-label': 'Newsletter email address' }}
            />
            <IconButton
              type="button"
              aria-label="Subscribe to newsletter"
              sx={{
                p: 1,
                color: '#fff',
                background: theme.custom.heroGradient,
                borderRadius: 1.5,
                '&:hover': { opacity: 0.9 },
              }}
            >
              <Send size={16} />
            </IconButton>
          </Paper>
        </Box>
      </Stack>

      <Divider sx={{ mt: { xs: 5, md: 7 }, mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

      <Typography variant="caption" align="center" display="block" sx={{ color: 'rgba(255,255,255,0.45)' }}>
        © {new Date().getFullYear()} MedInternia. All rights reserved.
      </Typography>
    </Box>
  );
}
