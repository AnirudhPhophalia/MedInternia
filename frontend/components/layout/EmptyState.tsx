import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Paper
      elevation={0}
      role="status"
      aria-live="polite"
      sx={{
        py: { xs: 6, md: 8 },
        px: 3,
        textAlign: 'center',
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2.5,
          bgcolor: (theme) => theme.palette.primary.light,
          color: 'primary.main',
        }}
        aria-hidden
      >
        <Icon size={28} strokeWidth={1.75} />
      </Box>

      <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 420, mx: 'auto', mb: actionLabel ? 3 : 0, lineHeight: 1.7 }}
      >
        {description}
      </Typography>

      {actionLabel && onAction && (
        <Button variant="contained" color="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
}
