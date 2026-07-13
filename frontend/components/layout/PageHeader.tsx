import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink, Stack } from '@mui/material';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  centered?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  centered = false,
}: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        mb: { xs: 3, md: 4 },
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          aria-label="breadcrumb"
          separator={<ChevronRight size={14} color="#94a3b8" />}
          sx={{ mb: 1.5, justifyContent: centered ? 'center' : 'flex-start' }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            if (isLast || !crumb.href) {
              return (
                <Typography
                  key={crumb.label}
                  variant="body2"
                  color="text.secondary"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </Typography>
              );
            }
            return (
              <MuiLink
                key={crumb.label}
                component={Link}
                href={crumb.href}
                underline="hover"
                color="primary"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                {crumb.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={centered ? 'center' : { xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
              background: (theme) => theme.custom.heroGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: 0,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: centered ? 560 : 'none', mx: centered ? 'auto' : 0 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
