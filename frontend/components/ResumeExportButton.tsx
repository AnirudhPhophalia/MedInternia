import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../utils/api';

interface ResumeExportButtonProps {
  user: any;
  badges?: any[];
}

/**
 * ResumeExportButton – offloaded backend PDF export for User CV Resumes.
 *
 * Calls GET /api/users/:userId/export-resume to fetch server-rendered PDF buffer (rendered via Puppeteer worker).
 */
export default function ResumeExportButton({ user }: ResumeExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    const userId = user?._id || user?.id || 'me';
    setLoading(true);
    try {
      const response = await api.get(`/users/${userId}/export-resume`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const firstName = (user?.firstName || 'User').replace(/\s+/g, '_');
      const lastName = (user?.lastName || '').replace(/\s+/g, '_');
      const filename = `${firstName}_${lastName}_MedInternia_CV.pdf`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export CV PDF via backend worker:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      onClick={handleExport}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
      sx={{
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: 600,
        px: 3,
        bgcolor: '#0056cc',
        '&:hover': {
          bgcolor: '#0043a4',
        },
      }}
    >
      {loading ? 'Generating...' : 'Export to PDF (CV)'}
    </Button>
  );
}
