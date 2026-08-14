import React, { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../utils/api';

interface PdfExportButtonProps {
  caseData: any;
  discussions?: any[];
}

/**
 * PdfExportButton – offloaded backend PDF export for Medical Case Studies.
 *
 * Calls GET /api/cases/:id/export to fetch a server-side generated PDF buffer (rendered via Puppeteer worker),
 * freeing up the client's browser thread and enabling consistent high-fidelity PDF rendering.
 */
export default function PdfExportButton({ caseData }: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleExport = async () => {
    const caseId = caseData?._id || caseData?.id;
    if (!caseId) {
      setSnack({ open: true, message: 'Invalid case study ID', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/cases/${caseId}/export`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const safeTitle = (caseData?.title || 'case-study')
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
        .slice(0, 50);

      link.setAttribute('download', `medinternia-${safeTitle}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSnack({ open: true, message: 'PDF downloaded successfully!', severity: 'success' });
    } catch (err) {
      console.error('Backend PDF export error:', err);
      setSnack({ open: true, message: 'Failed to generate PDF. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Download this case study as a PDF (generated on server)">
        <span>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={handleExport}
            disabled={loading}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.1,
              fontWeight: 700,
              fontSize: '1rem',
              background: 'linear-gradient(90deg, #e53935 0%, #ef9a9a 100%)',
              color: '#fff',
              boxShadow: '0 2px 8px #e5393544',
              letterSpacing: 0.5,
              transition: 'all 0.2s',
              '&:hover': {
                background: 'linear-gradient(90deg, #b71c1c 0%, #e53935 100%)',
                boxShadow: '0 4px 16px #e5393566',
                transform: 'scale(1.03)',
              },
              '&:disabled': {
                background: '#bdbdbd',
                color: '#fff',
              },
            }}
          >
            {loading ? 'Generating PDF…' : 'Download as PDF'}
          </Button>
        </span>
      </Tooltip>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
